import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import BarcodeScanner from './BarcodeScanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function VehicleIn() {
  const { currentOfficer } = useAuthStore()
  const [outVehicles, setOutVehicles] = useState([])
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [returnerBarcode, setReturnerBarcode] = useState('')
  const [returnerData, setReturnerData] = useState(null)
  const [odometerEnd, setOdometerEnd] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingTrips, setFetchingTrips] = useState(true)
  const [message, setMessage] = useState(null)

  // Fetch trips with vehicles OUT
  const fetchOutTrips = async () => {
    setFetchingTrips(true)
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          vehicle:vehicles(registration, notes, vehicle_type),
          driver_out:employees!trips_driver_out_id_fkey(name, barcode),
          officer_out:employees!trips_officer_out_id_fkey(name)
        `)
        .eq('status', 'out')
        .order('time_out', { ascending: false })

      if (error) throw error
      setOutVehicles(data || [])
    } catch (error) {
      console.error('Error fetching trips:', error)
      setMessage({ type: 'error', text: 'Failed to load trips' })
    } finally {
      setFetchingTrips(false)
    }
  }

  useEffect(() => {
    fetchOutTrips()
  }, [])

  // Handle returner barcode scan
  const handleReturnerScan = async (barcode) => {
    setReturnerBarcode(barcode)
    
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('barcode', barcode)
      .eq('status', 'active')
      .single()

    if (data) {
      setReturnerData(data)
      setMessage({ type: 'success', text: `${data.name} verified` })
    } else {
      setMessage({ type: 'error', text: 'Employee not found' })
    }
  }

  const isDifferentDriver = returnerData && selectedTrip && returnerData.id !== selectedTrip.driver_out_id

  // Handle vehicle IN
  const handleVehicleIn = async () => {
    if (!selectedTrip || !returnerData || !odometerEnd) {
      setMessage({ type: 'error', text: 'Please complete all fields' })
      return
    }

    if (isDifferentDriver && !reason) {
      setMessage({ type: 'error', text: 'Please select reason for different driver' })
      return
    }

    const odometerValue = parseInt(odometerEnd)
    if (isNaN(odometerValue) || odometerValue < selectedTrip.odometer_start) {
      setMessage({ type: 'error', text: 'End odometer must be greater than or equal to start odometer' })
      return
    }

    setLoading(true)

    try {
      // Update trip record
      const { error: tripError } = await supabase
        .from('trips')
        .update({
          driver_in_id: returnerData.id,
          officer_in_id: currentOfficer.id,
          odometer_end: odometerValue,
          time_in: new Date().toISOString(),
          reason_if_different_driver: isDifferentDriver ? reason : null,
          status: 'returned'
        })
        .eq('id', selectedTrip.id)

      if (tripError) throw tripError

      // Update vehicle status
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ 
          status: 'available',
          last_odometer: odometerValue
        })
        .eq('id', selectedTrip.vehicle_id)

      if (vehicleError) throw vehicleError

      const distance = odometerValue - selectedTrip.odometer_start
      setMessage({ 
        type: 'success', 
        text: `Vehicle ${selectedTrip.vehicle.registration} returned. Distance: ${distance} km` 
      })
      
      // Reset form
      setTimeout(() => {
        setSelectedTrip(null)
        setReturnerData(null)
        setReturnerBarcode('')
        setOdometerEnd('')
        setReason('')
        setMessage(null)
        fetchOutTrips()
      }, 3000)
      
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle IN</CardTitle>
        <CardDescription>Record vehicle returning to premises</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Select Trip */}
        <div className="space-y-3">
          <Label>Step 1: Select Returning Vehicle</Label>
          {fetchingTrips ? (
            <div className="text-center py-8 text-muted-foreground">Loading trips...</div>
          ) : outVehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No vehicles currently out</div>
          ) : (
            <div className="space-y-3">
              {outVehicles.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => setSelectedTrip(trip)}
                  className={`w-full p-4 border rounded-lg text-left transition-colors ${
                    selectedTrip?.id === trip.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-lg">{trip.vehicle.registration}</div>
                      <div className="text-sm text-muted-foreground">{trip.vehicle.notes}</div>
                      <div className="text-sm mt-2">
                        <span className="font-medium">Driver:</span> {trip.driver_out.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Destination: {trip.destination}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Departed: {new Date(trip.time_out).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Start odometer: {trip.odometer_start.toLocaleString()} km
                      </div>
                    </div>
                    <Badge variant="outline">{trip.vehicle.vehicle_type}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Scan Driver */}
        <div className="space-y-3">
          <Label>Step 2: Scan Returning Driver Barcode</Label>
          <BarcodeScanner onScan={handleReturnerScan} disabled={!selectedTrip} />
          
          {returnerData && (
            <div className={`p-4 border rounded-lg ${
              isDifferentDriver ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
            }`}>
              <div className="font-medium">{returnerData.name}</div>
              <div className="text-sm text-muted-foreground">
                {returnerData.role.replace('_', ' ')} - {returnerData.department}
              </div>
              {isDifferentDriver && (
                <div className="mt-2 text-sm font-medium text-yellow-700">
                  Warning: Different driver returning vehicle
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reason if different driver */}
        {isDifferentDriver && (
          <div className="space-y-3">
            <Label>Reason for Different Driver</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="driver_swapped_mid_trip">Driver swapped mid-trip</SelectItem>
                <SelectItem value="emergency_takeover">Emergency takeover</SelectItem>
                <SelectItem value="breakdown_replacement">Breakdown replacement</SelectItem>
                <SelectItem value="shift_change">Shift change</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Step 3: Odometer */}
        <div className="space-y-3">
          <Label htmlFor="odometerEnd">Step 3: Ending Odometer Reading (km)</Label>
          <Input
            id="odometerEnd"
            type="number"
            placeholder="Enter ending odometer"
            value={odometerEnd}
            onChange={(e) => setOdometerEnd(e.target.value)}
            disabled={!returnerData}
          />
          {selectedTrip && (
            <div className="text-xs text-muted-foreground">
              Starting reading: {selectedTrip.odometer_start.toLocaleString()} km
            </div>
          )}
        </div>

        {/* Return Button */}
        <Button 
          onClick={handleVehicleIn} 
          disabled={!selectedTrip || !returnerData || !odometerEnd || (isDifferentDriver && !reason) || loading}
          className="w-full"
        >
          {loading ? 'Processing...' : 'Record Vehicle IN'}
        </Button>
      </CardContent>
    </Card>
  )
}