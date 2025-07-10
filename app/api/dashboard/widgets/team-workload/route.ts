import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and partners can access this endpoint
    if (!['MANAGER', 'PARTNER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // PERFORMANCE OPTIMIZATION: Use more efficient queries with counts
    // Get users with aggregated counts instead of fetching all relations
    const teamWorkload = await db.user.findMany({
      where: { 
        isActive: true
      },
      select: {
        id: true,
        name: true,
        role: true,
        
        // OPTIMIZED: Use _count for efficient counting
        _count: {
          select: {
            assignedClients: {
              where: { isActive: true }
            },
            ltdCompanyAssignedClients: {
              where: { isActive: true }
            },
            nonLtdCompanyAssignedClients: {
              where: { isActive: true }
            },
            assignedVATQuarters: {
              where: { 
                client: { isActive: true },
                isCompleted: false
              }
            },
            assignedLtdAccountsWorkflows: {
              where: { 
                client: { isActive: true },
                isCompleted: false
              }
            }
          }
        }
      },
      orderBy: [
        { role: 'desc' }, // Partners first, then managers, then staff
        { name: 'asc' }
      ]
    })

    // Transform the data to match the expected format
    const transformedData = teamWorkload.map(user => ({
      id: user.id,
      name: user.name || 'Unknown',
      role: user.role,
      
      // Calculate total client count efficiently
      clientCount: user._count.assignedClients + 
                  user._count.ltdCompanyAssignedClients + 
                  user._count.nonLtdCompanyAssignedClients,
      
      // Separate counts for detailed breakdown
      generalAssignments: user._count.assignedClients,
      ltdAssignments: user._count.ltdCompanyAssignedClients,
      nonLtdAssignments: user._count.nonLtdCompanyAssignedClients,
      
      // Active workflow counts
      activeVATQuarters: user._count.assignedVATQuarters,
      activeLtdWorkflows: user._count.assignedLtdAccountsWorkflows
    }))

    // Calculate summary statistics
    const summary = {
      totalUsers: transformedData.length,
      totalClients: transformedData.reduce((sum, user) => sum + user.clientCount, 0),
      totalVATQuarters: transformedData.reduce((sum, user) => sum + user.activeVATQuarters, 0),
      totalLtdWorkflows: transformedData.reduce((sum, user) => sum + user.activeLtdWorkflows, 0),
      
      // Role distribution
      partners: transformedData.filter(u => u.role === 'PARTNER').length,
      managers: transformedData.filter(u => u.role === 'MANAGER').length,
      staff: transformedData.filter(u => u.role === 'STAFF').length
    }

    return NextResponse.json({
      success: true,
      data: {
        teamWorkload: transformedData,
        summary
      }
    })

  } catch (error) {
    console.error('Team workload API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch team workload data'
    }, { status: 500 })
  }
} 