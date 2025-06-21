// Demo file showing usage of inline dropdown components in Numericalz
// Each export represents a different use case for accounting-specific actions

import { Component } from "@/components/ui/inline-dropdown"

// Example 1: Basic dropdown usage
const DemoOne = () => {
  return <Component />
}

// Example 2: Usage in a client management context
const ClientActionsDemo = () => {
  const handleEditName = (newName: string) => {
    console.log('Client name changed to:', newName)
  }

  const handleFavorite = (isFavorite: boolean) => {
    console.log('Client favorite status:', isFavorite)
  }

  const handleNewVATQuarter = () => {
    console.log('Creating new VAT quarter...')
  }

  const handleDuplicateClient = () => {
    console.log('Duplicating client...')
  }

  const handleViewAnalytics = () => {
    console.log('Opening client analytics...')
  }

  const handleAssignUser = () => {
    console.log('Opening user assignment modal...')
  }

  const handleClientSettings = () => {
    console.log('Opening client settings...')
  }

  const handleArchiveClient = () => {
    console.log('Archiving client...')
  }

  const handleDeleteClient = () => {
    console.log('Deleting client...')
    // In a real implementation, this would call the delete API
  }

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-lg font-semibold">Numericalz Client Actions Dropdown</h2>
      <div className="flex gap-4">
        {/* Original Component */}
        <div>
          <h3 className="text-sm font-medium mb-2">Original Component</h3>
          <Component />
        </div>
      </div>
    </div>
  )
}

// Example 3: Integration with existing Numericalz table
const TableRowDemo = () => {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium">Acme Ltd</h3>
          <p className="text-sm text-muted-foreground">NZ-123 • VAT Enabled</p>
        </div>
        <Component />
      </div>
    </div>
  )
}

export { DemoOne, ClientActionsDemo, TableRowDemo } 