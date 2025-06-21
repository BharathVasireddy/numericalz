'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { 
  FileText, 
  Calculator, 
  Building2, 
  TrendingUp, 
  Shield,
  ExternalLink,
  Clock,
  CheckCircle
} from 'lucide-react'

export default function ToolsPage() {
  const router = useRouter()

  const tools = [
    {
      id: 'hmrc-agent-auth',
      title: 'HMRC Agent Authorization',
      description: 'Authenticate with HMRC Making Tax Digital API for agent services',
      icon: Shield,
      status: 'active',
      category: 'Authentication',
      features: [
        'OAuth 2.0 Authentication with HMRC',
        'Agent Authorization Flow',
        'Connection Testing',
        'Sandbox Environment'
      ],
      route: '/dashboard/tools/hmrc'
    },
    {
      id: 'tax-calculator',
      title: 'Tax Calculator',
      description: 'Calculate corporation tax, VAT, and other UK tax obligations',
      icon: Calculator,
      status: 'coming-soon',
      category: 'Calculations',
      features: [
        'Corporation Tax Calculator',
        'VAT Calculator',
        'PAYE Calculator',
        'Capital Gains Calculator'
      ],
      route: '/dashboard/tools/calculator'
    },
    {
      id: 'companies-house-bulk',
      title: 'Companies House Bulk Tools',
      description: 'Bulk operations for Companies House data management',
      icon: Building2,
      status: 'coming-soon',
      category: 'Data Management',
      features: [
        'Bulk Company Search',
        'Mass Data Export',
        'Filing History Analysis',
        'Director Information Extraction'
      ],
      route: '/dashboard/tools/companies-house'
    },
    {
      id: 'analytics-tools',
      title: 'Advanced Analytics',
      description: 'Business intelligence and reporting tools',
      icon: TrendingUp,
      status: 'coming-soon',
      category: 'Analytics',
      features: [
        'Client Performance Analysis',
        'Revenue Forecasting',
        'Workflow Optimization',
        'Custom Dashboards'
      ],
      route: '/dashboard/tools/analytics'
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
      case 'coming-soon':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Coming Soon</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const handleToolClick = (tool: typeof tools[0]) => {
    if (tool.status === 'active') {
      router.push(tool.route)
    }
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="content-sections">
          {/* Header */}
          <div className="page-header">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Tools & Utilities</h1>
                <p className="text-muted-foreground mt-1">
                  Standalone tools for enhanced accounting and tax management
                </p>
              </div>
            </div>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => {
              const Icon = tool.icon
              return (
                <Card 
                  key={tool.id} 
                  className={`transition-all duration-200 hover:shadow-lg ${
                    tool.status === 'active' 
                      ? 'cursor-pointer hover:scale-105 border-primary/20' 
                      : 'opacity-75'
                  }`}
                  onClick={() => handleToolClick(tool)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          tool.status === 'active' 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{tool.title}</CardTitle>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {tool.category}
                          </Badge>
                        </div>
                      </div>
                      {getStatusBadge(tool.status)}
                    </div>
                    <CardDescription className="mt-3">
                      {tool.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Features:</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {tool.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {tool.status === 'active' && (
                        <Button 
                          className="w-full mt-4" 
                          onClick={() => handleToolClick(tool)}
                        >
                          Launch Tool
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </Button>
                      )}
                      
                      {tool.status === 'coming-soon' && (
                        <Button 
                          variant="outline" 
                          className="w-full mt-4" 
                          disabled
                        >
                          Coming Soon
                          <Clock className="h-4 w-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Info Section */}
          <Card className="mt-8 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                About Tools & Utilities
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Standalone Operation</h4>
                  <p className="text-sm">
                    These tools operate independently from your main client management system. 
                    They don't interfere with your existing workflows or data.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Secure Integration</h4>
                  <p className="text-sm">
                    All tools use secure APIs and follow best practices for data protection. 
                    HMRC integration uses official OAuth 2.0 authentication.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Sandbox Testing</h4>
                  <p className="text-sm">
                    Test all functionality safely in sandbox environments before using 
                    with live data. Perfect for training and validation.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Future Expansion</h4>
                  <p className="text-sm">
                    More tools are being developed based on user feedback. 
                    Contact support to request specific functionality.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 