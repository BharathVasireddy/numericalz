import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface FilterCondition {
  id: string
  field: string
  operator: string
  value: string | string[] | boolean | null
  value2?: string
}

interface FilterGroup {
  id: string
  operator: 'AND' | 'OR'
  conditions: FilterCondition[]
}

interface AdvancedFilter {
  id: string
  name: string
  groups: FilterGroup[]
  groupOperator: 'AND' | 'OR'
}

function buildPrismaWhereClause(filter: AdvancedFilter, userId: string): any {
  const groupClauses = filter.groups.map(group => {
    const conditionClauses = group.conditions.map(condition => {
      return buildConditionClause(condition, userId)
    }).filter(clause => clause !== null)

    if (conditionClauses.length === 0) return null
    if (conditionClauses.length === 1) return conditionClauses[0]

    return group.operator === 'AND' 
      ? { AND: conditionClauses }
      : { OR: conditionClauses }
  }).filter(clause => clause !== null)

  if (groupClauses.length === 0) return {}
  if (groupClauses.length === 1) return groupClauses[0]

  return filter.groupOperator === 'AND'
    ? { AND: groupClauses }
    : { OR: groupClauses }
}

function buildConditionClause(condition: FilterCondition, userId: string): any {
  const { field, operator, value, value2 } = condition

  if (field === 'assignedUser' || field === 'accountsAssignedUser') {
    return buildUserAssignmentClause(field, operator, value, userId)
  }

  switch (operator) {
    case 'equals':
      return { [field]: value }
    case 'notEquals':
      return { [field]: { not: value } }
    case 'contains':
      return { [field]: { contains: value as string, mode: 'insensitive' } }
    case 'notContains':
      return { [field]: { not: { contains: value as string, mode: 'insensitive' } } }
    case 'startsWith':
      return { [field]: { startsWith: value as string, mode: 'insensitive' } }
    case 'endsWith':
      return { [field]: { endsWith: value as string, mode: 'insensitive' } }
    case 'isEmpty':
      return { OR: [{ [field]: null }, { [field]: '' }] }
    case 'isNotEmpty':
      return { AND: [{ [field]: { not: null } }, { [field]: { not: '' } }] }
    case 'isNull':
      return { [field]: null }
    case 'isNotNull':
      return { [field]: { not: null } }
    case 'in':
      return { [field]: { in: value as string[] } }
    case 'notIn':
      return { [field]: { notIn: value as string[] } }
    case 'greaterThan':
      return { [field]: { gt: parseFloat(value as string) } }
    case 'lessThan':
      return { [field]: { lt: parseFloat(value as string) } }
    case 'between':
      if (field.includes('Date') || field === 'createdAt') {
        return {
          [field]: {
            gte: new Date(value as string),
            lte: new Date(value2 as string)
          }
        }
      } else {
        return {
          [field]: {
            gte: parseFloat(value as string),
            lte: parseFloat(value2 as string)
          }
        }
      }
    case 'before':
      return { [field]: { lt: new Date(value as string) } }
    case 'after':
      return { [field]: { gt: new Date(value as string) } }
    default:
      return null
  }
}

