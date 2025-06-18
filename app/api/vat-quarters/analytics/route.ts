import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db as prisma } from '@/lib/db'

/**
 * GET /api/vat-quarters/analytics
 * Comprehensive VAT workflow analytics and insights
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has manager/partner role for analytics access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || !['MANAGER', 'PARTNER'].includes(user.role)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions for analytics access' 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current_quarter'

    // Calculate date ranges based on period
    const now = new Date()
    let startDate: Date
    let endDate: Date = now

    switch (period) {
      case 'current_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'current_quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1)
        break
      case 'current_year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'last_6_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    }

    // 1. Overview Metrics
    const [
      totalClients,
      activeWorkflows,
      completedThisMonth,
      overdueReturns,
      allVATQuarters
    ] = await Promise.all([
      // Total VAT-enabled clients
      prisma.client.count({
        where: { 
          isActive: true,
          isVatEnabled: true 
        }
      }),

      // Active workflows (not completed)
      prisma.vATQuarter.count({
        where: {
          isCompleted: false,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      }),

      // Completed this month
      prisma.vATQuarter.count({
        where: {
          isCompleted: true,
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
            lte: endDate
          }
        }
      }),

      // Overdue returns (filing due date passed)
      prisma.vATQuarter.count({
        where: {
          isCompleted: false,
          filingDueDate: {
            lt: now
          }
        }
      }),

      // All VAT quarters for calculations
      prisma.vATQuarter.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          workflowHistory: {
            orderBy: {
              stageChangedAt: 'asc'
            }
          }
        }
      })
    ])

    // Calculate average completion time and efficiency
    const completedQuarters = allVATQuarters.filter(q => q.isCompleted)
    const averageCompletionTime = completedQuarters.length > 0 
      ? Math.round(completedQuarters.reduce((acc, quarter) => {
          const createdAt = new Date(quarter.createdAt)
          const completedAt = quarter.workflowHistory
            .find(h => h.toStage === 'FILED_TO_HMRC')?.stageChangedAt || createdAt
          const daysDiff = Math.ceil((new Date(completedAt).getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
          return acc + daysDiff
        }, 0) / completedQuarters.length)
      : 0

    const onTimeCompletions = completedQuarters.filter(quarter => {
      const completedAt = quarter.workflowHistory
        .find(h => h.toStage === 'FILED_TO_HMRC')?.stageChangedAt || quarter.createdAt
      return new Date(completedAt) <= new Date(quarter.filingDueDate)
    }).length

    const workflowEfficiency = completedQuarters.length > 0 
      ? Math.round((onTimeCompletions / completedQuarters.length) * 100)
      : 0

    // 2. Stage Breakdown
    const stageBreakdown = await prisma.vATQuarter.groupBy({
      by: ['currentStage'],
      where: {
        isCompleted: false,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        currentStage: true
      }
    })

    const totalActiveQuarters = stageBreakdown.reduce((acc, stage) => acc + stage._count.currentStage, 0)
    
    const stageBreakdownWithStats = await Promise.all(
      stageBreakdown.map(async (stage) => {
        // Calculate average days in stage
        const quartersInStage = await prisma.vATQuarter.findMany({
          where: {
            currentStage: stage.currentStage,
            isCompleted: false
          },
          include: {
            workflowHistory: {
              where: {
                toStage: stage.currentStage
              },
              orderBy: {
                stageChangedAt: 'desc'
              },
              take: 1
            }
          }
        })

        const averageDaysInStage = quartersInStage.length > 0 
          ? Math.round(quartersInStage.reduce((acc, quarter) => {
              const stageEntry = quarter.workflowHistory[0]
              if (stageEntry) {
                const daysSinceStage = Math.ceil((now.getTime() - new Date(stageEntry.stageChangedAt).getTime()) / (1000 * 60 * 60 * 24))
                return acc + daysSinceStage
              }
              return acc
            }, 0) / quartersInStage.length)
          : 0

        return {
          stage: stage.currentStage,
          count: stage._count.currentStage,
          percentage: Math.round((stage._count.currentStage / Math.max(totalActiveQuarters, 1)) * 100),
          averageDaysInStage
        }
      })
    )

    // 3. User Performance
    const userPerformance = await prisma.user.findMany({
      where: {
        role: {
          in: ['STAFF', 'MANAGER', 'PARTNER']
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        assignedVATQuarters: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          },
          include: {
            workflowHistory: {
              where: {
                toStage: 'FILED_TO_HMRC'
              }
            }
          }
        }
      }
    })

    const userPerformanceStats = userPerformance
      .filter(user => user.assignedVATQuarters.length > 0)
      .map(user => {
        const assignedCount = user.assignedVATQuarters.length
        const completedCount = user.assignedVATQuarters.filter(q => q.isCompleted).length
        
        const completedQuarters = user.assignedVATQuarters.filter(q => q.isCompleted)
        const averageCompletionTime = completedQuarters.length > 0
          ? Math.round(completedQuarters.reduce((acc, quarter) => {
              const createdAt = new Date(quarter.createdAt)
              const completedAt = quarter.workflowHistory[0]?.stageChangedAt || createdAt
              const daysDiff = Math.ceil((new Date(completedAt).getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
              return acc + daysDiff
            }, 0) / completedQuarters.length)
          : 0

        const onTimeCompletions = completedQuarters.filter(quarter => {
          const completedAt = quarter.workflowHistory[0]?.stageChangedAt || quarter.createdAt
          return new Date(completedAt) <= new Date(quarter.filingDueDate)
        }).length

        const efficiency = completedCount > 0 
          ? Math.round((onTimeCompletions / completedCount) * 100)
          : 0

        return {
          userId: user.id,
          userName: user.name || user.email || 'Unknown User',
          userEmail: user.email || '',
          assignedCount,
          completedCount,
          averageCompletionTime,
          efficiency
        }
      })

    // 4. Time Analysis
    const quarterlyTrends = []
    const monthlyWorkload = []

    // Generate quarterly trends for the last 4 quarters
    for (let i = 3; i >= 0; i--) {
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - i * 3, 1)
      const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0)
      
      const quarterQuarters = await prisma.vATQuarter.findMany({
        where: {
          isCompleted: true,
          createdAt: {
            gte: quarterStart,
            lte: quarterEnd
          }
        },
        include: {
          workflowHistory: {
            where: {
              toStage: 'FILED_TO_HMRC'
            }
          }
        }
      })

      const completed = quarterQuarters.length
      const onTime = quarterQuarters.filter(quarter => {
        const completedAt = quarter.workflowHistory[0]?.stageChangedAt || quarter.createdAt
        return new Date(completedAt) <= new Date(quarter.filingDueDate)
      }).length
      const late = completed - onTime

      quarterlyTrends.push({
        quarter: `Q${Math.floor(quarterStart.getMonth() / 3) + 1} ${quarterStart.getFullYear()}`,
        completed,
        onTime,
        late
      })
    }

    // Generate monthly workload for the last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
      
      const [created, completed] = await Promise.all([
        prisma.vATQuarter.count({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd
            }
          }
        }),
        prisma.vATQuarter.count({
          where: {
            isCompleted: true,
            createdAt: {
              gte: monthStart,
              lte: monthEnd
            }
          }
        })
      ])

      const backlog = created - completed

      monthlyWorkload.push({
        month: monthStart.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        created,
        completed,
        backlog: Math.max(0, backlog)
      })
    }

    // 5. Client Insights
    const [frequencyDistribution, quarterGroupDistribution] = await Promise.all([
      // VAT frequency distribution
      prisma.client.groupBy({
        by: ['vatReturnsFrequency'],
        where: {
          isActive: true,
          isVatEnabled: true,
          vatReturnsFrequency: {
            not: null
          }
        },
        _count: {
          vatReturnsFrequency: true
        }
      }),

      // Quarter group distribution
      prisma.client.groupBy({
        by: ['vatQuarterGroup'],
        where: {
          isActive: true,
          isVatEnabled: true,
          vatQuarterGroup: {
            not: null
          }
        },
        _count: {
          vatQuarterGroup: true
        }
      })
    ])

    const totalVATClients = await prisma.client.count({
      where: {
        isActive: true,
        isVatEnabled: true
      }
    })

    const frequencyStats = frequencyDistribution.map(freq => ({
      frequency: freq.vatReturnsFrequency || 'Unknown',
      count: freq._count.vatReturnsFrequency,
      percentage: Math.round((freq._count.vatReturnsFrequency / Math.max(totalVATClients, 1)) * 100)
    }))

    const quarterGroupStats = quarterGroupDistribution.map(group => ({
      quarterGroup: group.vatQuarterGroup || 'Unknown',
      count: group._count.vatQuarterGroup,
      percentage: Math.round((group._count.vatQuarterGroup / Math.max(totalVATClients, 1)) * 100)
    }))

    // Compile analytics response
    const analytics = {
      overview: {
        totalClients,
        activeWorkflows,
        completedThisMonth,
        overdueReturns,
        averageCompletionTime,
        workflowEfficiency
      },
      stageBreakdown: stageBreakdownWithStats,
      userPerformance: userPerformanceStats,
      timeAnalysis: {
        quarterlyTrends,
        monthlyWorkload
      },
      clientInsights: {
        frequencyDistribution: frequencyStats,
        quarterGroupDistribution: quarterGroupStats
      }
    }

    return NextResponse.json({
      success: true,
      analytics,
      period,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error generating VAT analytics:', error)
    return NextResponse.json(
      { error: 'Failed to generate VAT analytics' },
      { status: 500 }
    )
  }
}