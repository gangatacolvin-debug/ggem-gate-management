import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import BarcodeScanner from './BarcodeScanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function CeoVehicle() {
  const { currentOfficer } = useAuthStore()
  const [ceoVehicles, setCeoVehicles] = useState([])
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [ceoBarcode, setCeoBarcode] = useState('')
  const [ceoData, setCeoData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  // Fetch CEO vehicles
  const fetchCeoVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('vehicle_type', 'ceo')
        .order('registration')

      if (error) throw error
      setCeoVehicles(data || [])
    } catch (error) {
      console.error('Error fetching CEO vehicles:', error)
    }
  }

  useEffect(() => {
    fetchCeoVehicles()
  }, [])

  // Handle CEO scan
  const handleCeoScan = async (barcode) => {
    setCeoBarcode(barcode)
    
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('barcode', barcode)
      .eq('status', 'active')
      .single()

    if (data && data.role === 'ceo') {
      setCeoData(data)
      setMessage({ type: 'success', text: `${data.name} verified` })
    } else {
      setMessage({ type: 'error', text: 'CEO not found or invalid role' })
    }
  }

  // CEO Vehicle ARRIVES (sign IN)
  const handleCeoArrival = async () => {
    if (!selectedVehicle || !ceoData) {
      setMessage({ type: 'error', text: 'Please select vehicle and scan CEO barcode' })
      return
    }

    setLoading(true)

    try {
      // Update vehicle location only
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ 
          current_location: 'on_premises'
        })
        .eq('id', selectedVehicle.id)

      if (vehicleError) throw vehicleError

      setMessage({ 
        type: 'success', 
        text: `${ceoData.name} signed in with ${selectedVehicle.registration}` 
      })
      
      // Reset form
      setTimeout(() => {
        setSelectedVehicle(null)
        setCeoData(null)
        setCeoBarcode('')
        setMessage(null)
        fetchCeoVehicles()
      }, 2000)
      
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  // CEO Vehicle DEPARTS (sign OUT)
  const handleCeoDeparture = async () => {
    if (!selectedVehicle || !ceoData) {
      setMessage({ type: 'error', text: 'Please select vehicle and scan CEO barcode' })
      return
    }

    setLoading(true)

    try {
      // Update vehicle location only
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ 
          current_location: 'off_premises'
        })
        .eq('id', selectedVehicle.id)

      if (vehicleError) throw vehicleError

      setMessage({ 
        type: 'success', 
        text: `${ceoData.name} signed out with ${selectedVehicle.registration}` 
      })
      
      // Reset form
      setTimeout(() => {
        setSelectedVehicle(null)
        setCeoData(null)
        setCeoBarcode('')
        setMessage(null)
        fetchCeoVehicles()
      }, 2000)
      
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const vehiclesOffPremises = ceoVehicles.filter(v => v.current_location === 'off_premises')
  const vehiclesOnPremises = ceoVehicles.filter(v => v.current_location === 'on_premises')

  return (
    <Tabs defaultValue="arrival" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="arrival">
          CEO Sign IN
          {vehiclesOffPremises.length > 0 && (
            <Badge variant="secondary" className="ml-2">{vehiclesOffPremises.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="departure">
          CEO Sign OUT
          {vehiclesOnPremises.length > 0 && (
            <Badge variant="secondary" className="ml-2">{vehiclesOnPremises.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* CEO ARRIVAL Tab */}
      <TabsContent value="arrival" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>CEO Sign IN</CardTitle>
            <CardDescription>Record CEO arriving at office</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            {/* Select Vehicle */}
            <div className="space-y-3">
              <div className="font-medium">Step 1: Select CEO Vehicle</div>
              {vehiclesOffPremises.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  All CEO vehicles are on premises
                </div>
              ) : (
                <div className="space-y-3">
                  {vehiclesOffPremises.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      onClick={() => setSelectedVehicle(vehicle)}
                      className={`w-full p-4 border rounded-lg text-left transition-colors ${
                        selectedVehicle?.id === vehicle.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-lg">{vehicle.registration}</div>
                      <div className="text-sm text-muted-foreground">{vehicle.notes}</div>
                      <Badge variant="outline" className="mt-2">CEO Vehicle</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Scan CEO */}
            <div className="space-y-3">
              <div className="font-medium">Step 2: Scan CEO Barcode</div>
              <BarcodeScanner onScan={handleCeoScan} disabled={!selectedVehicle} />
              {ceoData && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="font-medium">{ceoData.name}</div>
                  <div className="text-sm text-muted-foreground">{ceoData.department}</div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleCeoArrival} 
              disabled={!selectedVehicle || !ceoData || loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Processing...' : 'Sign IN'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* CEO DEPARTURE Tab */}
      <TabsContent value="departure" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>CEO Sign OUT</CardTitle>
            <CardDescription>Record CEO leaving office</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            {/* Select Vehicle */}
            <div className="space-y-3">
              <div className="font-medium">Step 1: Select CEO Vehicle</div>
              {vehiclesOnPremises.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  No CEO vehicles on premises
                </div>
              ) : (
                <div className="space-y-3">
                  {vehiclesOnPremises.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      onClick={() => setSelectedVehicle(vehicle)}
                      className={`w-full p-4 border rounded-lg text-left transition-colors ${
                        selectedVehicle?.id === vehicle.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-lg">{vehicle.registration}</div>
                      <div className="text-sm text-muted-foreground">{vehicle.notes}</div>
                      <Badge variant="outline" className="mt-2">CEO Vehicle</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Scan CEO */}
            <div className="space-y-3">
              <div className="font-medium">Step 2: Scan CEO Barcode</div>
              <BarcodeScanner onScan={handleCeoScan} disabled={!selectedVehicle} />
              {ceoData && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="font-medium">{ceoData.name}</div>
                  <div className="text-sm text-muted-foreground">{ceoData.department}</div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleCeoDeparture} 
              disabled={!selectedVehicle || !ceoData || loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Processing...' : 'Sign OUT'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}