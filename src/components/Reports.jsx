import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TripHistory from './TripHistory'
import KeyTransactionHistory from './KeyTransactionHistory'
import VisitorLogs from './VisitorLogs'

export default function Reports() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reports & Analytics</CardTitle>
          <CardDescription>
            View historical data, generate reports, and export records
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="trips" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trips">Trip History</TabsTrigger>
          <TabsTrigger value="keys">Key Transactions</TabsTrigger>
          <TabsTrigger value="visitors">Visitor Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="trips" className="space-y-4">
          <TripHistory />
        </TabsContent>

        <TabsContent value="keys" className="space-y-4">
          <KeyTransactionHistory />
        </TabsContent>

        <TabsContent value="visitors" className="space-y-4">
          <VisitorLogs />
        </TabsContent>
      </Tabs>
    </div>
  )
}