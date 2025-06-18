import { Metadata } from 'next'
import { PageLayout } from '@/components/layout/page-layout'
import { VATAnalyticsDashboard } from '@/components/clients/vat-analytics-dashboard'

export const metadata: Metadata = {
  title: 'VAT Analytics | Numericalz',
  description: 'Comprehensive VAT workflow analytics and performance insights',
}

export default function VATAnalyticsPage() {
  return (
    <PageLayout maxWidth="2xl">
      <VATAnalyticsDashboard />
    </PageLayout>
  )
} 