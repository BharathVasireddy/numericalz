import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = params.id

    // Fetch all accounts workflows for this client (both active and completed)
    const accountsWorkflows = await db.ltdAccountsWorkflow.findMany({
      where: {
        clientId: clientId
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        workflowHistory: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: {
            stageChangedAt: 'asc'
          }
        }
      },
      orderBy: [
        { filingPeriodEnd: 'desc' } // Most recent periods first
      ]
    })

    // Transform the data to match frontend expectations
    const transformedWorkflows = accountsWorkflows.map(workflow => ({
      id: workflow.id,
      filingPeriodStart: workflow.filingPeriodStart.toISOString(),
      filingPeriodEnd: workflow.filingPeriodEnd.toISOString(),
      accountsDueDate: workflow.accountsDueDate.toISOString(),
      ctDueDate: workflow.ctDueDate.toISOString(),
      csDueDate: workflow.csDueDate.toISOString(),
      currentStage: workflow.currentStage,
      isCompleted: workflow.isCompleted,
      assignedUser: workflow.assignedUser,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
      
      // Milestone dates
      chaseStartedDate: workflow.chaseStartedDate?.toISOString(),
      chaseStartedByUserName: workflow.chaseStartedByUserName,
      paperworkReceivedDate: workflow.paperworkReceivedDate?.toISOString(),
      paperworkReceivedByUserName: workflow.paperworkReceivedByUserName,
      workStartedDate: workflow.workStartedDate?.toISOString(),
      workStartedByUserName: workflow.workStartedByUserName,
      managerDiscussionDate: workflow.managerDiscussionDate?.toISOString(),
      managerDiscussionByUserName: workflow.managerDiscussionByUserName,
      partnerReviewDate: workflow.partnerReviewDate?.toISOString(),
      partnerReviewByUserName: workflow.partnerReviewByUserName,
      reviewCompletedDate: workflow.reviewCompletedDate?.toISOString(),
      reviewCompletedByUserName: workflow.reviewCompletedByUserName,
      sentToClientDate: workflow.sentToClientDate?.toISOString(),
      sentToClientByUserName: workflow.sentToClientByUserName,
      clientApprovedDate: workflow.clientApprovedDate?.toISOString(),
      clientApprovedByUserName: workflow.clientApprovedByUserName,
      partnerApprovedDate: workflow.partnerApprovedDate?.toISOString(),
      partnerApprovedByUserName: workflow.partnerApprovedByUserName,
      filedDate: workflow.filedDate?.toISOString(),
      filedByUserName: workflow.filedByUserName,
      filedToCompaniesHouseDate: workflow.filedToCompaniesHouseDate?.toISOString(),
      filedToCompaniesHouseByUserName: workflow.filedToCompaniesHouseByUserName,
      filedToHMRCDate: workflow.filedToHMRCDate?.toISOString(),
      filedToHMRCByUserName: workflow.filedToHMRCByUserName,
      clientSelfFilingDate: workflow.clientSelfFilingDate?.toISOString(),
      clientSelfFilingByUserName: workflow.clientSelfFilingByUserName,
      
      // Workflow history
      workflowHistory: workflow.workflowHistory.map(history => ({
        id: history.id,
        fromStage: history.fromStage,
        toStage: history.toStage,
        stageChangedAt: history.stageChangedAt.toISOString(),
        daysInPreviousStage: history.daysInPreviousStage,
        userName: history.userName,
        userEmail: history.userEmail,
        userRole: history.userRole,
        notes: history.notes,
        user: history.user
      }))
    }))

    return NextResponse.json({
      success: true,
      data: {
        accountsWorkflows: transformedWorkflows,
        totalWorkflows: transformedWorkflows.length,
        completedWorkflows: transformedWorkflows.filter(w => w.isCompleted).length,
        activeWorkflows: transformedWorkflows.filter(w => !w.isCompleted).length
      }
    })

  } catch (error) {
    console.error('Error fetching accounts filing history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts filing history' },
      { status: 500 }
    )
  }
} 