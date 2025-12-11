import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, Clock, Key, Car } from 'lucide-react'

export default function Alerts() {
  const [overdueTrips, setOverdueTrips] = useState([])
  const [longKeyCheckouts, setLongKeyCheckouts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAlerts = async () => {
    setLoading(true)
    try {
const now = new Date()
const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

// Find trips out for more than 3 days
const { data: tripsData } = await supabase
  .from('trips')
  .select(`
    *,
    vehicle:vehicles(registration, notes),
    driver_out:employees!trips_driver_out_id_fkey(name)
  `)
  .eq('status', 'out')
  .lt('time_out', threeDaysAgo.toISOString())
  .order('time_out', { ascending: true })

      // Find keys checked out for more than 24 hours
      const { data: keysData } = await supabase
        .from('key_transactions')
        .select(`
          *,
          key:keys(key_number, description, key_type),
          person_out:employees!key_transactions_person_out_id_fkey(name)
        `)
        .eq('status', 'out')
        .lt('checkout_time', twentyFourHoursAgo.toISOString())
        .order('checkout_time', { ascending: true })

      setOverdueTrips(tripsData || [])
      setLongKeyCheckouts(keysData || [])
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()

    // Refresh every 2 minutes
    const interval = setInterval(fetchAlerts, 120000)
    return () => clearInterval(interval)
  }, [])

const calculateTimeOut = (timeOut) => {
  const now = new Date()
  const departureTime = new Date(timeOut)
  const hours = Math.floor((now - departureTime) / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`
  }
  return `${hours} hour${hours > 1 ? 's' : ''}`
}

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading alerts...</div>
  }

  const totalAlerts = overdueTrips.length + longKeyCheckouts.length

  if (totalAlerts === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-green-600" />
            System Alerts
          </CardTitle>
          <CardDescription>No alerts at this time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            All vehicles and keys are within normal timeframes
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            System Alerts
            <Badge variant="destructive" className="ml-2">{totalAlerts}</Badge>
          </CardTitle>
          <CardDescription>Items requiring attention</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overdue Trips */}
          {overdueTrips.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <Car className="h-4 w-4" />
                Overdue Vehicles ({overdueTrips.length})
              </div>
              {overdueTrips.map((trip) => {
                const timeOut = calculateTimeOut(trip.time_out)
                return (
                  <Alert key={trip.id} variant="destructive">
                    <Clock className="h-4 w-4" />
                    <AlertTitle className="font-medium">
                      {trip.vehicle.registration} - {timeOut} out
                    </AlertTitle>
                    <AlertDescription className="mt-2 space-y-1">
                      <div className="text-sm">
                        <span className="font-medium">Driver:</span> {trip.driver_out.name}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Destination:</span> {trip.destination}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Departed: {new Date(trip.time_out).toLocaleString()}
                      </div>
                    </AlertDescription>
                  </Alert>
                )
              })}
            </div>
          )}

          {/* Long Key Checkouts */}
          {longKeyCheckouts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <Key className="h-4 w-4" />
                Long Key Checkouts ({longKeyCheckouts.length})
              </div>
              {longKeyCheckouts.map((tx) => {
                const timeOut = calculateTimeOut(tx.checkout_time)
                return (
                  <Alert key={tx.id} variant="destructive">
                    <Clock className="h-4 w-4" />
                    <AlertTitle className="font-medium">
                      {tx.key.key_number} - {timeOut} checked out
                    </AlertTitle>
                    <AlertDescription className="mt-2 space-y-1">
                      <div className="text-sm">
                        {tx.key.description}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Checked out to:</span> {tx.person_out.name}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Purpose:</span> {tx.purpose}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Checkout: {new Date(tx.checkout_time).toLocaleString()}
                      </div>
                    </AlertDescription>
                  </Alert>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

<div className="text-xs text-muted-foreground text-center">
  Alerts shown for: Vehicles out 3+ days | Keys checked out 7+ days
</div>
    </div>
  )
}