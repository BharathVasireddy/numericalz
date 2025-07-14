import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userRole = searchParams.get('role') || session.user.role

    // Only managers and partners can access workflow reviews
    if (!['MANAGER', 'PARTNER'].includes(userRole)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const reviewItems: any[] = []

    // Get VAT workflow reviews
    if (userRole === 'MANAGER') {
      // Manager reviews: REVIEW_PENDING_MANAGER stage
      const vatManagerReviews = await db.vATQuarter.findMany({
        where: {
          currentStage: 'REVIEW_PENDING_MANAGER',
          isCompleted: false
        },
        include: {
          client: {
            select: {
              id: true,
              clientCode: true,
              companyName: true
            }
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          workflowHistory: {
            where: {
              toStage: 'REVIEW_PENDING_MANAGER'
            },
            orderBy: {
              stageChangedAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          workStartedDate: 'asc' // Oldest first for priority
        }
      })

      // Add VAT reviews to items
      for (const vatQuarter of vatManagerReviews) {
        // Use the actual stage change date from workflow history
        const stageChangeHistory = vatQuarter.workflowHistory[0]
        const submittedDate = stageChangeHistory?.stageChangedAt || vatQuarter.workFinishedDate || vatQuarter.workStartedDate || vatQuarter.createdAt
        const daysWaiting = Math.floor((new Date().getTime() - new Date(submittedDate).getTime()) / (1000 * 60 * 60 * 24))
        
        reviewItems.push({
          id: `vat-${vatQuarter.id}`,
          type: 'vat',
          clientId: vatQuarter.client.id,
          clientName: vatQuarter.client.companyName,
          clientCode: vatQuarter.client.clientCode,
          workflowId: vatQuarter.id,
          currentStage: vatQuarter.currentStage,
          stageLabel: 'Review pending by manager',
          assignedUser: vatQuarter.assignedUser || { id: '', name: 'Unassigned', role: 'STAFF' },
          submittedDate: submittedDate,
          daysWaiting,
          priority: daysWaiting > 5 ? 'high' : daysWaiting > 2 ? 'medium' : 'low',
          quarterPeriod: vatQuarter.quarterPeriod.replace('_to_', ' to ').replace(/_/g, '-')
        })
      }

      // Ltd company manager reviews: DISCUSS_WITH_MANAGER stage
      const ltdManagerReviews = await db.ltdAccountsWorkflow.findMany({
        where: {
          currentStage: 'DISCUSS_WITH_MANAGER',
          isCompleted: false
        },
        include: {
          client: {
            select: {
              id: true,
              clientCode: true,
              companyName: true
            }
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          workflowHistory: {
            where: {
              toStage: 'DISCUSS_WITH_MANAGER'
            },
            orderBy: {
              stageChangedAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          workStartedDate: 'asc'
        }
      })

      // Add Ltd reviews to items
      for (const ltdWorkflow of ltdManagerReviews) {
        // Use the actual stage change date from workflow history
        const stageChangeHistory = ltdWorkflow.workflowHistory[0]
        const submittedDate = stageChangeHistory?.stageChangedAt || ltdWorkflow.workStartedDate || ltdWorkflow.createdAt
        const daysWaiting = Math.floor((new Date().getTime() - new Date(submittedDate).getTime()) / (1000 * 60 * 60 * 24))
        
        reviewItems.push({
          id: `ltd-${ltdWorkflow.id}`,
          type: 'ltd',
          clientId: ltdWorkflow.client.id,
          clientName: ltdWorkflow.client.companyName,
          clientCode: ltdWorkflow.client.clientCode,
          workflowId: ltdWorkflow.id,
          currentStage: ltdWorkflow.currentStage,
          stageLabel: 'To discuss with manager',
          assignedUser: ltdWorkflow.assignedUser || { id: '', name: 'Unassigned', role: 'STAFF' },
          submittedDate: submittedDate,
          daysWaiting,
          priority: daysWaiting > 5 ? 'high' : daysWaiting > 2 ? 'medium' : 'low',
          filingPeriod: `${new Date(ltdWorkflow.filingPeriodStart).getFullYear()}-${new Date(ltdWorkflow.filingPeriodEnd).getFullYear()}`
        })
      }

      // Non-Ltd company manager reviews: DISCUSS_WITH_MANAGER stage
      const nonLtdManagerReviews = await db.nonLtdAccountsWorkflow.findMany({
        where: {
          currentStage: 'DISCUSS_WITH_MANAGER',
          isCompleted: false
        },
        include: {
          client: {
            select: {
              id: true,
              clientCode: true,
              companyName: true
            }
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          workflowHistory: {
            where: {
              toStage: 'DISCUSS_WITH_MANAGER'
            },
            orderBy: {
              stageChangedAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          workStartedDate: 'asc'
        }
      })

      // Add Non-Ltd reviews to items
      for (const nonLtdWorkflow of nonLtdManagerReviews) {
        // Use the actual stage change date from workflow history
        const stageChangeHistory = nonLtdWorkflow.workflowHistory[0]
        const submittedDate = stageChangeHistory?.stageChangedAt || nonLtdWorkflow.workStartedDate || nonLtdWorkflow.createdAt
        const daysWaiting = Math.floor((new Date().getTime() - new Date(submittedDate).getTime()) / (1000 * 60 * 60 * 24))
        
        reviewItems.push({
          id: `non-ltd-${nonLtdWorkflow.id}`,
          type: 'non-ltd',
          clientId: nonLtdWorkflow.client.id,
          clientName: nonLtdWorkflow.client.companyName,
          clientCode: nonLtdWorkflow.client.clientCode,
          workflowId: nonLtdWorkflow.id,
          currentStage: nonLtdWorkflow.currentStage,
          stageLabel: 'To discuss with manager',
          assignedUser: nonLtdWorkflow.assignedUser || { id: '', name: 'Unassigned', role: 'STAFF' },
          submittedDate: submittedDate,
          daysWaiting,
          priority: daysWaiting > 5 ? 'high' : daysWaiting > 2 ? 'medium' : 'low',
          filingPeriod: `${new Date(nonLtdWorkflow.yearEndDate).getFullYear()}-${new Date(nonLtdWorkflow.yearEndDate).getFullYear() + 1}`
        })
      }
    }

    if (userRole === 'PARTNER') {
      // Partner VAT reviews: REVIEW_PENDING_PARTNER and EMAILED_TO_PARTNER stages
      const vatPartnerReviews = await db.vATQuarter.findMany({
        where: {
          currentStage: {
            in: ['REVIEW_PENDING_PARTNER', 'EMAILED_TO_PARTNER']
          },
          isCompleted: false
        },
        include: {
          client: {
            select: {
              id: true,
              clientCode: true,
              companyName: true
            }
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          workflowHistory: {
            where: {
              OR: [
                { toStage: 'REVIEW_PENDING_PARTNER' },
                { toStage: 'EMAILED_TO_PARTNER' }
              ]
            },
            orderBy: {
              stageChangedAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          workFinishedDate: 'asc'
        }
      })

      // Add VAT partner reviews
      for (const vatQuarter of vatPartnerReviews) {
        // Use the actual stage change date from workflow history
        const stageChangeHistory = vatQuarter.workflowHistory[0]
        const submittedDate = stageChangeHistory?.stageChangedAt || vatQuarter.workFinishedDate || vatQuarter.workStartedDate || vatQuarter.createdAt
        const daysWaiting = Math.floor((new Date().getTime() - new Date(submittedDate).getTime()) / (1000 * 60 * 60 * 24))
        
        reviewItems.push({
          id: `vat-${vatQuarter.id}`,
          type: 'vat',
          clientId: vatQuarter.client.id,
          clientName: vatQuarter.client.companyName,
          clientCode: vatQuarter.client.clientCode,
          workflowId: vatQuarter.id,
          currentStage: vatQuarter.currentStage,
          stageLabel: vatQuarter.currentStage === 'REVIEW_PENDING_PARTNER' ? 'Review pending by partner' : 'Emailed to partner',
          assignedUser: vatQuarter.assignedUser || { id: '', name: 'Unassigned', role: 'STAFF' },
          submittedDate: submittedDate,
          daysWaiting,
          priority: daysWaiting > 5 ? 'high' : daysWaiting > 2 ? 'medium' : 'low',
          quarterPeriod: vatQuarter.quarterPeriod.replace('_to_', ' to ').replace(/_/g, '-')
        })
      }

      // Partner Ltd reviews: REVIEW_BY_PARTNER stage
      const ltdPartnerReviews = await db.ltdAccountsWorkflow.findMany({
        where: {
          currentStage: 'REVIEW_BY_PARTNER',
          isCompleted: false
        },
        include: {
          client: {
            select: {
              id: true,
              clientCode: true,
              companyName: true
            }
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          workflowHistory: {
            where: {
              toStage: 'REVIEW_BY_PARTNER'
            },
            orderBy: {
              stageChangedAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          managerDiscussionDate: 'asc'
        }
      })

      // Add Ltd partner reviews
      for (const ltdWorkflow of ltdPartnerReviews) {
        // Use the actual stage change date from workflow history
        const stageChangeHistory = ltdWorkflow.workflowHistory[0]
        const submittedDate = stageChangeHistory?.stageChangedAt || ltdWorkflow.managerDiscussionDate || ltdWorkflow.workStartedDate || ltdWorkflow.createdAt
        const daysWaiting = Math.floor((new Date().getTime() - new Date(submittedDate).getTime()) / (1000 * 60 * 60 * 24))
        
        reviewItems.push({
          id: `ltd-${ltdWorkflow.id}`,
          type: 'ltd',
          clientId: ltdWorkflow.client.id,
          clientName: ltdWorkflow.client.companyName,
          clientCode: ltdWorkflow.client.clientCode,
          workflowId: ltdWorkflow.id,
          currentStage: ltdWorkflow.currentStage,
          stageLabel: 'To review by partner',
          assignedUser: ltdWorkflow.assignedUser || { id: '', name: 'Unassigned', role: 'STAFF' },
          submittedDate: submittedDate,
          daysWaiting,
          priority: daysWaiting > 5 ? 'high' : daysWaiting > 2 ? 'medium' : 'low',
          filingPeriod: `${new Date(ltdWorkflow.filingPeriodStart).getFullYear()}-${new Date(ltdWorkflow.filingPeriodEnd).getFullYear()}`
        })
      }

      // Partner Non-Ltd reviews: REVIEW_BY_PARTNER stage
      const nonLtdPartnerReviews = await db.nonLtdAccountsWorkflow.findMany({
        where: {
          currentStage: 'REVIEW_BY_PARTNER',
          isCompleted: false
        },
        include: {
          client: {
            select: {
              id: true,
              clientCode: true,
              companyName: true
            }
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          workflowHistory: {
            where: {
              toStage: 'REVIEW_BY_PARTNER'
            },
            orderBy: {
              stageChangedAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          managerDiscussionDate: 'asc'
        }
      })

      // Add Non-Ltd partner reviews
      for (const nonLtdWorkflow of nonLtdPartnerReviews) {
        // Use the actual stage change date from workflow history
        const stageChangeHistory = nonLtdWorkflow.workflowHistory[0]
        const submittedDate = stageChangeHistory?.stageChangedAt || nonLtdWorkflow.managerDiscussionDate || nonLtdWorkflow.workStartedDate || nonLtdWorkflow.createdAt
        const daysWaiting = Math.floor((new Date().getTime() - new Date(submittedDate).getTime()) / (1000 * 60 * 60 * 24))
        
        reviewItems.push({
          id: `non-ltd-${nonLtdWorkflow.id}`,
          type: 'non-ltd',
          clientId: nonLtdWorkflow.client.id,
          clientName: nonLtdWorkflow.client.companyName,
          clientCode: nonLtdWorkflow.client.clientCode,
          workflowId: nonLtdWorkflow.id,
          currentStage: nonLtdWorkflow.currentStage,
          stageLabel: 'To review by partner',
          assignedUser: nonLtdWorkflow.assignedUser || { id: '', name: 'Unassigned', role: 'STAFF' },
          submittedDate: submittedDate,
          daysWaiting,
          priority: daysWaiting > 5 ? 'high' : daysWaiting > 2 ? 'medium' : 'low',
          filingPeriod: `${new Date(nonLtdWorkflow.yearEndDate).getFullYear()}-${new Date(nonLtdWorkflow.yearEndDate).getFullYear() + 1}`
        })
      }
    }

    // Sort by priority and days waiting
    reviewItems.sort((a, b) => {
      // First sort by priority (high > medium > low)
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 }
      const priorityDiff = priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder]
      if (priorityDiff !== 0) return priorityDiff
      
      // Then by days waiting (descending)
      return b.daysWaiting - a.daysWaiting
    })

    return NextResponse.json({
      success: true,
      data: {
        reviewItems,
        summary: {
          total: reviewItems.length,
          high: reviewItems.filter(item => item.priority === 'high').length,
          medium: reviewItems.filter(item => item.priority === 'medium').length,
          low: reviewItems.filter(item => item.priority === 'low').length,
          vat: reviewItems.filter(item => item.type === 'vat').length,
          ltd: reviewItems.filter(item => item.type === 'ltd').length,
          nonLtd: reviewItems.filter(item => item.type === 'non-ltd').length
        }
      }
    })

  } catch (error) {
    console.error('Error fetching workflow reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow reviews' },
      { status: 500 }
    )
  }
} 