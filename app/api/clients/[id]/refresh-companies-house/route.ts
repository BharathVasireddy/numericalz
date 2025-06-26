import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getComprehensiveCompanyData } from '@/lib/companies-house'
import { logActivityEnhanced } from '@/lib/activity-middleware'
import { calculateCorporationTaxDue } from '@/lib/year-end-utils'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'
export const revalidate = 0 // Always fetch fresh data

/**
 * POST /api/clients/[id]/refresh-companies-house
 * 
 * Refresh client data with latest Companies House information
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Get the client
    const client = await db.client.findUnique({
      where: { id }
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    if (!client.companyNumber) {
      return NextResponse.json(
        { success: false, error: 'Client has no company number' },
        { status: 400 }
      )
    }

    // Fetch latest data from Companies House
    const { company: companyData, officers, psc } = await getComprehensiveCompanyData(client.companyNumber)

    if (!companyData) {
      return NextResponse.json(
        { success: false, error: 'Unable to fetch company data from Companies House' },
        { status: 404 }
      )
    }

    // Prepare client data for centralized date calculations
    const updatedLastAccountsMadeUpTo = companyData.accounts?.last_accounts?.made_up_to 
      ? new Date(companyData.accounts.last_accounts.made_up_to) 
      : client.lastAccountsMadeUpTo



    const updatedIncorporationDate = companyData.date_of_creation 
      ? new Date(companyData.date_of_creation) 
      : client.incorporationDate

    // Calculate CT due date only - use Companies House data for accounts due date
    const clientDataForCalculation = {
      lastAccountsMadeUpTo: updatedLastAccountsMadeUpTo,
      incorporationDate: updatedIncorporationDate
    }

    const calculatedCTDue = calculateCorporationTaxDue(clientDataForCalculation)

    // Update client with Companies House data and use their official accounts due date
    const updatedClient = await db.client.update({
      where: { id },
      data: {
        companyName: companyData.company_name || client.companyName,
        companyStatus: companyData.company_status || client.companyStatus,
        companyStatusDetail: companyData.company_status_detail || client.companyStatusDetail,
        incorporationDate: updatedIncorporationDate,
        cessationDate: companyData.date_of_cessation ? new Date(companyData.date_of_cessation) : client.cessationDate,
        registeredOfficeAddress: companyData.registered_office_address ? JSON.stringify(companyData.registered_office_address) : client.registeredOfficeAddress,
        sicCodes: companyData.sic_codes ? JSON.stringify(companyData.sic_codes) : client.sicCodes,
        // 🎯 CRITICAL: Use Companies House accounts due date directly (official HMRC deadline)
        nextAccountsDue: companyData.accounts?.next_due ? new Date(companyData.accounts.next_due) : client.nextAccountsDue,
        // 🎯 NEW: Store Companies House official year end date
        nextYearEnd: companyData.accounts?.next_made_up_to ? new Date(companyData.accounts.next_made_up_to) : client.nextYearEnd,
        // Only calculate CT due date (12 months after year end)
        nextCorporationTaxDue: calculatedCTDue,
        // Keep Companies House reference data for calculations
        lastAccountsMadeUpTo: updatedLastAccountsMadeUpTo,
        // Confirmation statements come from Companies House (we don't calculate these)
        nextConfirmationDue: companyData.confirmation_statement?.next_due ? new Date(companyData.confirmation_statement.next_due) : client.nextConfirmationDue,
        lastConfirmationMadeUpTo: companyData.confirmation_statement?.last_made_up_to ? new Date(companyData.confirmation_statement.last_made_up_to) : client.lastConfirmationMadeUpTo,
        jurisdiction: companyData.jurisdiction || client.jurisdiction,
        hasBeenLiquidated: companyData.has_been_liquidated ?? client.hasBeenLiquidated,
        hasCharges: companyData.has_charges ?? client.hasCharges,
        hasInsolvencyHistory: companyData.has_insolvency_history ?? client.hasInsolvencyHistory,
        // Officers and PSC data
        officers: officers ? JSON.stringify(officers) : client.officers,
        personsWithSignificantControl: psc ? JSON.stringify(psc) : client.personsWithSignificantControl,
      }
    })

    // Log Companies House refresh activity
    await logActivityEnhanced(request, {
      action: 'CLIENT_COMPANIES_HOUSE_REFRESH',
      clientId: id,
      details: {
        companyName: updatedClient.companyName,
        clientCode: updatedClient.clientCode,
        companyNumber: updatedClient.companyNumber,
        companyStatus: updatedClient.companyStatus,
        refreshedFields: [
          'companyStatus', 'nextAccountsDue', 'nextCorporationTaxDue', 
          'nextConfirmationDue', 'incorporationDate', 'accountingReferenceDate'
        ]
      }
    })

    const response = NextResponse.json({
      success: true,
      data: updatedClient,
      message: 'Client updated with latest Companies House data'
    })

    // Ensure no caching for real-time data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error('Refresh Companies House data error:', error)
    
    if (error instanceof Error) {
      // Handle specific error cases
      if (error.message === 'Company not found') {
        return NextResponse.json(
          { success: false, error: 'Company not found in Companies House' },
          { status: 404 }
        )
      }
      
      if (error.message === 'Invalid API key') {
        return NextResponse.json(
          { success: false, error: 'Companies House API configuration error' },
          { status: 500 }
        )
      }
      
      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to refresh Companies House data' },
      { status: 500 }
    )
  }
} 