// Numericalz Dropdown Integration Demo
// Shows how to use the inline dropdown components in your accounting system

import { Component } from "@/components/ui/inline-dropdown"
import { useState } from "react"

// Example 1: Basic dropdown usage
const BasicDropdownDemo = () => {
  return (
    <div className="p-6 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Basic Inline Dropdown</h3>
      <Component />
    </div>
  )
}

// Example 2: Integration with Client Table Row
const ClientTableRowDemo = () => {
  const [showDropdown, setShowDropdown] = useState<string | null>(null)

  const clients = [
    { id: 'NZ-123', name: 'Acme Ltd', status: 'Active', vat: true },
    { id: 'NZ-124', name: 'Beta Corp', status: 'Active', vat: false },
    { id: 'NZ-125', name: 'Gamma Services', status: 'Active', vat: true },
  ]

  return (
    <div className="p-6 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Client Table with Action Dropdowns</h3>
      <div className="space-y-2">
        {clients.map((client) => (
          <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50">
            <div className="flex items-center space-x-4">
              <span className="font-mono text-sm text-gray-500">{client.id}</span>
              <span className="font-medium">{client.name}</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                client.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {client.status}
              </span>
              {client.vat && (
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">VAT</span>
              )}
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowDropdown(showDropdown === client.id ? null : client.id)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                </svg>
              </button>
              
              {showDropdown === client.id && (
                <div className="absolute right-0 top-full mt-2 z-10">
                  <Component />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Example 3: Dashboard Widget with Dropdown
const DashboardWidgetDemo = () => {
  return (
    <div className="p-6 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Dashboard Widget with Actions</h3>
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Top Clients</h4>
          <Component />
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span>Acme Ltd</span>
            <span className="text-green-600 font-medium">£45,230</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Beta Corp</span>
            <span className="text-green-600 font-medium">£32,180</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Gamma Services</span>
            <span className="text-green-600 font-medium">£28,950</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Example 4: VAT Quarter Management
const VATQuarterDemo = () => {
  const quarters = [
    { id: 1, period: 'Q1 2024', status: 'Filed', dueDate: '2024-04-30' },
    { id: 2, period: 'Q2 2024', status: 'In Progress', dueDate: '2024-07-31' },
    { id: 3, period: 'Q3 2024', status: 'Pending', dueDate: '2024-10-31' },
  ]

  return (
    <div className="p-6 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">VAT Quarter Management</h3>
      <div className="space-y-3">
        {quarters.map((quarter) => (
          <div key={quarter.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <span className="font-medium">{quarter.period}</span>
              <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                quarter.status === 'Filed' ? 'bg-green-100 text-green-800' :
                quarter.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {quarter.status}
              </span>
              <span className="ml-3 text-sm text-gray-500">Due: {quarter.dueDate}</span>
            </div>
            <Component />
          </div>
        ))}
      </div>
    </div>
  )
}

// Integration Tips Component
const IntegrationTips = () => {
  return (
    <div className="p-6 border rounded-lg bg-blue-50">
      <h3 className="text-lg font-semibold mb-4 text-blue-900">Integration Tips for Numericalz</h3>
      <div className="space-y-3 text-sm text-blue-800">
        <div className="flex items-start space-x-2">
          <span className="font-bold">1.</span>
          <span>Replace action buttons in client tables with the dropdown for space efficiency</span>
        </div>
        <div className="flex items-start space-x-2">
          <span className="font-bold">2.</span>
          <span>Use in dashboard widgets for quick access to client actions</span>
        </div>
        <div className="flex items-start space-x-2">
          <span className="font-bold">3.</span>
          <span>Customize actions based on user role (Staff/Manager/Partner permissions)</span>
        </div>
        <div className="flex items-start space-x-2">
          <span className="font-bold">4.</span>
          <span>Add VAT-specific actions like "Create VAT Quarter" and "File Return"</span>
        </div>
        <div className="flex items-start space-x-2">
          <span className="font-bold">5.</span>
          <span>Implement hold-to-delete pattern for critical actions like client deletion</span>
        </div>
      </div>
    </div>
  )
}

// Main Demo Export
export { 
  BasicDropdownDemo, 
  ClientTableRowDemo, 
  DashboardWidgetDemo, 
  VATQuarterDemo,
  IntegrationTips
} 