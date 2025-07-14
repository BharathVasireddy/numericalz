'use client'

import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Clock, ArrowLeft, Wrench } from 'lucide-react'
import Link from 'next/link'

export default function SubContractorsPage() {
  return (
    <PageLayout maxWidth="xl">
      <PageHeader 
        title="Sub Contractors Management"
        description="Sub contractor compliance and filing management system"
      >
        <Link href="/dashboard/clients">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
        </Link>
      </PageHeader>
      
      <PageContent>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md text-center">
            <CardHeader className="pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Sub Contractors Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Coming Soon</span>
              </div>
              
              <p className="text-sm text-muted-foreground leading-relaxed">
                We're developing a specialized sub contractor management system 
                to handle CIS compliance, monthly returns, and contractor verification.
              </p>
              
              <div className="flex items-center justify-center gap-2 text-orange-600 bg-orange-50 rounded-lg p-3">
                <Wrench className="h-4 w-4" />
                <span className="text-xs font-medium">Under Development</span>
              </div>
              
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  This feature will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageLayout>
  )
} 