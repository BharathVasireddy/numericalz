'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function VATDeadlineTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>VAT Deadlines</CardTitle>
        <CardDescription>Upcoming VAT submission deadlines for your clients</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>No VAT deadlines found.</p>
          <p className="text-sm mt-2">VAT deadlines will appear here when clients have upcoming submissions.</p>
        </div>
      </CardContent>
    </Card>
  )
}
