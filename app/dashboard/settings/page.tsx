'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import { Loader2, Save, Settings as SettingsIcon } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface UserSettings {
  id?: string
  defaultAssigneeId?: string
  emailNotifications: boolean
  smsNotifications: boolean
}

/**
 * Settings page for partners to configure default assignments and preferences
 * 
 * Note: Authentication and role checking is handled by middleware and dashboard layout
 */
export default function SettingsPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: true,
    smsNotifications: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load data when session is available
  useEffect(() => {
    if (session?.user?.role === 'PARTNER') {
      fetchUsers()
      fetchSettings()
    } else {
      setLoading(false) // Stop loading for non-partners
    }
  }, [session])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users/staff')
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      })
    }
  }

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/${session?.user?.id}/settings`)
      const data = await response.json()
      
      if (data.success && data.settings) {
        // Ensure defaultAssigneeId is properly handled (null/undefined/empty string -> undefined)
        const cleanSettings = {
          ...data.settings,
          defaultAssigneeId: data.settings.defaultAssigneeId || undefined
        }
        setSettings(cleanSettings)
        console.log('Fetched settings:', cleanSettings) // Debug log
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/users/${session?.user?.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Settings Saved',
          description: 'Your preferences have been updated successfully.'
        })
      } else {
        throw new Error(data.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // Show access restricted for non-partners (session is guaranteed to exist by layout)
  if (session?.user?.role !== 'PARTNER') {
    return (
      <div className="page-container">
        <div className="content-wrapper">
          <div className="content-sections">
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <SettingsIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Access Restricted</h3>
                  <p className="text-muted-foreground">Only partners can access settings.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Show loading for partners while fetching data
  if (loading) {
    return (
      <div className="page-container">
        <div className="content-wrapper">
          <div className="content-sections">
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main settings content - only shown to partners after loading
  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="content-sections">
          <div className="page-header">
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-muted-foreground">
                Manage your preferences and default assignments
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Default Client Assignment */}
            <Card>
              <CardHeader>
                <CardTitle>Default Client Assignment</CardTitle>
                <CardDescription>
                  Override automatic assignment: Choose who new clients should be assigned to instead of the creator
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultAssignee">Default Assignee (Optional)</Label>
                  <Select
                    value={settings.defaultAssigneeId || "AUTO_ASSIGN"}
                    onValueChange={(value) => {
                      console.log('Select value changed to:', value) // Debug log
                      setSettings(prev => ({ 
                        ...prev, 
                        defaultAssigneeId: value === "AUTO_ASSIGN" ? undefined : (value || undefined)
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-assign to creator (recommended)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTO_ASSIGN">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Auto-assign to creator</span>
                          <span className="text-xs text-muted-foreground">(Default)</span>
                        </div>
                      </SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    <strong>Default behavior:</strong> New clients are automatically assigned to whoever creates them. 
                    Select a specific user here to override this and always assign to that person instead.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Configure how you want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="smsNotifications">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via SMS (coming soon)
                    </p>
                  </div>
                  <Switch
                    id="smsNotifications"
                    checked={settings.smsNotifications}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, smsNotifications: checked }))
                    }
                    disabled
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={saveSettings} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 