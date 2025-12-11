import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ManageEmployees from './ManageEmployees'
import ManageVehicles from './ManageVehicles'
import ManageKeys from './ManageKeys'
import ManageTrips from './ManageTrips'

export default function AdminPanel() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Panel</CardTitle>
          <CardDescription>
            Manage employees, vehicles, keys, and system settings
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="employees" className="w-full">
<TabsList className="grid w-full grid-cols-4">
  <TabsTrigger value="employees">Employees</TabsTrigger>
  <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
  <TabsTrigger value="keys">Keys</TabsTrigger>
  <TabsTrigger value="trips">Trips</TabsTrigger>
</TabsList>

        <TabsContent value="employees" className="space-y-4">
          <ManageEmployees />
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-4">
          <ManageVehicles />
        </TabsContent>

        <TabsContent value="keys" className="space-y-4">
          <ManageKeys />
        </TabsContent>

        <TabsContent value="trips" className="space-y-4">
  <ManageTrips />
</TabsContent>
      </Tabs>
    </div>
  )
}