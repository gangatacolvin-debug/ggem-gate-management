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

export default function VehicleOut() {
  const { currentOfficer } = useAuthStore()
  const [availableVehicles, setAvailableVehicles] = useState([])
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [driverBarcode, setDriverBarcode] = useState('')
  const [driverData, setDriverData] = useState(null)
  const [odometerStart, setOdometerStart] = useState('')
  const [destination, setDestination] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingVehicles, setFetchingVehicles] = useState(true)
  const [message, setMessage] = useState(null)

// Fetch available vehicles
const fetchVehicles = async () => {
  setFetchingVehicles(true)
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'available')
      .order('vehicle_type')
      .order('registration')

    if (error) throw error
    
    // Fetch the assigned key separately if needed
    const vehiclesWithKeys = await Promise.all(
      (data || []).map(async (vehicle) => {
        if (vehicle.assigned_key_id) {
          const { data: keyData } = await supabase
            .from('keys')
            .select('key_number, status')
            .eq('id', vehicle.assigned_key_id)
            .single()
          
          return { ...vehicle, assigned_key: keyData }
        }
        return vehicle
      })
    )
    
    setAvailableVehicles(vehiclesWithKeys)
  } catch (error) {
    console.error('Error fetching vehicles:', error)
    setMessage({ type: 'error', text: 'Failed to load vehicles' })
  } finally {
    setFetchingVehicles(false)
  }
}

  useEffect(() => {
    fetchVehicles()
  }, [])

  // Handle driver barcode scan
  const handleDriverScan = async (barcode) => {
    setDriverBarcode(barcode)
    
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('barcode', barcode)
      .eq('status', 'active')
      .single()

    if (data) {
      setDriverData(data)
      setMessage({ type: 'success', text: `${data.name} verified` })
      
      // Pre-fill odometer with last known reading
      if (selectedVehicle) {
        setOdometerStart(selectedVehicle.last_odometer.toString())
      }
    } else {
      setMessage({ type: 'error', text: 'Employee not found' })
    }
  }

  // Handle vehicle OUT
  const handleVehicleOut = async () => {
    if (!selectedVehicle || !driverData || !odometerStart || !destination) {
      setMessage({ type: 'error', text: 'Please complete all fields' })
      return
    }

    const odometerValue = parseInt(odometerStart)
    if (isNaN(odometerValue) || odometerValue < selectedVehicle.last_odometer) {
      setMessage({ type: 'error', text: 'Invalid odometer reading' })
      return
    }

    setLoading(true)

    try {
      // Create trip record
      const { error: tripError } = await supabase
        .from('trips')
        .insert({
          vehicle_id: selectedVehicle.id,
          driver_out_id: driverData.id,
          officer_out_id: currentOfficer.id,
          odometer_start: odometerValue,
          destination: destination,
          status: 'out'
        })

      if (tripError) throw tripError

      // Update vehicle status
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ 
          status: 'in_use',
          last_odometer: odometerValue
        })
        .eq('id', selectedVehicle.id)

      if (vehicleError) throw vehicleError

      setMessage({ 
        type: 'success', 
        text: `Vehicle ${selectedVehicle.registration} checked out to ${driverData.name}` 
      })
      
      // Reset form
      setSelectedVehicle(null)
      setDriverData(null)
      setDriverBarcode('')
      setOdometerStart('')
      setDestination('')
      
      // Refresh vehicles
      fetchVehicles()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle OUT</CardTitle>
        <CardDescription>Record vehicle leaving premises</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Select Vehicle */}
        <div className="space-y-3">
          <Label>Step 1: Select Vehicle</Label>
          {fetchingVehicles ? (
            <div className="text-center py-8 text-muted-foreground">Loading vehicles...</div>
          ) : availableVehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No vehicles available</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableVehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => setSelectedVehicle(vehicle)}
                  className={`p-4 border rounded-lg text-left transition-colors ${
                    selectedVehicle?.id === vehicle.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-lg">{vehicle.registration}</div>
                  <div className="text-sm text-muted-foreground">{vehicle.notes}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{vehicle.vehicle_type}</Badge>
                    {vehicle.assigned_key && (
                      <Badge variant="secondary">{vehicle.assigned_key.key_number}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Last odometer: {vehicle.last_odometer.toLocaleString()} km
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Scan Driver */}
        <div className="space-y-3">
          <Label>Step 2: Scan Driver Barcode</Label>
          <BarcodeScanner onScan={handleDriverScan} disabled={!selectedVehicle} />
          {driverData && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium">{driverData.name}</div>
              <div className="text-sm text-muted-foreground">
                {driverData.role.replace('_', ' ')} - {driverData.department}
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Odometer */}
        <div className="space-y-3">
          <Label htmlFor="odometer">Step 3: Odometer Reading (km)</Label>
          <Input
            id="odometer"
            type="number"
            placeholder="Enter starting odometer"
            value={odometerStart}
            onChange={(e) => setOdometerStart(e.target.value)}
            disabled={!driverData}
          />
          {selectedVehicle && (
            <div className="text-xs text-muted-foreground">
              Last reading: {selectedVehicle.last_odometer.toLocaleString()} km
            </div>
          )}
        </div>

        {/* Step 4: Destination */}
        <div className="space-y-3">
          <Label htmlFor="destination">Step 4: Destination / Purpose</Label>
          <Input
            id="destination"
            placeholder="e.g., Warehouse delivery, Client visit, etc."
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            disabled={!driverData}
          />
        </div>

        {/* Checkout Button */}
        <Button 
          onClick={handleVehicleOut} 
          disabled={!selectedVehicle || !driverData || !odometerStart || !destination || loading}
          className="w-full"
        >
          {loading ? 'Processing...' : 'Record Vehicle OUT'}
        </Button>
      </CardContent>
    </Card>
  )
}