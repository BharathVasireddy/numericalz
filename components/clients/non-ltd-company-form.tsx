'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

interface NonLtdCompanyFormData {
  clientName: string
  contactEmail: string
  contactPhone: string
  contactFax: string
  natureOfTrade: string
  tradingAddressLine1: string
  tradingAddressLine2: string
  tradingAddressCountry: string
  tradingAddressPostCode: string
  residentialAddressLine1: string
  residentialAddressLine2: string
  residentialAddressCountry: string
  residentialAddressPostCode: string
  vatNumber: string
  vatQuarters: string
  nationalInsuranceNumber: string
  utrNumber: string
  paperworkFrequency: string
  paperWorkReceived: boolean
  paperWorkReceivedDate: string
  jobCompleted: boolean
  jobCompletedDate: string
  sa100Filed: boolean
  sa100FiledDate: string
  workStatus: string
  additionalComments: string
  staff: string
  previousYearEnded: string
  previousYearWorkReceivedDate: string
  previousYearJobCompletedDate: string
  previousYearSA100FiledDate: string
}

interface NonLtdCompanyFormProps {
  formData: NonLtdCompanyFormData
  onFormDataChange: (data: NonLtdCompanyFormData) => void
  onSubmit: () => void
  loading?: boolean
}

export function NonLtdCompanyForm({ formData, onFormDataChange, onSubmit, loading = false }: NonLtdCompanyFormProps) {
  const handleInputChange = (field: keyof NonLtdCompanyFormData, value: string | boolean) => {
    onFormDataChange({
      ...formData,
      [field]: value
    })
  }

  const copyTradingToResidential = () => {
    onFormDataChange({
      ...formData,
      residentialAddressLine1: formData.tradingAddressLine1,
      residentialAddressLine2: formData.tradingAddressLine2,
      residentialAddressCountry: formData.tradingAddressCountry,
      residentialAddressPostCode: formData.tradingAddressPostCode
    })
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Client contact and basic details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => handleInputChange('clientName', e.target.value)}
                placeholder="Enter client name"
                className="input-field"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                placeholder="client@example.com"
                className="input-field"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Telephone Number</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                placeholder="01234 567890"
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactFax">Fax Number</Label>
              <Input
                id="contactFax"
                value={formData.contactFax}
                onChange={(e) => handleInputChange('contactFax', e.target.value)}
                placeholder="01234 567891"
                className="input-field"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="natureOfTrade">Nature of Trade</Label>
            <Input
              id="natureOfTrade"
              value={formData.natureOfTrade}
              onChange={(e) => handleInputChange('natureOfTrade', e.target.value)}
              placeholder="e.g., Retail, Consultancy, Manufacturing"
              className="input-field"
            />
          </div>
        </CardContent>
      </Card>

      {/* Trading Address */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Address</CardTitle>
          <CardDescription>Business trading address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tradingAddressLine1">Address Line 1</Label>
            <Input
              id="tradingAddressLine1"
              value={formData.tradingAddressLine1}
              onChange={(e) => handleInputChange('tradingAddressLine1', e.target.value)}
              placeholder="Street address"
              className="input-field"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tradingAddressLine2">Address Line 2</Label>
            <Input
              id="tradingAddressLine2"
              value={formData.tradingAddressLine2}
              onChange={(e) => handleInputChange('tradingAddressLine2', e.target.value)}
              placeholder="Additional address info"
              className="input-field"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tradingAddressCountry">Country</Label>
              <Select
                value={formData.tradingAddressCountry}
                onValueChange={(value) => handleInputChange('tradingAddressCountry', value)}
              >
                <SelectTrigger className="input-field">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                  <SelectItem value="England">England</SelectItem>
                  <SelectItem value="Scotland">Scotland</SelectItem>
                  <SelectItem value="Wales">Wales</SelectItem>
                  <SelectItem value="Northern Ireland">Northern Ireland</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tradingAddressPostCode">Post Code</Label>
              <Input
                id="tradingAddressPostCode"
                value={formData.tradingAddressPostCode}
                onChange={(e) => handleInputChange('tradingAddressPostCode', e.target.value)}
                placeholder="SW1A 1AA"
                className="input-field"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Residential Address */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Residential Address</CardTitle>
              <CardDescription>Personal residential address</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyTradingToResidential}
              className="btn-outline"
            >
              Copy from Trading
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="residentialAddressLine1">Address Line 1</Label>
            <Input
              id="residentialAddressLine1"
              value={formData.residentialAddressLine1}
              onChange={(e) => handleInputChange('residentialAddressLine1', e.target.value)}
              placeholder="Street address"
              className="input-field"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="residentialAddressLine2">Address Line 2</Label>
            <Input
              id="residentialAddressLine2"
              value={formData.residentialAddressLine2}
              onChange={(e) => handleInputChange('residentialAddressLine2', e.target.value)}
              placeholder="Additional address info"
              className="input-field"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="residentialAddressCountry">Country</Label>
              <Select
                value={formData.residentialAddressCountry}
                onValueChange={(value) => handleInputChange('residentialAddressCountry', value)}
              >
                <SelectTrigger className="input-field">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                  <SelectItem value="England">England</SelectItem>
                  <SelectItem value="Scotland">Scotland</SelectItem>
                  <SelectItem value="Wales">Wales</SelectItem>
                  <SelectItem value="Northern Ireland">Northern Ireland</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="residentialAddressPostCode">Post Code</Label>
              <Input
                id="residentialAddressPostCode"
                value={formData.residentialAddressPostCode}
                onChange={(e) => handleInputChange('residentialAddressPostCode', e.target.value)}
                placeholder="SW1A 1AA"
                className="input-field"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Information */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Information</CardTitle>
          <CardDescription>VAT, National Insurance, and UTR details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vatNumber">VAT Number</Label>
              <Input
                id="vatNumber"
                value={formData.vatNumber}
                onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                placeholder="GB123456789"
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vatQuarters">VAT Quarters</Label>
              <Select
                value={formData.vatQuarters}
                onValueChange={(value) => handleInputChange('vatQuarters', value)}
              >
                <SelectTrigger className="input-field">
                  <SelectValue placeholder="Select quarters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Q1 (Jan-Mar)</SelectItem>
                  <SelectItem value="Q2">Q2 (Apr-Jun)</SelectItem>
                  <SelectItem value="Q3">Q3 (Jul-Sep)</SelectItem>
                  <SelectItem value="Q4">Q4 (Oct-Dec)</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nationalInsuranceNumber">National Insurance Number</Label>
              <Input
                id="nationalInsuranceNumber"
                value={formData.nationalInsuranceNumber}
                onChange={(e) => handleInputChange('nationalInsuranceNumber', e.target.value)}
                placeholder="AB123456C"
                className="input-field"
              />
              <p className="text-xs text-muted-foreground">Format: AB123456C</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="utrNumber">UTR Number</Label>
              <Input
                id="utrNumber"
                value={formData.utrNumber}
                onChange={(e) => handleInputChange('utrNumber', e.target.value)}
                placeholder="9876543210"
                className="input-field"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">10 digits long</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Status */}
      <Card>
        <CardHeader>
          <CardTitle>Work Status</CardTitle>
          <CardDescription>Current work status and paperwork details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paperworkFrequency">Paper Work Frequency</Label>
            <Select
              value={formData.paperworkFrequency}
              onValueChange={(value) => handleInputChange('paperworkFrequency', value)}
            >
              <SelectTrigger className="input-field">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                <SelectItem value="ANNUALLY">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="paperWorkReceived"
                  checked={formData.paperWorkReceived}
                  onCheckedChange={(checked) => handleInputChange('paperWorkReceived', !!checked)}
                />
                <Label htmlFor="paperWorkReceived">Paper Work Received</Label>
              </div>

              {formData.paperWorkReceived && (
                <div className="space-y-2">
                  <Label htmlFor="paperWorkReceivedDate">Paper Work Received Date</Label>
                  <Input
                    id="paperWorkReceivedDate"
                    type="date"
                    value={formData.paperWorkReceivedDate}
                    onChange={(e) => handleInputChange('paperWorkReceivedDate', e.target.value)}
                    className="input-field"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="jobCompleted"
                  checked={formData.jobCompleted}
                  onCheckedChange={(checked) => handleInputChange('jobCompleted', !!checked)}
                />
                <Label htmlFor="jobCompleted">Job Completed</Label>
              </div>

              {formData.jobCompleted && (
                <div className="space-y-2">
                  <Label htmlFor="jobCompletedDate">Job Completed Date</Label>
                  <Input
                    id="jobCompletedDate"
                    type="date"
                    value={formData.jobCompletedDate}
                    onChange={(e) => handleInputChange('jobCompletedDate', e.target.value)}
                    className="input-field"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sa100Filed"
                  checked={formData.sa100Filed}
                  onCheckedChange={(checked) => handleInputChange('sa100Filed', !!checked)}
                />
                <Label htmlFor="sa100Filed">SA100 Filed</Label>
              </div>

              {formData.sa100Filed && (
                <div className="space-y-2">
                  <Label htmlFor="sa100FiledDate">SA100 Filed Date</Label>
                  <Input
                    id="sa100FiledDate"
                    type="date"
                    value={formData.sa100FiledDate}
                    onChange={(e) => handleInputChange('sa100FiledDate', e.target.value)}
                    className="input-field"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="workStatus">Work Status</Label>
              <Select
                value={formData.workStatus}
                onValueChange={(value) => handleInputChange('workStatus', value)}
              >
                <SelectTrigger className="input-field">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
          <CardDescription>Staff assignment and previous year details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff">Staff</Label>
            <Input
              id="staff"
              value={formData.staff}
              onChange={(e) => handleInputChange('staff', e.target.value)}
              placeholder="Assigned staff member"
              className="input-field"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalComments">Additional Comments</Label>
            <Textarea
              id="additionalComments"
              value={formData.additionalComments}
              onChange={(e) => handleInputChange('additionalComments', e.target.value)}
              placeholder="Any additional notes or comments"
              className="input-field min-h-20"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="previousYearEnded">Previous Year Ended</Label>
              <Input
                id="previousYearEnded"
                type="date"
                value={formData.previousYearEnded}
                onChange={(e) => handleInputChange('previousYearEnded', e.target.value)}
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="previousYearWorkReceivedDate">Previous Year Work Received Date</Label>
              <Input
                id="previousYearWorkReceivedDate"
                type="date"
                value={formData.previousYearWorkReceivedDate}
                onChange={(e) => handleInputChange('previousYearWorkReceivedDate', e.target.value)}
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="previousYearJobCompletedDate">Previous Year Job Completed Date</Label>
              <Input
                id="previousYearJobCompletedDate"
                type="date"
                value={formData.previousYearJobCompletedDate}
                onChange={(e) => handleInputChange('previousYearJobCompletedDate', e.target.value)}
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="previousYearSA100FiledDate">Previous Year SA100 Filed Date</Label>
              <Input
                id="previousYearSA100FiledDate"
                type="date"
                value={formData.previousYearSA100FiledDate}
                onChange={(e) => handleInputChange('previousYearSA100FiledDate', e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={onSubmit}
          disabled={loading || !formData.clientName || !formData.contactEmail}
          className="btn-primary"
        >
          {loading ? 'Creating Client...' : 'Create Client'}
        </Button>
      </div>
    </div>
  )
} 