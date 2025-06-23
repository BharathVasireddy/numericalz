import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Type for Companies House accounting reference date format
interface CompaniesHouseDate {
  day: string
  month: string
}

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all Ltd company clients with their workflow data
    const clients = await db.client.findMany({
      where: {
        companyType: 'LIMITED_COMPANY',
        isActive: true,
      },
      include: {
        ltdCompanyAssignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        ltdAccountsWorkflows: {
          orderBy: {
            filingPeriodEnd: 'desc'
          },
          take: 1, // Get the most recent workflow
          include: {
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            }
          }
        }
      },
      orderBy: [
        { nextAccountsDue: 'asc' },
        { companyName: 'asc' }
      ]
    })

    // Transform the data to include current workflow
    const transformedClients = clients.map(client => ({
      id: client.id,
      clientCode: client.clientCode,
      companyNumber: client.companyNumber,
      companyName: client.companyName,
      companyType: client.companyType,
      incorporationDate: client.incorporationDate?.toISOString(),
      accountingReferenceDate: client.accountingReferenceDate ? 
        (() => {
          try {
            // Handle Companies House format: {"day":"30","month":"09"}
            const parsedDate = typeof client.accountingReferenceDate === 'string' 
              ? JSON.parse(client.accountingReferenceDate) 
              : client.accountingReferenceDate
            
            if (typeof parsedDate === 'object' && parsedDate && 'day' in parsedDate && 'month' in parsedDate) {
              const companiesHouseDate = parsedDate as CompaniesHouseDate
              
              // Calculate the correct year based on company status (first-time filer vs established)
              let yearToUse = new Date().getFullYear() // Default fallback
              
              if (client.lastAccountsMadeUpTo) {
                // Established company: Use last accounts made up to date + 1 year
                const lastAccountsDate = new Date(client.lastAccountsMadeUpTo)
                yearToUse = lastAccountsDate.getFullYear() + 1
              } else if (client.incorporationDate) {
                // First-time filer: Calculate first year end after incorporation
                const incorpDate = new Date(client.incorporationDate)
                const incorpYear = incorpDate.getFullYear()
                
                // Calculate first accounting reference date after incorporation
                let firstYearEnd = new Date(incorpYear, parseInt(companiesHouseDate.month) - 1, parseInt(companiesHouseDate.day))
                
                // UK Rule: First accounting period must be at least 6 months but can be up to 18 months
                // If the ARD in incorporation year is too close (less than 6 months), use next year
                const monthsDifference = (firstYearEnd.getTime() - incorpDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
                
                if (firstYearEnd <= incorpDate || monthsDifference < 6) {
                  firstYearEnd.setFullYear(incorpYear + 1)
                }
                
                yearToUse = firstYearEnd.getFullYear()
              } else if (client.nextAccountsDue) {
                // Fallback: use next accounts due date year - 1 (since accounts are due 9 months after year end)
                const nextDueDate = new Date(client.nextAccountsDue)
                yearToUse = nextDueDate.getFullYear() - 1
              }
              
              const month = parseInt(companiesHouseDate.month) - 1 // JS months are 0-indexed
              const day = parseInt(companiesHouseDate.day)
              const date = new Date(yearToUse, month, day)
              return isNaN(date.getTime()) ? null : date.toISOString()
            }
            // Handle string formats
            if (typeof client.accountingReferenceDate === 'string') {
              if (client.accountingReferenceDate.includes('T')) {
                return client.accountingReferenceDate
              }
              const date = new Date(client.accountingReferenceDate)
              return isNaN(date.getTime()) ? null : date.toISOString()
            }
            return null
          } catch (error) {
            console.warn(`Invalid accountingReferenceDate for client ${client.id}:`, client.accountingReferenceDate)
            return null
          }
        })() : null,
      nextAccountsDue: client.nextAccountsDue?.toISOString(),
      lastAccountsMadeUpTo: client.lastAccountsMadeUpTo?.toISOString(),
      nextCorporationTaxDue: client.nextCorporationTaxDue?.toISOString(),
      nextConfirmationDue: client.nextConfirmationDue?.toISOString(),
      ltdCompanyAssignedUser: client.ltdCompanyAssignedUser,
      currentLtdAccountsWorkflow: client.ltdAccountsWorkflows[0] ? {
        id: client.ltdAccountsWorkflows[0].id,
        filingPeriodStart: client.ltdAccountsWorkflows[0].filingPeriodStart.toISOString(),
        filingPeriodEnd: client.ltdAccountsWorkflows[0].filingPeriodEnd.toISOString(),
        accountsDueDate: client.ltdAccountsWorkflows[0].accountsDueDate.toISOString(),
        ctDueDate: client.ltdAccountsWorkflows[0].ctDueDate.toISOString(),
        csDueDate: client.ltdAccountsWorkflows[0].csDueDate.toISOString(),
        currentStage: client.ltdAccountsWorkflows[0].currentStage,
        isCompleted: client.ltdAccountsWorkflows[0].isCompleted,
        assignedUser: client.ltdAccountsWorkflows[0].assignedUser,
        // Milestone dates
        chaseStartedDate: client.ltdAccountsWorkflows[0].chaseStartedDate?.toISOString(),
        chaseStartedByUserName: client.ltdAccountsWorkflows[0].chaseStartedByUserName,
        paperworkReceivedDate: client.ltdAccountsWorkflows[0].paperworkReceivedDate?.toISOString(),
        paperworkReceivedByUserName: client.ltdAccountsWorkflows[0].paperworkReceivedByUserName,
        workStartedDate: client.ltdAccountsWorkflows[0].workStartedDate?.toISOString(),
        workStartedByUserName: client.ltdAccountsWorkflows[0].workStartedByUserName,
        managerDiscussionDate: client.ltdAccountsWorkflows[0].managerDiscussionDate?.toISOString(),
        managerDiscussionByUserName: client.ltdAccountsWorkflows[0].managerDiscussionByUserName,
        partnerReviewDate: client.ltdAccountsWorkflows[0].partnerReviewDate?.toISOString(),
        partnerReviewByUserName: client.ltdAccountsWorkflows[0].partnerReviewByUserName,
        reviewCompletedDate: client.ltdAccountsWorkflows[0].reviewCompletedDate?.toISOString(),
        reviewCompletedByUserName: client.ltdAccountsWorkflows[0].reviewCompletedByUserName,
        sentToClientDate: client.ltdAccountsWorkflows[0].sentToClientDate?.toISOString(),
        sentToClientByUserName: client.ltdAccountsWorkflows[0].sentToClientByUserName,
        clientApprovedDate: client.ltdAccountsWorkflows[0].clientApprovedDate?.toISOString(),
        clientApprovedByUserName: client.ltdAccountsWorkflows[0].clientApprovedByUserName,
        partnerApprovedDate: client.ltdAccountsWorkflows[0].partnerApprovedDate?.toISOString(),
        partnerApprovedByUserName: client.ltdAccountsWorkflows[0].partnerApprovedByUserName,
        filedDate: client.ltdAccountsWorkflows[0].filedDate?.toISOString(),
        filedByUserName: client.ltdAccountsWorkflows[0].filedByUserName,
      } : null
    }))

    return NextResponse.json({ 
      success: true, 
      clients: transformedClients 
    })

  } catch (error) {
    console.error('Error fetching Ltd companies deadlines:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Ltd companies deadlines' },
      { status: 500 }
    )
  }
} 