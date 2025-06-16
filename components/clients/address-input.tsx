'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AddressData {
  address_line_1?: string
  address_line_2?: string
  locality?: string
  region?: string
  postal_code?: string
  country?: string
}

interface AddressInputProps {
  title: string
  description: string
  value: string | null
  onChange: (value: string) => void
  readOnly?: boolean
  copyFromAddress?: AddressData | null
  copyFromLabel?: string
}

export function AddressInput({
  title,
  description,
  value,
  onChange,
  readOnly = false,
  copyFromAddress,
  copyFromLabel
}: AddressInputProps) {
  const [copied, setCopied] = useState(false)

  const parseAddress = (addressString: string | null): AddressData => {
    if (!addressString) return {}
    try {
      return JSON.parse(addressString)
    } catch {
      return {}
    }
  }

  const formatAddress = (address: AddressData): string => {
    const parts = [
      address.address_line_1,
      address.address_line_2,
      address.locality,
      address.region,
      address.postal_code,
      address.country
    ].filter(Boolean)
    
    return parts.join(', ')
  }

  const currentAddress = parseAddress(value)

  const handleCopyFromAddress = () => {
    if (copyFromAddress) {
      onChange(JSON.stringify(copyFromAddress))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleFieldChange = (field: keyof AddressData, fieldValue: string) => {
    const updatedAddress = {
      ...currentAddress,
      [field]: fieldValue || undefined
    }
    
    // Remove empty fields
    Object.keys(updatedAddress).forEach(key => {
      if (!updatedAddress[key as keyof AddressData]) {
        delete updatedAddress[key as keyof AddressData]
      }
    })
    
    onChange(JSON.stringify(updatedAddress))
  }

  return (
    <Card className="shadow-professional">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base md:text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {copyFromAddress && copyFromLabel && !readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyFromAddress}
              className="btn-outline"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy from {copyFromLabel}
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {readOnly ? (
          <div className="space-y-2">
            <Label>Full Address</Label>
            <div className="p-3 bg-muted rounded-md text-sm">
              {formatAddress(currentAddress) || 'Not set'}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${title.toLowerCase().replace(/\s+/g, '_')}_line1`}>
                Address Line 1
              </Label>
              <Input
                id={`${title.toLowerCase().replace(/\s+/g, '_')}_line1`}
                value={currentAddress.address_line_1 || ''}
                onChange={(e) => handleFieldChange('address_line_1', e.target.value)}
                placeholder="e.g., 123 Main Street"
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${title.toLowerCase().replace(/\s+/g, '_')}_line2`}>
                Address Line 2
              </Label>
              <Input
                id={`${title.toLowerCase().replace(/\s+/g, '_')}_line2`}
                value={currentAddress.address_line_2 || ''}
                onChange={(e) => handleFieldChange('address_line_2', e.target.value)}
                placeholder="e.g., Apartment 4B"
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${title.toLowerCase().replace(/\s+/g, '_')}_locality`}>
                City/Town
              </Label>
              <Input
                id={`${title.toLowerCase().replace(/\s+/g, '_')}_locality`}
                value={currentAddress.locality || ''}
                onChange={(e) => handleFieldChange('locality', e.target.value)}
                placeholder="e.g., London"
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${title.toLowerCase().replace(/\s+/g, '_')}_region`}>
                County/Region
              </Label>
              <Input
                id={`${title.toLowerCase().replace(/\s+/g, '_')}_region`}
                value={currentAddress.region || ''}
                onChange={(e) => handleFieldChange('region', e.target.value)}
                placeholder="e.g., Greater London"
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${title.toLowerCase().replace(/\s+/g, '_')}_postcode`}>
                Postcode
              </Label>
              <Input
                id={`${title.toLowerCase().replace(/\s+/g, '_')}_postcode`}
                value={currentAddress.postal_code || ''}
                onChange={(e) => handleFieldChange('postal_code', e.target.value)}
                placeholder="e.g., SW1A 1AA"
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${title.toLowerCase().replace(/\s+/g, '_')}_country`}>
                Country
              </Label>
              <Input
                id={`${title.toLowerCase().replace(/\s+/g, '_')}_country`}
                value={currentAddress.country || ''}
                onChange={(e) => handleFieldChange('country', e.target.value)}
                placeholder="e.g., England"
                className="input-field"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 