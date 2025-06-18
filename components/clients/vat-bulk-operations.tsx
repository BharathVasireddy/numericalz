'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  CheckSquare, 
  Square,
  TrendingUp, 
  UserPlus, 
  Calendar,
  Loader2,
  AlertTriangle,
  CheckCircle,
  FileText,
  Target,
  Mail,
  Clock
} from 'lucide-react'
import { showToast } from '@/lib/toast'
import { VAT_WORKFLOW_STAGE_NAMES } from '@/lib/vat-workflow'

interface VATClient {
  id: string
  clientCode: string
  companyName: string
  vatQuarterGroup?: string
  isVatEnabled: boolean
  assignedUser?: {
    id: string
    name: string
    email: string
  }
  currentVATQuarter?: {
    id: string
    quarterPeriod: string
    currentStage: string
    isCompleted: boolean
    assignedUser?: {
      id: string
      name: string
      email: string
    }
  }
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface VATBulkOperationsProps {
  clients: VATClient[]
  availableUsers: User[]
  onComplete: () => void
}

type BulkOperation = 'CREATE_QUARTERS' | 'UPDATE_STAGES' | 'ASSIGN_USERS'

export function VATBulkOperations({ clients, availableUsers, onComplete }: VATBulkOperationsProps) {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation>('CREATE_QUARTERS')
  const [selectedStage, setSelectedStage] = useState('')
  const [selectedAssignee, setSelectedAssignee] = useState('')
  const [comments, setComments] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<any>(null)

  // Filter clients based on operation
  const getEligibleClients = () => {
    switch (selectedOperation) {
      case 'CREATE_QUARTERS':
        return clients.filter(client => 
          client.isVatEnabled && 
          client.vatQuarterGroup && 
          !client.currentVATQuarter
        )
      case 'UPDATE_STAGES':
        return clients.filter(client => 
          client.currentVATQuarter && 
          !client.currentVATQuarter.isCompleted
        )
      case 'ASSIGN_USERS':
        return clients.filter(client => client.currentVATQuarter)
      default:
        return []
    }
  }

  const eligibleClients = getEligibleClients()

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedClients.size === eligibleClients.length) {
      setSelectedClients(new Set())
    } else {
      setSelectedClients(new Set(eligibleClients.map(c => c.id)))
    }
  }

  // Handle individual client selection
  const handleClientSelect = (clientId: string) => {
    const newSelected = new Set(selectedClients)
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId)
    } else {
      newSelected.add(clientId)
    }
    setSelectedClients(newSelected)
  }

  // Reset form when operation changes
  useEffect(() => {
    setSelectedClients(new Set())
    setSelectedStage('')
    setSelectedAssignee('')
    setComments('')
    setResults(null)
  }, [selectedOperation])

  // Execute bulk operation
  const handleExecute = async () => {
    if (selectedClients.size === 0) {
      showToast.error('Please select at least one client')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setResults(null)

    try {
      let requestData: any = {}

      switch (selectedOperation) {
        case 'CREATE_QUARTERS':
          requestData = {
            operation: 'CREATE_QUARTERS',
            data: {
              clientIds: Array.from(selectedClients)
            }
          }
          break
        case 'UPDATE_STAGES':
          if (!selectedStage) {
            showToast.error('Please select a workflow stage')
            setIsProcessing(false)
            return
          }
          requestData = {
            operation: 'UPDATE_STAGES',
            data: {
              vatQuarterIds: Array.from(selectedClients).map(clientId => {
                const client = clients.find(c => c.id === clientId)
                return client?.currentVATQuarter?.id
              }).filter(Boolean),
              stage: selectedStage,
              comments: comments.trim() || undefined
            }
          }
          break
        case 'ASSIGN_USERS':
          if (!selectedAssignee || selectedAssignee === 'unassigned') {
            showToast.error('Please select a user to assign')
            setIsProcessing(false)
            return
          }
          requestData = {
            operation: 'ASSIGN_USERS',
            data: {
              vatQuarterIds: Array.from(selectedClients).map(clientId => {
                const client = clients.find(c => c.id === clientId)
                return client?.currentVATQuarter?.id
              }).filter(Boolean),
              assignedUserId: selectedAssignee
            }
          }
          break
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/vat-quarters/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      clearInterval(progressInterval)
      setProgress(100)

      const data = await response.json()

      if (data.success) {
        setResults(data.data)
        showToast.success(`Bulk operation completed successfully! ${data.data.summary.successful} of ${data.data.summary.total} operations succeeded.`)
        onComplete()
      } else {
        showToast.error(data.error || 'Bulk operation failed')
      }
    } catch (error) {
      console.error('Error executing bulk operation:', error)
      showToast.error('Failed to execute bulk operation')
    } finally {
      setIsProcessing(false)
    }
  }

  const getOperationDescription = () => {
    switch (selectedOperation) {
      case 'CREATE_QUARTERS':
        return 'Create new VAT quarters for selected clients based on their quarter groups'
      case 'UPDATE_STAGES':
        return 'Update workflow stage for selected VAT quarters'
      case 'ASSIGN_USERS':
        return 'Assign users to selected VAT quarters'
      default:
        return ''
    }
  }

  const getStageIcon = (stage: string) => {
    const stageMap: { [key: string]: React.ReactNode } = {
      'CLIENT_BOOKKEEPING': <FileText className="h-4 w-4" />,
      'WORK_IN_PROGRESS': <TrendingUp className="h-4 w-4" />,
      'QUERIES_PENDING': <AlertTriangle className="h-4 w-4" />,
      'REVIEW_PENDING_MANAGER': <Users className="h-4 w-4" />,
      'REVIEW_PENDING_PARTNER': <Target className="h-4 w-4" />,
      'EMAILED_TO_PARTNER': <Mail className="h-4 w-4" />,
      'EMAILED_TO_CLIENT': <Mail className="h-4 w-4" />,
      'CLIENT_APPROVED': <CheckCircle className="h-4 w-4" />,
      'FILED_TO_HMRC': <CheckCircle className="h-4 w-4" />
    }
    return stageMap[stage] || <Clock className="h-4 w-4" />
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Bulk Operations
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            VAT Bulk Operations
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Operation Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Operation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant={selectedOperation === 'CREATE_QUARTERS' ? 'default' : 'outline'}
                  onClick={() => setSelectedOperation('CREATE_QUARTERS')}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <Calendar className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Create Quarters</div>
                    <div className="text-xs text-muted-foreground">Generate new VAT quarters</div>
                  </div>
                </Button>
                <Button
                  variant={selectedOperation === 'UPDATE_STAGES' ? 'default' : 'outline'}
                  onClick={() => setSelectedOperation('UPDATE_STAGES')}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <TrendingUp className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Update Stages</div>
                    <div className="text-xs text-muted-foreground">Change workflow stages</div>
                  </div>
                </Button>
                <Button
                  variant={selectedOperation === 'ASSIGN_USERS' ? 'default' : 'outline'}
                  onClick={() => setSelectedOperation('ASSIGN_USERS')}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <UserPlus className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Assign Users</div>
                    <div className="text-xs text-muted-foreground">Bulk user assignment</div>
                  </div>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                {getOperationDescription()}
              </p>
            </CardContent>
          </Card>

          {/* Operation-specific Configuration */}
          {selectedOperation === 'UPDATE_STAGES' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stage Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stage">New Workflow Stage</Label>
                  <Select value={selectedStage} onValueChange={setSelectedStage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(VAT_WORKFLOW_STAGE_NAMES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            {getStageIcon(key)}
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comments">Comments (Optional)</Label>
                  <Textarea
                    id="comments"
                    placeholder="Add comments for this bulk stage update..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {selectedOperation === 'ASSIGN_USERS' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User Assignment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="assignee">Assign To</Label>
                  <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {user.name} ({user.role})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Client Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Client Selection
                <div className="flex items-center gap-2">
                  <span className="text-sm font-normal text-muted-foreground">
                    {selectedClients.size} of {eligibleClients.length} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs"
                  >
                    {selectedClients.size === eligibleClients.length ? (
                      <>
                        <Square className="h-3 w-3 mr-1" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-3 w-3 mr-1" />
                        Select All
                      </>
                    )}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eligibleClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  <p>No eligible clients found for this operation</p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {eligibleClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center gap-3 p-2 border rounded hover:bg-accent cursor-pointer"
                      onClick={() => handleClientSelect(client.id)}
                    >
                      <Checkbox
                        checked={selectedClients.has(client.id)}
                        onChange={() => handleClientSelect(client.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{client.companyName}</div>
                        <div className="text-sm text-muted-foreground">
                          {client.clientCode}
                          {client.currentVATQuarter && (
                            <span className="ml-2">
                              • Current: {VAT_WORKFLOW_STAGE_NAMES[client.currentVATQuarter.currentStage as keyof typeof VAT_WORKFLOW_STAGE_NAMES]}
                            </span>
                          )}
                          {client.assignedUser && (
                            <span className="ml-2">
                              • Assigned: {client.assignedUser.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress */}
          {isProcessing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground mt-2">
                  Executing bulk operation on {selectedClients.size} clients...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Operation Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{results.summary.successful}</div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{results.summary.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{results.summary.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>

                {results.errors && results.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-red-600 mb-2">Errors:</h4>
                    <div className="space-y-1">
                      {results.errors.map((error: any, index: number) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          Client ID: {error.clientId || error.vatQuarterId} - {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            
            <Button 
              onClick={handleExecute}
              disabled={selectedClients.size === 0 || isProcessing}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Execute Operation ({selectedClients.size} clients)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}