'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { showToast } from '@/lib/toast'
import { Save, X, User, Mail, Shield, Key, AlertTriangle, Crown } from 'lucide-react'
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
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { PasswordResetModal } from './password-reset-modal'

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

interface EditTeamMemberFormProps {
  user: TeamMember
  onSuccess: () => void
  onCancel: () => void
}

export function EditTeamMemberForm({ user, onSuccess, onCancel }: EditTeamMemberFormProps) {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  
  // Check if current user is editing themselves
  const isEditingSelf = session?.user?.id === user.id

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.role) {
      newErrors.role = 'Role is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        showToast.success('Team member updated successfully')
        onSuccess()
      } else {
        const data = await response.json()
        showToast.error(data.error || 'Failed to update team member')
      }
    } catch (error) {
      showToast.error('Failed to update team member')
    } finally {
      setIsLoading(false)
    }
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

    // Only PARTNER users can edit PARTNER role
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

  const handlePasswordReset = () => {
    setShowPasswordResetModal(true)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Edit Team Member
        </DialogTitle>
        <DialogDescription>
          Update team member details and permissions.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Full Name *
          </Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="input-field"
            placeholder="Enter full name"
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address *
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="input-field"
            placeholder="Enter email address"
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Role *
          </Label>
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
          {errors.role && (
            <p className="text-sm text-red-600">{errors.role}</p>
          )}
          {selectedRole && (
            <p className="text-xs text-muted-foreground">
              {selectedRole.description}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="isActive" className="flex items-center gap-2">
            Status
            {isEditingSelf && (
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            )}
          </Label>
          <Select 
            value={formData.isActive.toString()} 
            onValueChange={(value) => handleInputChange('isActive', value === 'true')}
            disabled={isEditingSelf && formData.isActive}
          >
            <SelectTrigger className="input-field">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false" disabled={isEditingSelf}>
                Inactive
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {isEditingSelf 
              ? "You cannot deactivate your own account. Contact another manager if needed."
              : "Inactive users cannot access the system but their data is preserved."
            }
          </p>
        </div>

        {/* Password Reset Section */}
        <div className="space-y-2 pt-2 border-t">
          <Label className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Password Management
          </Label>
          <Button
            type="button"
            variant="outline"
            onClick={handlePasswordReset}
            disabled={isLoading}
            className="w-full flex items-center gap-2"
          >
            <Key className="h-4 w-4" />
            Reset Password
          </Button>
          <p className="text-xs text-muted-foreground">
            Generate a new temporary password for this user. The password will be displayed once.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="btn-outline flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="btn-primary flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Update Member
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Password Reset Modal */}
      <PasswordResetModal
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
        user={{
          id: user.id,
          name: user.name,
          email: user.email
        }}
      />
    </>
  )
} 