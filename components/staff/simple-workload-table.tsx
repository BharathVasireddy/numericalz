'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { 
  Crown,
  Shield,
  User,
  Building2,
  FileText,
  Receipt,
  Users,
  Calculator,
  Settings,
  Eye,
  Clock,
  Mail,
  BarChart3,
  Activity
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface WorkloadCounts {
  active: number
  inactive: number
}

interface WorkloadData {
  id: string
  name: string
  email: string
  role: string
  vatClients: WorkloadCounts
  ltdCompanies: WorkloadCounts
  nonLtdCompanies: WorkloadCounts
  contractors: WorkloadCounts
  subContractors: WorkloadCounts
  total: WorkloadCounts
}

interface SimpleWorkloadTableProps {
  workloadData: WorkloadData[]
}

export function SimpleWorkloadTable({ workloadData }: SimpleWorkloadTableProps) {
  const router = useRouter()
  
  // Calculate totals across all team members
  const calculateTotals = () => {
    const totals = {
      vatClients: { active: 0, inactive: 0 },
      ltdCompanies: { active: 0, inactive: 0 },
      nonLtdCompanies: { active: 0, inactive: 0 },
      contractors: { active: 0, inactive: 0 },
      subContractors: { active: 0, inactive: 0 },
      total: { active: 0, inactive: 0 }
    }
    
    workloadData.forEach(member => {
      totals.vatClients.active += member.vatClients.active
      totals.vatClients.inactive += member.vatClients.inactive
      totals.ltdCompanies.active += member.ltdCompanies.active
      totals.ltdCompanies.inactive += member.ltdCompanies.inactive
      totals.nonLtdCompanies.active += member.nonLtdCompanies.active
      totals.nonLtdCompanies.inactive += member.nonLtdCompanies.inactive
      totals.contractors.active += member.contractors.active
      totals.contractors.inactive += member.contractors.inactive
      totals.subContractors.active += member.subContractors.active
      totals.subContractors.inactive += member.subContractors.inactive
      totals.total.active += member.total.active
      totals.total.inactive += member.total.inactive
    })
    
    return totals
  }
  
  const teamTotals = calculateTotals()
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'PARTNER':
        return <Crown className="h-4 w-4 text-purple-600" />
      case 'MANAGER':
        return <Shield className="h-4 w-4 text-blue-600" />
      case 'STAFF':
        return <User className="h-4 w-4 text-gray-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const formatCount = (counts: WorkloadCounts, type: string) => {
    if (counts.inactive === 0) {
      return <span className="font-medium">{counts.active}</span>
    }
    
    const tooltipText = `Inactive workflows: ${counts.inactive}
    
This includes:
• Workflows in "Not Started" stage
• Workflows in "Waiting for Year End" stage
• Clients assigned but without workflows yet`

    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="font-medium cursor-help">
              {counts.active}
              <span className="text-xs text-muted-foreground ml-1">
                ({counts.inactive})
              </span>
            </span>
          </TooltipTrigger>
          <TooltipContent 
            className="max-w-xs whitespace-pre-line bg-white text-black border border-gray-200 shadow-lg"
            side="top"
          >
            <p className="text-sm">{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const handleViewWorkload = (member: WorkloadData) => {
    router.push(`/dashboard/staff/workload/${member.id}`)
  }

  const handleViewUserLog = (member: WorkloadData) => {
    router.push(`/dashboard/staff/user-log/${member.id}`)
  }

  const handleSendReminder = (member: WorkloadData) => {
    // TODO: Implement send reminder functionality
    console.log('Send reminder to:', member.name)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Workload
        </CardTitle>
        <CardDescription>
          Active workflows shown as main count, inactive workflows shown in smaller brackets
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="table-container">
          <Table className="data-table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Team Member</TableHead>
                <TableHead className="w-24 text-center">VAT</TableHead>
                <TableHead className="w-24 text-center">Ltd</TableHead>
                <TableHead className="w-24 text-center">Non-Ltd</TableHead>
                <TableHead className="w-24 text-center">Contractors</TableHead>
                <TableHead className="w-24 text-center">Sub-C</TableHead>
                <TableHead className="w-24 text-center font-bold bg-blue-100">Total</TableHead>
                <TableHead className="w-16 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workloadData.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {getRoleIcon(member.role)}
                      <div>
                        <div className="font-medium truncate-text" title={member.name}>
                          {member.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate-text" title={member.email}>
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {formatCount(member.vatClients, 'VAT')}
                  </TableCell>
                  <TableCell className="text-center">
                    {formatCount(member.ltdCompanies, 'Ltd')}
                  </TableCell>
                  <TableCell className="text-center">
                    {formatCount(member.nonLtdCompanies, 'Non-Ltd')}
                  </TableCell>
                  <TableCell className="text-center">
                    {formatCount(member.contractors, 'Contractor')}
                  </TableCell>
                  <TableCell className="text-center">
                    {formatCount(member.subContractors, 'Sub-Contractor')}
                  </TableCell>
                  <TableCell className="text-center font-bold bg-blue-100">
                    {formatCount(member.total, 'Total')}
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="action-trigger-button h-8 w-8 p-0">
                          <Settings className="action-trigger-icon h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem 
                          onClick={() => handleViewWorkload(member)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <BarChart3 className="h-4 w-4" />
                          View Workload
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleViewUserLog(member)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Activity className="h-4 w-4" />
                          View User Log
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleSendReminder(member)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Mail className="h-4 w-4" />
                          Send Reminder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Team Totals Row */}
              <TableRow className="border-t-2 border-gray-300 bg-blue-50">
                <TableCell className="font-bold">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-gray-600" />
                    <span>Team Totals</span>
                  </div>
                </TableCell>
                <TableCell className="text-center font-bold">
                  {formatCount(teamTotals.vatClients, 'VAT')}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {formatCount(teamTotals.ltdCompanies, 'Ltd')}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {formatCount(teamTotals.nonLtdCompanies, 'Non-Ltd')}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {formatCount(teamTotals.contractors, 'Contractor')}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {formatCount(teamTotals.subContractors, 'Sub-Contractor')}
                </TableCell>
                <TableCell className="text-center font-bold bg-blue-200">
                  {formatCount(teamTotals.total, 'Total')}
                </TableCell>
                <TableCell className="text-center">
                  {/* Empty cell for actions column */}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
} 