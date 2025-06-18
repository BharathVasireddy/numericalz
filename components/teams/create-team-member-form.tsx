'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { showToast } from '@/lib/toast'
import { UserPlus, Save, X, Crown, Shield, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface CreateTeamMemberFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function CreateTeamMemberForm({ onSuccess, onCancel }: CreateTeamMemberFormProps) {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.password) {
      showToast.error('Please fill in all required fields')
      return
    }

    if (formData.password.length < 8) {
      showToast.error('Password must be at least 8 characters long')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        showToast.success('Team member created successfully')
        onSuccess()
      } else {
        showToast.error(data.error || 'Failed to create team member')
      }
    } catch (error) {
      showToast.error('Failed to create team member')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Get role options based on current user's role
  const getRoleOptions = () => {
    const options = [
      {
        value: 'STAFF',
        label: 'Staff Member',
        icon: User,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        description: 'Can manage assigned clients'
      },
      {
        value: 'MANAGER',
        label: 'Manager',
        icon: Shield,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        description: 'Full system access and client management'
      }
    ]

    // Only PARTNER users can create other PARTNER users
    if (session?.user?.role === 'PARTNER') {
      options.push({
        value: 'PARTNER',
        label: 'Partner',
        icon: Crown,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        description: 'Highest level access and system oversight'
      })
    }

    return options
  }

  const roleOptions = getRoleOptions()
  const selectedRole = roleOptions.find(option => option.value === formData.role)

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Add Team Member
        </DialogTitle>
        <DialogDescription>
          Create a new team member account. They will be able to log in and manage assigned clients.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter full name"
            required
            className="input-field"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter email address"
            required
            className="input-field"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Enter password (min. 8 characters)"
            required
            minLength={8}
            className="input-field"
          />
          <p className="text-xs text-muted-foreground">
            Password must be at least 8 characters long
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role *</Label>
          <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
            <SelectTrigger className="input-field">
              <SelectValue placeholder="Select role">
                {selectedRole && (
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-full ${selectedRole.bgColor}`}>
                      <selectedRole.icon className={`h-3 w-3 ${selectedRole.color}`} />
                    </div>
                    <span>{selectedRole.label}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-3 py-1">
                    <div className={`p-1.5 rounded-full ${option.bgColor}`}>
                      <option.icon className={`h-3 w-3 ${option.color}`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRole && (
            <p className="text-xs text-muted-foreground">
              {selectedRole.description}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="btn-outline"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Member
              </>
            )}
          </Button>
        </div>
      </form>
    </>
  )
} 