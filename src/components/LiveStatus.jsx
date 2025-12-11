import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import Alerts from './Alerts'

export default function LiveStatus() {
  const [vehicles, setVehicles] = useState([])
  const [keys, setKeys] = useState([])
  const [visitors, setVisitors] = useState([])
  const [trips, setTrips] = useState([])
  const [keyTransactions, setKeyTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    vehiclesOut: 0,
    vehiclesAvailable: 0,
    keysCheckedOut: 0,
    keysAvailable: 0,
    visitorsOnSite: 0
  })

  // Fetch all data
  const fetchAllData = async () => {
    setLoading(true)
    try {
      // Fetch vehicles
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('*')
        .order('status')
        .order('registration')

      setVehicles(vehiclesData || [])

      // Fetch active trips
      const { data: tripsData } = await supabase
        .from('trips')
        .select(`
          *,
          vehicle:vehicles(registration, notes),
          driver_out:employees!trips_driver_out_id_fkey(name)
        `)
        .eq('status', 'out')
        .order('time_out', { ascending: false })

      setTrips(tripsData || [])

      // Fetch keys
      const { data: keysData } = await supabase
        .from('keys')
        .select('*')
        .order('status')
        .order('key_type')
        .order('key_number')

      setKeys(keysData || [])

      // Fetch active key transactions
      const { data: keyTxData } = await supabase
        .from('key_transactions')
        .select(`
          *,
          key:keys(key_number, description, key_type),
          person_out:employees!key_transactions_person_out_id_fkey(name)
        `)
        .eq('status', 'out')
        .order('checkout_time', { ascending: false })

      setKeyTransactions(keyTxData || [])

      // Fetch active visitors
      const { data: visitorsData } = await supabase
        .from('visitors')
        .select(`
          *,
          host:employees!visitors_host_employee_id_fkey(name)
        `)
        .eq('status', 'on_premises')
        .order('time_in', { ascending: false })

      setVisitors(visitorsData || [])

      // Calculate stats
      const vehiclesOut = vehiclesData?.filter(v => v.status === 'in_use').length || 0
      const vehiclesAvailable = vehiclesData?.filter(v => v.status === 'available').length || 0
      const keysOut = keysData?.filter(k => k.status === 'checked_out').length || 0
      const keysAvailable = keysData?.filter(k => k.status === 'available').length || 0
      const visitorsCount = visitorsData?.length || 0

      setStats({
        vehiclesOut,
        vehiclesAvailable,
        keysCheckedOut: keysOut,
        keysAvailable,
        visitorsOnSite: visitorsCount
      })

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()

    // Set up real-time refresh every 30 seconds
    const interval = setInterval(fetchAllData, 30000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading dashboard...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Vehicles OUT</CardDescription>
            <CardTitle className="text-3xl">{stats.vehiclesOut}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Vehicles Available</CardDescription>
            <CardTitle className="text-3xl">{stats.vehiclesAvailable}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Keys Checked Out</CardDescription>
            <CardTitle className="text-3xl">{stats.keysCheckedOut}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Keys Available</CardDescription>
            <CardTitle className="text-3xl">{stats.keysAvailable}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Visitors On-Site</CardDescription>
            <CardTitle className="text-3xl">{stats.visitorsOnSite}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Detailed Views */}
      <Tabs defaultValue="vehicles" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="keys">Keys</TabsTrigger>
          <TabsTrigger value="visitors">Visitors</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Trips</CardTitle>
              <CardDescription>Vehicles currently out</CardDescription>
            </CardHeader>
            <CardContent>
              {trips.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No vehicles currently out</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Departure</TableHead>
                      <TableHead>Odometer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trips.map((trip) => (
                      <TableRow key={trip.id}>
                        <TableCell className="font-medium">
                          {trip.vehicle.registration}
                          <div className="text-xs text-muted-foreground">
                            {trip.vehicle.notes}
                          </div>
                        </TableCell>
                        <TableCell>{trip.driver_out.name}</TableCell>
                        <TableCell>{trip.destination}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(trip.time_out).toLocaleString()}
                        </TableCell>
                        <TableCell>{trip.odometer_start.toLocaleString()} km</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Vehicles Status</CardTitle>
              <CardDescription>Overview of all vehicles</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Registration</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Odometer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">{vehicle.registration}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{vehicle.vehicle_type}</Badge>
                      </TableCell>
                      <TableCell>{vehicle.notes}</TableCell>
                      <TableCell>
                        <Badge variant={vehicle.status === 'available' ? 'default' : 'secondary'}>
                          {vehicle.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{vehicle.last_odometer.toLocaleString()} km</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Keys Tab */}
        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Checked Out Keys</CardTitle>
              <CardDescription>Keys currently in use</CardDescription>
            </CardHeader>
            <CardContent>
              {keyTransactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No keys checked out</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Checked Out To</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Checkout Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keyTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">
                          {tx.key.key_number}
                          <div className="text-xs text-muted-foreground">
                            {tx.key.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tx.key.key_type}</Badge>
                        </TableCell>
                        <TableCell>{tx.person_out.name}</TableCell>
                        <TableCell>{tx.purpose}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(tx.checkout_time).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Keys Status</CardTitle>
              <CardDescription>Overview of all keys</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className="p-3 border rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{key.key_number}</div>
                        <div className="text-sm text-muted-foreground">{key.description}</div>
                      </div>
                      <Badge variant={key.status === 'available' ? 'default' : 'secondary'}>
                        {key.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="mt-2">
                      {key.key_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visitors Tab */}
        <TabsContent value="visitors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visitors On Premises</CardTitle>
              <CardDescription>Currently on-site</CardDescription>
            </CardHeader>
            <CardContent>
              {visitors.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No visitors on premises</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Time In</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visitors.map((visitor) => (
                      <TableRow key={visitor.id}>
                        <TableCell className="font-medium">{visitor.name}</TableCell>
                        <TableCell>{visitor.organization || '-'}</TableCell>
                        <TableCell>{visitor.purpose}</TableCell>
                        <TableCell>{visitor.host?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {visitor.visitor_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(visitor.time_in).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Alerts Tab */}
<TabsContent value="alerts" className="space-y-4">
  <Alerts />
</TabsContent>
      </Tabs>

      <div className="text-xs text-muted-foreground text-center">
        Auto-refreshes every 30 seconds
      </div>
    </div>
  )
}