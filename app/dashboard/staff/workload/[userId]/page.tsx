import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { IndividualWorkloadView } from '@/components/staff/individual-workload-view'

export const metadata: Metadata = {
  title: 'Individual Workload - Numericalz',
  description: 'View detailed workload for team member',
}

interface IndividualWorkloadPageProps {
  params: {
    userId: string
  }
}

export default async function IndividualWorkloadPage({ params }: IndividualWorkloadPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/login')
  }

  // Only partners can access this page
  if (session.user.role !== 'PARTNER') {
    redirect('/dashboard')
  }

  const { userId } = params

  // Get the specific user with all their assignments
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      // Workflow-level assignments
                assignedVATQuarters: {
            select: {
              id: true,
              currentStage: true,
              quarterPeriod: true,
              quarterEndDate: true,
              filingDueDate: true,
              isCompleted: true,
              client: {
                select: {
                  id: true,
                  clientCode: true,
                  companyName: true,
                  companyType: true,
                  isVatEnabled: true
                }
              }
            }
          },
                assignedLtdAccountsWorkflows: {
            select: {
              id: true,
              currentStage: true,
              filingPeriodStart: true,
              filingPeriodEnd: true,
              accountsDueDate: true,
              isCompleted: true,
              client: {
                select: {
                  id: true,
                  clientCode: true,
                  companyName: true,
                  companyType: true
                }
              }
            }
          },
          assignedNonLtdAccountsWorkflows: {
            select: {
              id: true,
              currentStage: true,
              yearEndDate: true,
              filingDueDate: true,
              isCompleted: true,
              client: {
                select: {
                  id: true,
                  clientCode: true,
                  companyName: true,
                  companyType: true
                }
              }
            }
          },
      // Client-level assignments (for clients without workflows yet)
      assignedClients: {
        where: {
          isActive: true
        },
        select: {
          id: true,
          clientCode: true,
          companyName: true,
          companyType: true,
          isVatEnabled: true,
          vatQuartersWorkflow: {
            where: {
              isCompleted: false
            },
            select: {
              id: true
            }
          },
          ltdAccountsWorkflows: {
            where: {
              isCompleted: false
            },
            select: {
              id: true
            }
          },
          nonLtdAccountsWorkflows: {
            where: {
              isCompleted: false
            },
            select: {
              id: true
            }
          }
        }
      },
      ltdCompanyAssignedClients: {
        where: {
          isActive: true
        },
        select: {
          id: true,
          clientCode: true,
          companyName: true,
          companyType: true,
          ltdAccountsWorkflows: {
            where: {
              isCompleted: false
            },
            select: {
              id: true
            }
          }
        }
      },
      nonLtdCompanyAssignedClients: {
        where: {
          isActive: true
        },
        select: {
          id: true,
          clientCode: true,
          companyName: true,
          companyType: true,
          nonLtdAccountsWorkflows: {
            where: {
              isCompleted: false
            },
            select: {
              id: true
            }
          }
        }
      }
    }
  })

  if (!user) {
    notFound()
  }

  // Process workload data for each category
  const workloadData = {
    user: {
      id: user.id,
      name: user.name || 'Unknown',
      email: user.email || '',
      role: user.role
    },
    vatClients: [
      // Workflow-level VAT assignments
      ...user.assignedVATQuarters.map(quarter => ({
        id: quarter.id,
        clientCode: quarter.client.clientCode,
        companyName: quarter.client.companyName,
        companyType: quarter.client.companyType ?? '',
        workflowId: quarter.id,
        workflowType: 'VAT_QUARTER',
        currentStage: quarter.currentStage,
        dueDate: quarter.filingDueDate ? quarter.filingDueDate.toISOString() : null,
        endDate: quarter.quarterEndDate ? quarter.quarterEndDate.toISOString() : null,
        isCompleted: quarter.isCompleted,
        hasWorkflow: true
      })),
      // Client-level VAT assignments without workflows
      ...user.assignedClients
        .filter(client => client.isVatEnabled && client.vatQuartersWorkflow.length === 0)
        .map(client => ({
          id: client.id,
          clientCode: client.clientCode,
          companyName: client.companyName,
          companyType: client.companyType ?? '',
          workflowId: null,
          workflowType: 'VAT_CLIENT',
          currentStage: 'NOT_STARTED',
          dueDate: null,
          endDate: null,
          isCompleted: false,
          hasWorkflow: false
        }))
    ],
    ltdCompanies: [
      // Workflow-level Ltd assignments (only Ltd company type)
      ...user.assignedLtdAccountsWorkflows
        .filter(workflow => workflow.client.companyType === 'LIMITED_COMPANY')
        .map(workflow => ({
          id: workflow.id,
          clientCode: workflow.client.clientCode,
          companyName: workflow.client.companyName,
          companyType: workflow.client.companyType ?? '',
          workflowId: workflow.id,
          workflowType: 'LTD_WORKFLOW',
          currentStage: workflow.currentStage,
          dueDate: workflow.accountsDueDate ? workflow.accountsDueDate.toISOString() : null,
          endDate: workflow.filingPeriodEnd ? workflow.filingPeriodEnd.toISOString() : null,
          isCompleted: workflow.isCompleted,
          hasWorkflow: true
        })),
      // Client-level Ltd assignments without workflows
      ...user.ltdCompanyAssignedClients
        .filter(client => client.ltdAccountsWorkflows.length === 0)
        .map(client => ({
          id: client.id,
          clientCode: client.clientCode,
          companyName: client.companyName,
          companyType: client.companyType ?? '',
          workflowId: null,
          workflowType: 'LTD_CLIENT',
          currentStage: 'NOT_STARTED',
          dueDate: null,
          endDate: null,
          isCompleted: false,
          hasWorkflow: false
        }))
    ],
    nonLtdCompanies: [
      // Workflow-level Non-Ltd assignments (only Non-Ltd company type)
      ...user.assignedNonLtdAccountsWorkflows
        .filter(workflow => workflow.client.companyType === 'NON_LIMITED_COMPANY')
        .map(workflow => ({
          id: workflow.id,
          clientCode: workflow.client.clientCode,
          companyName: workflow.client.companyName,
          companyType: workflow.client.companyType ?? '',
          workflowId: workflow.id,
          workflowType: 'NON_LTD_WORKFLOW',
          currentStage: workflow.currentStage,
          dueDate: workflow.filingDueDate ? workflow.filingDueDate.toISOString() : null,
          endDate: workflow.yearEndDate ? workflow.yearEndDate.toISOString() : null,
          isCompleted: workflow.isCompleted,
          hasWorkflow: true
        })),
      // Client-level Non-Ltd assignments without workflows
      ...user.nonLtdCompanyAssignedClients
        .filter(client => client.nonLtdAccountsWorkflows.length === 0)
        .map(client => ({
          id: client.id,
          clientCode: client.clientCode,
          companyName: client.companyName,
          companyType: client.companyType ?? '',
          workflowId: null,
          workflowType: 'NON_LTD_CLIENT',
          currentStage: 'NOT_STARTED',
          dueDate: null,
          endDate: null,
          isCompleted: false,
          hasWorkflow: false
        }))
    ],
          contractors: [
        // Filter all assignments for contractors
        ...[...user.assignedVATQuarters, ...user.assignedLtdAccountsWorkflows, ...user.assignedNonLtdAccountsWorkflows]
          .filter(item => item.client.companyType === 'CONTRACTOR')
          .map(item => {
            // Type-safe property access
            const isVatQuarter = 'quarterPeriod' in item
            const isLtdWorkflow = 'filingPeriodStart' in item
            const isNonLtdWorkflow = 'yearEndDate' in item
            
            return {
              id: item.id,
              clientCode: item.client.clientCode,
              companyName: item.client.companyName,
              companyType: item.client.companyType ?? '',
              workflowId: item.id,
              workflowType: isVatQuarter ? 'VAT_QUARTER' : 
                           isLtdWorkflow ? 'LTD_WORKFLOW' : 'NON_LTD_WORKFLOW',
              currentStage: item.currentStage,
              dueDate: isVatQuarter ? ((item as any).filingDueDate ? (item as any).filingDueDate.toISOString() : null) : isLtdWorkflow ? ((item as any).accountsDueDate ? (item as any).accountsDueDate.toISOString() : null) : isNonLtdWorkflow ? ((item as any).filingDueDate ? (item as any).filingDueDate.toISOString() : null) : null,
              endDate: isVatQuarter ? ((item as any).quarterEndDate ? (item as any).quarterEndDate.toISOString() : null) : isLtdWorkflow ? ((item as any).filingPeriodEnd ? (item as any).filingPeriodEnd.toISOString() : null) : isNonLtdWorkflow ? ((item as any).yearEndDate ? (item as any).yearEndDate.toISOString() : null) : null,
              isCompleted: item.isCompleted,
              hasWorkflow: true
            }
          }),
      // Client-level contractor assignments without workflows
      ...[...user.assignedClients, ...user.ltdCompanyAssignedClients, ...user.nonLtdCompanyAssignedClients]
        .filter(client =>
          client.companyType === 'CONTRACTOR' &&
          ('vatQuartersWorkflow' in client ? (client as { vatQuartersWorkflow: any[] }).vatQuartersWorkflow.length === 0 : true) &&
          ('ltdAccountsWorkflows' in client ? (client as { ltdAccountsWorkflows: any[] }).ltdAccountsWorkflows.length === 0 : true) &&
          ('nonLtdAccountsWorkflows' in client ? (client as { nonLtdAccountsWorkflows: any[] }).nonLtdAccountsWorkflows.length === 0 : true)
        )
        .map(client => ({
          id: client.id,
          clientCode: client.clientCode,
          companyName: client.companyName,
          companyType: client.companyType ?? '',
          workflowId: null,
          workflowType: 'CONTRACTOR_CLIENT',
          currentStage: 'NOT_STARTED',
          dueDate: null,
          endDate: null,
          isCompleted: false,
          hasWorkflow: false
        })),
    ],
          subContractors: [
        // Filter all assignments for sub-contractors
        ...[...user.assignedVATQuarters, ...user.assignedLtdAccountsWorkflows, ...user.assignedNonLtdAccountsWorkflows]
          .filter(item => item.client.companyType === 'SUB_CONTRACTOR')
          .map(item => {
            // Type-safe property access
            const isVatQuarter = 'quarterPeriod' in item
            const isLtdWorkflow = 'filingPeriodStart' in item
            const isNonLtdWorkflow = 'yearEndDate' in item
            
            return {
              id: item.id,
              clientCode: item.client.clientCode,
              companyName: item.client.companyName,
              companyType: item.client.companyType ?? '',
              workflowId: item.id,
              workflowType: isVatQuarter ? 'VAT_QUARTER' : 
                           isLtdWorkflow ? 'LTD_WORKFLOW' : 'NON_LTD_WORKFLOW',
              currentStage: item.currentStage,
              dueDate: isVatQuarter ? ((item as any).filingDueDate ? (item as any).filingDueDate.toISOString() : null) : isLtdWorkflow ? ((item as any).accountsDueDate ? (item as any).accountsDueDate.toISOString() : null) : isNonLtdWorkflow ? ((item as any).filingDueDate ? (item as any).filingDueDate.toISOString() : null) : null,
              endDate: isVatQuarter ? ((item as any).quarterEndDate ? (item as any).quarterEndDate.toISOString() : null) : isLtdWorkflow ? ((item as any).filingPeriodEnd ? (item as any).filingPeriodEnd.toISOString() : null) : isNonLtdWorkflow ? ((item as any).yearEndDate ? (item as any).yearEndDate.toISOString() : null) : null,
              isCompleted: item.isCompleted,
              hasWorkflow: true
            }
          }),
      // Client-level sub-contractor assignments without workflows
      ...[...user.assignedClients, ...user.ltdCompanyAssignedClients, ...user.nonLtdCompanyAssignedClients]
        .filter(client =>
          client.companyType === 'SUB_CONTRACTOR' &&
          ('vatQuartersWorkflow' in client ? (client as { vatQuartersWorkflow: any[] }).vatQuartersWorkflow.length === 0 : true) &&
          ('ltdAccountsWorkflows' in client ? (client as { ltdAccountsWorkflows: any[] }).ltdAccountsWorkflows.length === 0 : true) &&
          ('nonLtdAccountsWorkflows' in client ? (client as { nonLtdAccountsWorkflows: any[] }).nonLtdAccountsWorkflows.length === 0 : true)
        )
        .map(client => ({
          id: client.id,
          clientCode: client.clientCode,
          companyName: client.companyName,
          companyType: client.companyType ?? '',
          workflowId: null,
          workflowType: 'SUB_CONTRACTOR_CLIENT',
          currentStage: 'NOT_STARTED',
          dueDate: null,
          endDate: null,
          isCompleted: false,
          hasWorkflow: false
        }))
    ]
  }

  return (
    <PageLayout maxWidth="xl">
      <PageHeader 
        title={`${user.name}'s Workload`}
        description={`Detailed workload breakdown for ${user.name}`}
      />
      <PageContent>
        <IndividualWorkloadView workloadData={workloadData} />
      </PageContent>
    </PageLayout>
  )
} 