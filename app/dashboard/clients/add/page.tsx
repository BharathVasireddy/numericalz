import { Metadata } from 'next'
import { AddClientWizard } from '@/components/clients/add-client-wizard'

export const metadata: Metadata = {
  title: 'Add New Client | Numericalz',
  description: 'Add a new client to your portfolio',
}

export default function AddClientPage() {
  return <AddClientWizard />
} 