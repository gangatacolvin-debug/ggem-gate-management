import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, Search } from 'lucide-react'

export default function TripHistory() {
  const [trips, setTrips] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Filters
  const [selectedVehicle, setSelectedVehicle] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchDriver, setSearchDriver] = useState('')

  // Fetch vehicles for filter
  useEffect(() => {
    const fetchVehicles = async () => {
      const { data } = await supabase
        .from('vehicles')
        .select('id, registration')
        .order('registration')
      
      setVehicles(data || [])
    }
    fetchVehicles()
  }, [])

  // Fetch trips with filters
  const fetchTrips = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('trips')
        .select(`
          *,
          vehicle:vehicles(registration, notes, vehicle_type),
          driver_out:employees!trips_driver_out_id_fkey(name),
          driver_in:employees!trips_driver_in_id_fkey(name),
          officer_out:employees!trips_officer_out_id_fkey(name),
          officer_in:employees!trips_officer_in_id_fkey(name)
        `)
        .order('time_out', { ascending: false })
        .limit(100)

      // Apply filters
      if (selectedVehicle !== 'all') {
        query = query.eq('vehicle_id', selectedVehicle)
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus)
      }

      if (dateFrom) {
        query = query.gte('time_out', new Date(dateFrom).toISOString())
      }

      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        query = query.lte('time_out', endDate.toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      // Filter by driver name (client-side search)
      let filteredData = data || []
      if (searchDriver) {
        filteredData = filteredData.filter(trip => 
          trip.driver_out?.name.toLowerCase().includes(searchDriver.toLowerCase()) ||
          trip.driver_in?.name.toLowerCase().includes(searchDriver.toLowerCase())
        )
      }

      setTrips(filteredData)
    } catch (error) {
      console.error('Error fetching trips:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrips()
  }, [selectedVehicle, selectedStatus, dateFrom, dateTo])

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Date Out',
      'Date In',
      'Vehicle',
      'Driver Out',
      'Driver In',
      'Destination',
      'Odometer Start',
      'Odometer End',
      'Distance (km)',
      'Status'
    ]

    const rows = trips.map(trip => [
      new Date(trip.time_out).toLocaleString(),
      trip.time_in ? new Date(trip.time_in).toLocaleString() : 'N/A',
      trip.vehicle.registration,
      trip.driver_out.name,
      trip.driver_in?.name || 'N/A',
      trip.destination,
      trip.odometer_start,
      trip.odometer_end || 'N/A',
      trip.odometer_end ? trip.odometer_end - trip.odometer_start : 'N/A',
      trip.status
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trip-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Trip History</CardTitle>
            <CardDescription>View and export vehicle trip records</CardDescription>
          </div>
          <Button onClick={exportToCSV} disabled={trips.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label>Vehicle</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                {vehicles.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="out">Out</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateFrom">From Date</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateTo">To Date</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="searchDriver">Search Driver</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="searchDriver"
                placeholder="Driver name..."
                value={searchDriver}
                onChange={(e) => setSearchDriver(e.target.value)}
                onBlur={fetchTrips}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div>
          <div className="text-sm text-muted-foreground mb-2">
            Showing {trips.length} trip{trips.length !== 1 ? 's' : ''}
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : trips.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No trips found</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Out</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver Out</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date In</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell className="text-sm">
                        {new Date(trip.time_out).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {trip.vehicle.registration}
                        <div className="text-xs text-muted-foreground">
                          {trip.vehicle.notes}
                        </div>
                      </TableCell>
                      <TableCell>{trip.driver_out.name}</TableCell>
                      <TableCell>{trip.destination}</TableCell>
                      <TableCell>
                        {trip.odometer_end 
                          ? `${(trip.odometer_end - trip.odometer_start).toLocaleString()} km`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={trip.status === 'returned' ? 'default' : 'secondary'}>
                          {trip.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {trip.time_in 
                          ? new Date(trip.time_in).toLocaleString()
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}