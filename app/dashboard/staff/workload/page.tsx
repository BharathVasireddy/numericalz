import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { SimpleWorkloadTable } from '@/components/staff/simple-workload-table'

export const metadata: Metadata = {
  title: 'Staff Workload - Numericalz',
  description: 'View team member assignments',
}

/**
 * Staff Workload page - for viewing team member assignments
 * 
 * - PARTNER: Can view all staff workload
 * - MANAGER: Cannot access (redirected)
 * - STAFF: Cannot access (redirected)
 */
export default async function StaffWorkloadPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/login')
  }

  // Only partners can access this page
  if (session.user.role !== 'PARTNER') {
    redirect('/dashboard')
  }

  // Get all users with their assignments (both workflow-level and client-level)
  const users = await db.user.findMany({
    where: {
      role: {
        in: ['STAFF', 'MANAGER', 'PARTNER']
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      // Workflow-level assignments
      assignedVATQuarters: {
        where: {
          isCompleted: false
        },
        select: {
          id: true,
          currentStage: true,
          client: {
            select: {
              id: true,
              companyType: true
            }
          }
        }
      },
      assignedLtdAccountsWorkflows: {
        where: {
          isCompleted: false
        },
        select: {
          id: true,
          currentStage: true,
          client: {
            select: {
              id: true,
              companyType: true
            }
          }
        }
      },
      assignedNonLtdAccountsWorkflows: {
        where: {
          isCompleted: false
        },
        select: {
          id: true,
          currentStage: true,
          client: {
            select: {
              id: true,
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
    },
    orderBy: [
      { role: 'asc' },
      { name: 'asc' }
    ]
  })

  // Process workload data with active/inactive breakdown
  const workloadData = users.map(user => {
    // Helper function to count active vs inactive workflows
    const countWorkflows = (workflows: any[]) => {
      const active = workflows.filter(w => 
        w.currentStage !== 'NOT_STARTED' && 
        w.currentStage !== 'WAITING_FOR_YEAR_END'
      ).length
      const inactive = workflows.filter(w => 
        w.currentStage === 'NOT_STARTED' || 
        w.currentStage === 'WAITING_FOR_YEAR_END'
      ).length
      return { active, inactive }
    }

    // Helper function to count by client type
    const countByClientType = (workflows: any[], clientType: string) => {
      const filteredWorkflows = workflows.filter(w => w.client.companyType === clientType)
      return countWorkflows(filteredWorkflows)
    }

    // Helper function to count clients without workflows (client-level assignments)
    const countClientsWithoutWorkflows = (clients: any[], workflowField: string) => {
      return clients.filter(client => client[workflowField].length === 0).length
    }

    // Get all workflows for this user
    const allVATWorkflows = user.assignedVATQuarters
    const allLtdWorkflows = user.assignedLtdAccountsWorkflows
    const allNonLtdWorkflows = user.assignedNonLtdAccountsWorkflows

    // Count VAT clients (workflow-level + client-level without workflows)
    const vatWorkflowCounts = countWorkflows(allVATWorkflows)
    const vatClientsWithoutWorkflows = user.assignedClients.filter(client => 
      client.isVatEnabled && client.vatQuartersWorkflow.length === 0
    ).length
    const vatCounts = {
      active: vatWorkflowCounts.active,
      inactive: vatWorkflowCounts.inactive + vatClientsWithoutWorkflows
    }
    
    // Count Ltd companies (workflow-level + client-level without workflows)
    const ltdWorkflowCounts = countWorkflows(allLtdWorkflows)
    const ltdClientsWithoutWorkflows = user.ltdCompanyAssignedClients.filter(client => 
      client.ltdAccountsWorkflows.length === 0
    ).length
    const ltdCounts = {
      active: ltdWorkflowCounts.active,
      inactive: ltdWorkflowCounts.inactive + ltdClientsWithoutWorkflows
    }
    
    // Count Non-Ltd companies (workflow-level + client-level without workflows)
    const nonLtdWorkflowCounts = countWorkflows(allNonLtdWorkflows)
    const nonLtdClientsWithoutWorkflows = user.nonLtdCompanyAssignedClients.filter(client => 
      client.nonLtdAccountsWorkflows.length === 0
    ).length
    const nonLtdCounts = {
      active: nonLtdWorkflowCounts.active,
      inactive: nonLtdWorkflowCounts.inactive + nonLtdClientsWithoutWorkflows
    }
    
    // Count contractors (from all workflows + client-level assignments)
    const allWorkflowsForContractors = [...allVATWorkflows, ...allLtdWorkflows, ...allNonLtdWorkflows]
    const contractorWorkflowCounts = countByClientType(allWorkflowsForContractors, 'CONTRACTOR')
    
    // Count contractors from client-level assignments without workflows
    const contractorClientsWithoutWorkflows = [
      ...user.assignedClients.filter(client => 
        client.companyType === 'CONTRACTOR' && 
        client.vatQuartersWorkflow.length === 0 && 
        client.ltdAccountsWorkflows.length === 0 && 
        client.nonLtdAccountsWorkflows.length === 0
      ),
      ...user.ltdCompanyAssignedClients.filter(client => 
        client.companyType === 'CONTRACTOR' && 
        client.ltdAccountsWorkflows.length === 0
      ),
      ...user.nonLtdCompanyAssignedClients.filter(client => 
        client.companyType === 'CONTRACTOR' && 
        client.nonLtdAccountsWorkflows.length === 0
      )
    ].length
    
    const contractorCounts = {
      active: contractorWorkflowCounts.active,
      inactive: contractorWorkflowCounts.inactive + contractorClientsWithoutWorkflows
    }
    
    // Count sub-contractors (from all workflows + client-level assignments)
    const subContractorWorkflowCounts = countByClientType(allWorkflowsForContractors, 'SUB_CONTRACTOR')
    
    // Count sub-contractors from client-level assignments without workflows
    const subContractorClientsWithoutWorkflows = [
      ...user.assignedClients.filter(client => 
        client.companyType === 'SUB_CONTRACTOR' && 
        client.vatQuartersWorkflow.length === 0 && 
        client.ltdAccountsWorkflows.length === 0 && 
        client.nonLtdAccountsWorkflows.length === 0
      ),
      ...user.ltdCompanyAssignedClients.filter(client => 
        client.companyType === 'SUB_CONTRACTOR' && 
        client.ltdAccountsWorkflows.length === 0
      ),
      ...user.nonLtdCompanyAssignedClients.filter(client => 
        client.companyType === 'SUB_CONTRACTOR' && 
        client.nonLtdAccountsWorkflows.length === 0
      )
    ].length
    
    const subContractorCounts = {
      active: subContractorWorkflowCounts.active,
      inactive: subContractorWorkflowCounts.inactive + subContractorClientsWithoutWorkflows
    }

    const totalActive = vatCounts.active + ltdCounts.active + nonLtdCounts.active + contractorCounts.active + subContractorCounts.active
    const totalInactive = vatCounts.inactive + ltdCounts.inactive + nonLtdCounts.inactive + contractorCounts.inactive + subContractorCounts.inactive

    return {
      id: user.id,
      name: user.name || 'Unknown',
      email: user.email || '',
      role: user.role,
      vatClients: { active: vatCounts.active, inactive: vatCounts.inactive },
      ltdCompanies: { active: ltdCounts.active, inactive: ltdCounts.inactive },
      nonLtdCompanies: { active: nonLtdCounts.active, inactive: nonLtdCounts.inactive },
      contractors: { active: contractorCounts.active, inactive: contractorCounts.inactive },
      subContractors: { active: subContractorCounts.active, inactive: subContractorCounts.inactive },
      total: { active: totalActive, inactive: totalInactive }
    }
  })

  return (
    <PageLayout maxWidth="xl">
      <PageHeader 
        title="Staff Workload"
        description="View team member workflow assignments"
      />
      <PageContent>
        <SimpleWorkloadTable workloadData={workloadData} />
      </PageContent>
    </PageLayout>
  )
} 