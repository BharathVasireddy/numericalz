'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ArrowLeft,
  FileText,
  Calculator,
  Building,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Download,
  Eye
} from 'lucide-react'
import { showToast } from '@/lib/toast'
import { VATFilingHistory } from '@/components/clients/filing-history/vat-filing-history'
import { AccountsFilingHistory } from '@/components/clients/filing-history/accounts-filing-history'
import { CTFilingHistory } from '@/components/clients/filing-history/ct-filing-history'
import { NonLtdFilingHistory } from '@/components/clients/filing-history/non-ltd-filing-history'

interface Client {
  id: string
  clientCode: string
  companyName: string
  companyNumber?: string
  companyType: string
  incorporationDate?: string
  yearEndDate?: string
  isVatEnabled: boolean
  vatQuarterGroup?: string
  vatReturnsFrequency?: string
  accountsFilingDeadline?: string
  confirmationStatementDeadline?: string
  corporationTaxDue?: string
}

export default function ClientFilingHistoryPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('vat')

  useEffect(() => {
    fetchClientData()
  }, [clientId])

  const fetchClientData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${clientId}`)
      const data = await response.json()

      if (data.success) {
        setClient(data.client)
      } else {
        showToast.error('Failed to fetch client data')
      }
    } catch (error) {
      console.error('Error fetching client:', error)
      showToast.error('Failed to fetch client data')
    } finally {
      setLoading(false)
    }
  }

  const getCompanyTypeBadge = (type: string) => {
    const colors: { [key: string]: string } = {
      'LIMITED_COMPANY': 'bg-blue-100 text-blue-800',
      'LLP': 'bg-green-100 text-green-800',
      'SOLE_TRADER': 'bg-yellow-100 text-yellow-800',
      'PARTNERSHIP': 'bg-purple-100 text-purple-800',
      'OTHER': 'bg-gray-100 text-gray-800'
    }
    
    const labels: { [key: string]: string } = {
      'LIMITED_COMPANY': 'Limited Company',
      'LLP': 'LLP',
      'SOLE_TRADER': 'Sole Trader',
      'PARTNERSHIP': 'Partnership',
      'OTHER': 'Other'
    }
    
    return (
      <Badge variant="outline" className={colors[type] || colors.OTHER}>
        {labels[type] || type}
      </Badge>
    )
  }

  if (loading) {
    return (
      <PageLayout maxWidth="xl">
        <PageHeader 
          title="Filing History"
          description="Loading client data..."
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </PageHeader>
        <PageContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </PageContent>
      </PageLayout>
    )
  }

  if (!client) {
    return (
      <PageLayout maxWidth="xl">
        <PageHeader 
          title="Filing History"
          description="Client not found"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </PageHeader>
        <PageContent>
          <Card>
            <CardContent className="text-center py-8">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Client not found</p>
            </CardContent>
          </Card>
        </PageContent>
      </PageLayout>
    )
  }

  const tabConfig = [
    {
      id: 'vat',
      label: 'VAT Filing',
      icon: <Calculator className="h-4 w-4" />,
      disabled: !client.isVatEnabled,
      description: client.isVatEnabled 
        ? `${client.vatReturnsFrequency || 'Unknown'} returns`
        : 'VAT not enabled'
    },
    {
      id: 'accounts',
      label: 'Annual Accounts',
      icon: <FileText className="h-4 w-4" />,
      disabled: client.companyType === 'SOLE_TRADER',
      description: client.companyType === 'SOLE_TRADER'
        ? 'Not applicable'
        : 'Companies House filing'
    },
    {
      id: 'non-ltd',
      label: 'Non-Ltd Accounts',
      icon: <FileText className="h-4 w-4" />,
      disabled: client.companyType !== 'NON_LIMITED_COMPANY',
      description: client.companyType === 'NON_LIMITED_COMPANY'
        ? 'Partnership/Sole Trader accounts'
        : 'Not applicable'
    },
    {
      id: 'ct',
      label: 'Corporation Tax',
      icon: <Building className="h-4 w-4" />,
      disabled: client.companyType !== 'LIMITED_COMPANY',
      description: client.companyType === 'LIMITED_COMPANY'
        ? 'HMRC CT filing'
        : 'Not applicable'
    }
  ]

  const availableTabs = tabConfig.filter(tab => !tab.disabled)
  const defaultTab = availableTabs[0]?.id || 'vat'

  return (
    <PageLayout maxWidth="xl">
      <PageHeader 
        title="Filing History"
        description={`Complete filing history for ${client.companyName}`}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/clients/${clientId}`)}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Client
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        {/* Client Information Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Client Information</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Basic details and filing configuration
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">{client.clientCode}</span>
                {getCompanyTypeBadge(client.companyType)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Company Number</p>
                <p className="font-medium">{client.companyNumber || 'Not registered'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Year End</p>
                <p className="font-medium">
                  {client.yearEndDate 
                    ? new Date(client.yearEndDate).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: 'long' 
                      })
                    : 'Not set'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">VAT Status</p>
                <p className="font-medium">
                  {client.isVatEnabled 
                    ? `Enabled (${client.vatQuarterGroup?.replace(/_/g, '/')})` 
                    : 'Not registered'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Incorporation Date</p>
                <p className="font-medium">
                  {client.incorporationDate 
                    ? new Date(client.incorporationDate).toLocaleDateString('en-GB')
                    : 'Not available'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filing History Tabs */}
        <Card>
          <CardContent className="p-0">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab} 
              defaultValue={defaultTab}
              className="w-full"
            >
              <div className="border-b px-6 py-4">
                <TabsList className="grid grid-cols-3 gap-4 h-auto bg-transparent p-0">
                  {tabConfig.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      disabled={tab.disabled}
                      className={`
                        flex flex-col items-center gap-2 p-4 border rounded-lg
                        data-[state=active]:bg-primary data-[state=active]:text-primary-foreground
                        data-[state=active]:border-primary
                        ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        {tab.icon}
                        <span className="font-medium">{tab.label}</span>
                      </div>
                      <span className="text-xs">
                        {tab.description}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="vat" className="p-6 m-0">
                {client.isVatEnabled ? (
                  <VATFilingHistory 
                    clientId={client.id} 
                    clientCode={client.clientCode}
                    companyName={client.companyName}
                    vatQuarterGroup={client.vatQuarterGroup || ''}
                    vatReturnsFrequency={client.vatReturnsFrequency || ''}
                  />
                ) : (
                  <div className="text-center py-12">
                    <Calculator className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">VAT is not enabled for this client</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="accounts" className="p-6 m-0">
                {client.companyType !== 'SOLE_TRADER' ? (
                  <AccountsFilingHistory 
                    clientId={client.id}
                    clientCode={client.clientCode}
                    companyName={client.companyName}
                    companyNumber={client.companyNumber || ''}
                    yearEndDate={client.yearEndDate || ''}
                    accountsFilingDeadline={client.accountsFilingDeadline || ''}
                    confirmationStatementDeadline={client.confirmationStatementDeadline || ''}
                  />
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Annual accounts filing is not applicable for sole traders</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="non-ltd" className="p-6 m-0">
                {client.companyType === 'NON_LIMITED_COMPANY' ? (
                  <NonLtdFilingHistory 
                    clientId={client.id}
                    clientCode={client.clientCode}
                    companyName={client.companyName}
                    companyType={client.companyType}
                    yearEndDate={client.yearEndDate || ''}
                    accountsFilingDeadline={client.accountsFilingDeadline || ''}
                    confirmationStatementDeadline={client.confirmationStatementDeadline || ''}
                    corporationTaxDue={client.corporationTaxDue || ''}
                  />
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Non-Ltd accounts are only applicable for partnerships and sole traders</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ct" className="p-6 m-0">
                {client.companyType === 'LIMITED_COMPANY' ? (
                  <CTFilingHistory 
                    clientId={client.id}
                    clientCode={client.clientCode}
                    companyName={client.companyName}
                    companyNumber={client.companyNumber || ''}
                    yearEndDate={client.yearEndDate || ''}
                    corporationTaxDue={client.corporationTaxDue || ''}
                  />
                ) : (
                  <div className="text-center py-12">
                    <Building className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Corporation tax is only applicable for limited companies</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </PageContent>
    </PageLayout>
  )
} 