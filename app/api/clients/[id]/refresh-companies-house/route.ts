import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getComprehensiveCompanyData } from '@/lib/companies-house'

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
    // TEMPORARY: Comment out auth check for testing
    // const session = await getServerSession(authOptions)
    // 
    // if (!session) {
    //   return NextResponse.json(
    //     { success: false, error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }

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

    // Update client with all Companies House data
    const updatedClient = await db.client.update({
      where: { id },
      data: {
        companyName: companyData.company_name || client.companyName,
        companyStatus: companyData.company_status || client.companyStatus,
        companyStatusDetail: companyData.company_status_detail || client.companyStatusDetail,
        incorporationDate: companyData.date_of_creation ? new Date(companyData.date_of_creation) : client.incorporationDate,
        cessationDate: companyData.date_of_cessation ? new Date(companyData.date_of_cessation) : client.cessationDate,
        registeredOfficeAddress: companyData.registered_office_address ? JSON.stringify(companyData.registered_office_address) : client.registeredOfficeAddress,
        sicCodes: companyData.sic_codes ? JSON.stringify(companyData.sic_codes) : client.sicCodes,
        nextAccountsDue: companyData.accounts?.next_due ? new Date(companyData.accounts.next_due) : client.nextAccountsDue,
        lastAccountsMadeUpTo: companyData.accounts?.last_accounts?.made_up_to ? new Date(companyData.accounts.last_accounts.made_up_to) : client.lastAccountsMadeUpTo,
        accountingReferenceDate: companyData.accounts?.accounting_reference_date ? JSON.stringify(companyData.accounts.accounting_reference_date) : client.accountingReferenceDate,
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

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: 'Client updated with latest Companies House data'
    })

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