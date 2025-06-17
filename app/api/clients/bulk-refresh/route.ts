import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { getCompanyDetails, getComprehensiveCompanyData } from '@/lib/companies-house'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers can perform bulk operations
    if (session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { clientIds } = await request.json()

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: 'Client IDs are required' }, { status: 400 })
    }

    // Get clients with company numbers
    const clients = await db.client.findMany({
      where: {
        id: { in: clientIds },
        isActive: true,
        companyNumber: { not: null }
      },
      select: {
        id: true,
        companyNumber: true,
        companyName: true
      }
    })

    if (clients.length === 0) {
      return NextResponse.json({ error: 'No clients found with valid company numbers' }, { status: 400 })
    }

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process each client
    for (const client of clients) {
      try {
        if (!client.companyNumber) continue

        const companyData = await getCompanyDetails(client.companyNumber)
        
        if (companyData) {
          await db.client.update({
            where: { id: client.id },
            data: {
              companyName: companyData.company_name || client.companyName,
              companyType: companyData.type || undefined,
              companyStatus: companyData.company_status || undefined,
              companyStatusDetail: companyData.company_status_detail || undefined,
              incorporationDate: companyData.date_of_creation || undefined,
              cessationDate: companyData.date_of_cessation || undefined,
              registeredOfficeAddress: companyData.registered_office_address ? JSON.stringify(companyData.registered_office_address) : undefined,
              sicCodes: companyData.sic_codes ? JSON.stringify(companyData.sic_codes) : undefined,
              jurisdiction: companyData.jurisdiction || undefined,
              hasBeenLiquidated: companyData.has_been_liquidated || false,
              hasCharges: companyData.has_charges || false,
              hasInsolvencyHistory: companyData.has_insolvency_history || false,
              // Update accounting dates if available
              nextAccountsDue: companyData.accounts?.next_due || undefined,
              lastAccountsMadeUpTo: companyData.accounts?.last_accounts?.made_up_to || undefined,
              accountingReferenceDate: companyData.accounts?.accounting_reference_date?.day && companyData.accounts?.accounting_reference_date?.month 
                ? `${companyData.accounts.accounting_reference_date.day.toString().padStart(2, '0')}-${companyData.accounts.accounting_reference_date.month.toString().padStart(2, '0')}`
                : undefined,
              nextConfirmationDue: companyData.confirmation_statement?.next_due || undefined,
              lastConfirmationMadeUpTo: companyData.confirmation_statement?.last_made_up_to || undefined,
            }
          })
          successCount++
        } else {
          errorCount++
          errors.push(`Failed to fetch data for ${client.companyName}`)
        }
      } catch (error) {
        console.error(`Error refreshing client ${client.id}:`, error)
        errorCount++
        errors.push(`Error refreshing ${client.companyName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk refresh completed: ${successCount} successful, ${errorCount} failed`,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Error in bulk refresh:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 