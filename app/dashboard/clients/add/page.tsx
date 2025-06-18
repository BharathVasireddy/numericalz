import { Metadata } from 'next'
import { EnhancedAddClientWizard } from '@/components/clients/enhanced-add-client-wizard'

export const metadata: Metadata = {
  title: 'Add New Client | Numericalz',
  description: 'Add a new client to your portfolio',
}

export default function AddClientPage() {
  return <EnhancedAddClientWizard />
} 