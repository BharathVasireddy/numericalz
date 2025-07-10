import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract query parameters for pagination and filtering
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50') // Reduced default limit
    const skip = (page - 1) * limit
    
    // Get assigned filter (to optimize queries for staff users)
    const assignedFilter = searchParams.get('assignedFilter') // 'assigned_to_me', 'all', etc.

    // PERFORMANCE OPTIMIZATION: Role-based filtering to reduce data set
    const whereClause: any = {
      companyType: 'LIMITED_COMPANY',
      isActive: true,
    }

    // FIX: Apply assigned filter for ALL user roles when "assigned_to_me" is selected
    if (assignedFilter === 'assigned_to_me') {
      whereClause.OR = [
        { ltdCompanyAssignedUserId: session.user.id }, // Ltd-specific assignment
        { assignedUserId: session.user.id }, // General assignment
        { 
          ltdAccountsWorkflows: {
            some: {
              assignedUserId: session.user.id, // Workflow-level assignment
              isCompleted: false // Only active workflows
            }
          }
        }
      ]
    }

    // PERFORMANCE: Get total count first (efficient count query)
    const totalCount = await db.client.count({
      where: whereClause
    })

    // PERFORMANCE OPTIMIZATION: More efficient query with minimal includes
    const clients = await db.client.findMany({
      where: whereClause,
      select: {
        // Client basic info
        id: true,
        clientCode: true,
        companyNumber: true,
        companyName: true,
        companyType: true,
        contactName: true,
        contactEmail: true,
        
        // Companies House dates only
        incorporationDate: true,
        nextYearEnd: true,
        nextAccountsDue: true,
        lastAccountsMadeUpTo: true,
        nextCorporationTaxDue: true,
        nextConfirmationDue: true,
        
        // Assignment info only
        ltdCompanyAssignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        
        // OPTIMIZED: Only get the most recent active workflow with minimal fields
        ltdAccountsWorkflows: {
          where: {
            OR: [
              { isCompleted: false }, // Active workflows first
              { 
                isCompleted: true,
                filedDate: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Recently completed (last 30 days)
                }
              }
            ]
          },
          orderBy: [
            { isCompleted: 'asc' }, // Active workflows first
            { filingPeriodEnd: 'desc' } // Then most recent
          ],
          take: 1, // Only the most relevant workflow
          select: {
            id: true,
            filingPeriodStart: true,
            filingPeriodEnd: true,
            accountsDueDate: true,
            ctDueDate: true,
            csDueDate: true,
            currentStage: true,
            isCompleted: true,
            filedDate: true,
            
            // Assignment info only
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            },
            
            // OPTIMIZED: Only include milestone dates (not all the verbose fields)
            chaseStartedDate: true,
            chaseStartedByUserName: true,
            paperworkReceivedDate: true,
            paperworkReceivedByUserName: true,
            workStartedDate: true,
            workStartedByUserName: true,
            managerDiscussionDate: true,
            managerDiscussionByUserName: true,
            partnerReviewDate: true,
            partnerReviewByUserName: true,
            reviewCompletedDate: true,
            reviewCompletedByUserName: true,
            sentToClientDate: true,
            sentToClientByUserName: true,
            clientApprovedDate: true,
            clientApprovedByUserName: true,
            partnerApprovedDate: true,
            partnerApprovedByUserName: true,
            filedByUserName: true,
          }
        }
      },
      orderBy: [
        { nextAccountsDue: 'asc' },
        { companyName: 'asc' }
      ],
      skip,
      take: limit
    })

    // PERFORMANCE: Lightweight data transformation (removed heavy conversions)
    const transformedClients = clients.map(client => ({
      id: client.id,
      clientCode: client.clientCode,
      companyNumber: client.companyNumber,
      companyName: client.companyName,
      companyType: client.companyType,
      contactName: client.contactName,
      contactEmail: client.contactEmail,
      incorporationDate: client.incorporationDate?.toISOString(),
      nextYearEnd: client.nextYearEnd?.toISOString(),
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
        filedDate: client.ltdAccountsWorkflows[0].filedDate?.toISOString(),
        
        // Milestone dates (optimized subset)
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
        filedByUserName: client.ltdAccountsWorkflows[0].filedByUserName,
      } : null
    }))

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    // PERFORMANCE: Smart caching for paginated results
    const response = NextResponse.json({
      success: true,
      clients: transformedClients,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPreviousPage,
        pageSize: limit
      },
      meta: {
        fetchedAt: new Date().toISOString(),
        clientsCount: transformedClients.length
      }
    })

    // Cache for 1 minute to improve performance while maintaining data freshness
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30')

    return response

  } catch (error) {
    console.error('Error fetching Ltd companies deadlines:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Ltd companies deadlines' },
      { status: 500 }
    )
  }
} 