function buildUserAssignmentClause(field: string, operator: string, value: string | string[] | boolean | null, userId: string): any {
  const targetUserId = value === 'me' ? userId : value as string

  switch (field) {
    case 'assignedUser':
      switch (operator) {
        case 'equals':
          return { assignedUserId: targetUserId }
        case 'notEquals':
          return { assignedUserId: { not: targetUserId } }
        case 'isNull':
          return { assignedUserId: null }
        case 'isNotNull':
          return { assignedUserId: { not: null } }
        default:
          return null
      }

    case 'accountsAssignedUser':
      switch (operator) {
        case 'equals':
          return {
            OR: [
              { 
                AND: [
                  { companyType: 'LIMITED_COMPANY' },
                  { ltdCompanyAssignedUserId: targetUserId }
                ]
              },
              {
                AND: [
                  { companyType: { in: ['NON_LIMITED_COMPANY', 'DIRECTOR', 'SUB_CONTRACTOR'] } },
                  { nonLtdCompanyAssignedUserId: targetUserId }
                ]
              },
              {
                AND: [
                  { companyType: 'LIMITED_COMPANY' },
                  { ltdCompanyAssignedUserId: null },
                  { assignedUserId: targetUserId }
                ]
              },
              {
                AND: [
                  { companyType: { in: ['NON_LIMITED_COMPANY', 'DIRECTOR', 'SUB_CONTRACTOR'] } },
                  { nonLtdCompanyAssignedUserId: null },
                  { assignedUserId: targetUserId }
                ]
              }
            ]
          }
        case 'isNull':
          return {
            AND: [
              { ltdCompanyAssignedUserId: null },
              { nonLtdCompanyAssignedUserId: null },
              { assignedUserId: null }
            ]
          }
        default:
          return null
      }



    default:
      return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { filter, sortBy = 'companyName', sortOrder = 'asc', page = 1, limit = 100 } = body

    if (!filter) {
      return NextResponse.json(
        { success: false, error: 'Filter is required' },
        { status: 400 }
      )
    }

    const where = {
      isActive: true,
      ...buildPrismaWhereClause(filter, session.user.id)
    }

    console.log('Advanced Filter WHERE clause:', JSON.stringify(where, null, 2))

    const skip = (page - 1) * limit

    const [clients, totalCount] = await Promise.all([
      db.client.findMany({
        where,
        select: {
          id: true,
          clientCode: true,
          companyName: true,
          companyNumber: true,
          companyType: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          nextAccountsDue: true,
          nextConfirmationDue: true,
          nextCorporationTaxDue: true,
          lastAccountsMadeUpTo: true,
          isActive: true,
          isVatEnabled: true,
          createdAt: true,
          yearEstablished: true,
          numberOfEmployees: true,
          annualTurnover: true,
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          ltdCompanyAssignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          nonLtdCompanyAssignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          corporationTaxStatus: true,
          corporationTaxPeriodStart: true,
          corporationTaxPeriodEnd: true,
          manualCTDueOverride: true,
          ctDueSource: true,
          lastCTStatusUpdate: true,
          ctStatusUpdatedBy: true,
        },
        orderBy: (() => {
          if (sortBy === 'accountsAssigned') {
            // For accounts assignment, we'll sort client-side
            return [{ companyName: 'asc' }]
          } else if (sortBy === 'vatAssigned') {
            // For VAT assignment, we'll sort client-side
            return [{ companyName: 'asc' }]
          } else if (sortBy === 'assignedUser') {
            return [
              { assignedUser: { name: sortOrder as 'asc' | 'desc' } },
              { companyName: 'asc' }
            ]
          } else {
            return { [sortBy]: sortOrder as 'asc' | 'desc' }
          }
        })(),
        skip,
        take: limit,
      }),
      db.client.count({ where }),
    ])

    // Handle client-side sorting for assignment columns
    let sortedClients = clients
    if (sortBy === 'accountsAssigned' || sortBy === 'vatAssigned') {
      sortedClients = [...clients].sort((a, b) => {
        let aValue = ''
        let bValue = ''
        
        if (sortBy === 'accountsAssigned') {
          // Get effective accounts assignment
          if (a.companyType === 'LIMITED_COMPANY') {
            aValue = a.ltdCompanyAssignedUser?.name || a.assignedUser?.name || 'Unassigned'
          } else {
            aValue = a.nonLtdCompanyAssignedUser?.name || a.assignedUser?.name || 'Unassigned'
          }
          
          if (b.companyType === 'LIMITED_COMPANY') {
            bValue = b.ltdCompanyAssignedUser?.name || b.assignedUser?.name || 'Unassigned'
          } else {
            bValue = b.nonLtdCompanyAssignedUser?.name || b.assignedUser?.name || 'Unassigned'
          }
        } else if (sortBy === 'vatAssigned') {
          // SIMPLIFIED: VAT assignment sorting removed - use quarter-specific assignments in VAT deadlines table
          aValue = 'VAT Sorting Disabled'
          bValue = 'VAT Sorting Disabled'
        }
        
        const comparison = aValue.localeCompare(bValue)
        return sortOrder === 'asc' ? comparison : -comparison
      })
    }

    const totalPages = Math.ceil(totalCount / limit)

    const response = NextResponse.json({
      success: true,
      clients: sortedClients,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      appliedFilter: filter
    })

    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response

  } catch (error) {
    console.error('Advanced filter error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}