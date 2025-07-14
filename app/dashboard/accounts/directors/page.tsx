'use client'

import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Clock, ArrowLeft, Wrench } from 'lucide-react'
import Link from 'next/link'

export default function DirectorsPage() {
  return (
    <PageLayout maxWidth="xl">
      <PageHeader 
        title="Directors Management"
        description="Directors filing and compliance management system"
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
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Directors Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Coming Soon</span>
              </div>
              
              <p className="text-sm text-muted-foreground leading-relaxed">
                We're working on building a comprehensive directors management system 
                to handle director filings, confirmations, and compliance requirements.
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