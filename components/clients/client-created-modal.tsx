'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Edit, Eye, Building2, Hash, Calendar, Plus, UserPlus } from 'lucide-react'

interface ClientCreatedModalProps {
  isOpen: boolean
  onClose: () => void
  client: {
    id: string
    companyName: string
    companyNumber?: string
    clientCode: string
    createdAt: string
  }
}

export function ClientCreatedModal({ isOpen, onClose, client }: ClientCreatedModalProps) {
  const router = useRouter()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleEditClient = () => {
    onClose()
    router.push(`/dashboard/clients/${client.id}/edit`)
  }

  const handleClose = () => {
    onClose()
    router.push(`/dashboard/clients/${client.id}`)
  }

  const handleAddAnother = () => {
    onClose()
    router.push('/dashboard/clients/add')
  }

  const handleAssignUser = () => {
    onClose()
    router.push(`/dashboard/clients/${client.id}?action=assign`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Client Successfully Created
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Success Message */}
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">
              Your new client has been added to the system and is ready for management
            </p>
          </div>

          {/* Client Details Card */}
          <Card className="shadow-professional">
            <CardContent className="p-4 space-y-3">
              {/* Company Name */}
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Company Name</p>
                  <p className="text-sm font-medium text-black break-words">
                    {client.companyName}
                  </p>
                </div>
              </div>

              {/* Company Number */}
              {client.companyNumber && (
                <div className="flex items-start gap-3">
                  <Hash className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Company Number</p>
                    <p className="text-sm font-medium text-black font-mono">
                      {client.companyNumber}
                    </p>
                  </div>
                </div>
              )}

              {/* Client Code */}
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Client Code</p>
                  <p className="text-sm font-medium text-black font-mono">
                    {client.clientCode}
                  </p>
                </div>
              </div>

              {/* Created Date */}
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Added On</p>
                  <p className="text-sm font-medium text-black">
                    {formatDate(client.createdAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Primary Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleClose}
              className="btn-primary flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Client
            </Button>
            <Button
              onClick={handleEditClient}
              variant="outline"
              className="btn-outline flex-1"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Details
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleAssignUser}
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Assign User
            </Button>
            <Button
              onClick={handleAddAnother}
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Another
            </Button>
          </div>

          {/* Next Steps Tip */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-medium text-blue-800 mb-1">💡 What's Next?</p>
            <p className="text-xs text-blue-700">
              View the client to see their complete profile, assign team members, or set up deadlines and reminders.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 