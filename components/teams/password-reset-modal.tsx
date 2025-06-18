'use client'

import { useState } from 'react'
import { showToast } from '@/lib/toast'
import { Key, Copy, Eye, EyeOff, RefreshCw, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

interface PasswordResetModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    id: string
    name: string
    email: string
  }
}

interface PasswordConfig {
  length: number
  includeUppercase: boolean
  includeLowercase: boolean
  includeNumbers: boolean
  includeSymbols: boolean
}

export function PasswordResetModal({ isOpen, onClose, user }: PasswordResetModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [passwordConfig, setPasswordConfig] = useState<PasswordConfig>({
    length: 8,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: false
  })

  const handleGeneratePassword = async () => {
    // Validate configuration
    const hasAtLeastOneType = passwordConfig.includeUppercase || 
                             passwordConfig.includeLowercase || 
                             passwordConfig.includeNumbers || 
                             passwordConfig.includeSymbols

    if (!hasAtLeastOneType) {
      showToast.error('Please select at least one character type')
      return
    }

    if (passwordConfig.length < 4 || passwordConfig.length > 50) {
      showToast.error('Password length must be between 4 and 50 characters')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sendEmail: false,
          passwordConfig 
        })
      })

      if (response.ok) {
        const data = await response.json()
        setGeneratedPassword(data.tempPassword)
        showToast.success('Password generated successfully')
      } else {
        const data = await response.json()
        showToast.error(data.error || 'Failed to generate password')
      }
    } catch (error) {
      showToast.error('Failed to generate password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyPassword = async () => {
    if (!generatedPassword) return
    
    try {
      await navigator.clipboard.writeText(generatedPassword)
      showToast.success('Password copied to clipboard')
    } catch (error) {
      showToast.error('Failed to copy password')
    }
  }

  const handleClose = () => {
    setGeneratedPassword('')
    setShowPassword(false)
    setShowAdvanced(false)
    onClose()
  }

  const updateConfig = (key: keyof PasswordConfig, value: number | boolean) => {
    setPasswordConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Reset Password for {user.name}
          </DialogTitle>
          <DialogDescription>
            Generate a new temporary password for this user. The password will be displayed once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Password Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Password Settings</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="h-8 px-2"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  {showAdvanced ? 'Simple' : 'Advanced'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Length */}
              <div className="space-y-2">
                <Label htmlFor="length">Password Length</Label>
                <Input
                  id="length"
                  type="number"
                  min="4"
                  max="50"
                  value={passwordConfig.length}
                  onChange={(e) => updateConfig('length', parseInt(e.target.value) || 8)}
                  className="w-20"
                />
              </div>

              {showAdvanced && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Character Types</Label>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="lowercase" className="text-sm">Lowercase (a-z)</Label>
                      <Switch
                        id="lowercase"
                        checked={passwordConfig.includeLowercase}
                        onCheckedChange={(checked) => updateConfig('includeLowercase', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="uppercase" className="text-sm">Uppercase (A-Z)</Label>
                      <Switch
                        id="uppercase"
                        checked={passwordConfig.includeUppercase}
                        onCheckedChange={(checked) => updateConfig('includeUppercase', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="numbers" className="text-sm">Numbers (0-9)</Label>
                      <Switch
                        id="numbers"
                        checked={passwordConfig.includeNumbers}
                        onCheckedChange={(checked) => updateConfig('includeNumbers', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="symbols" className="text-sm">Symbols (!@#$%...)</Label>
                      <Switch
                        id="symbols"
                        checked={passwordConfig.includeSymbols}
                        onCheckedChange={(checked) => updateConfig('includeSymbols', checked)}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Generated Password Display */}
          {generatedPassword && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-green-600">Generated Password</CardTitle>
                <CardDescription className="text-xs">
                  Copy this password and share it securely with the user
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={generatedPassword}
                      readOnly
                      className="font-mono pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    >
                      {showPassword ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPassword}
                    className="px-3"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button
            onClick={handleGeneratePassword}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                {generatedPassword ? 'Generate New' : 'Generate Password'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 