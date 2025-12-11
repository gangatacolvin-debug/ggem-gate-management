import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import BarcodeScanner from './BarcodeScanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function StaffVehicle() {
  const { currentOfficer } = useAuthStore()
  const [staffOnSite, setStaffOnSite] = useState([])
  const [staffOffSite, setStaffOffSite] = useState([])
  const [staffBarcode, setStaffBarcode] = useState('')
  const [staffData, setStaffData] = useState(null)
  const [vehicleReg, setVehicleReg] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  // Fetch active staff vehicle sessions
  const fetchStaffSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('visitors')
        .select(`
          *,
          host:employees!visitors_host_employee_id_fkey(name, department)
        `)
        .eq('visitor_type', 'vehicle')
        .eq('purpose', 'Staff Personal Vehicle')
        .order('time_in', { ascending: false })

      if (error) throw error

      const onSite = (data || []).filter(v => v.status === 'on_premises')
      const offSite = (data || []).filter(v => v.status === 'departed')

      setStaffOnSite(onSite)
      setStaffOffSite(offSite)
    } catch (error) {
      console.error('Error fetching staff sessions:', error)
    }
  }

  useEffect(() => {
    fetchStaffSessions()
  }, [])

  // Handle staff scan
  const handleStaffScan = async (barcode) => {
    setStaffBarcode(barcode)
    
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('barcode', barcode)
      .eq('status', 'active')
      .single()

    if (data && data.role === 'staff') {
      setStaffData(data)
      setMessage({ type: 'success', text: `${data.name} verified` })
    } else {
      setMessage({ type: 'error', text: 'Staff member not found or invalid role' })
    }
  }

  // Staff arriving with personal vehicle
  const handleStaffArrival = async () => {
    if (!staffData || !vehicleReg) {
      setMessage({ type: 'error', text: 'Please scan staff barcode and enter vehicle registration' })
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('visitors')
        .insert({
          name: staffData.name,
          organization: 'Staff',
          purpose: 'Staff Personal Vehicle',
          host_employee_id: staffData.id,
          vehicle_registration: vehicleReg.toUpperCase(),
          visitor_type: 'vehicle',
          officer_in_id: currentOfficer.id,
          status: 'on_premises'
        })

      if (error) throw error

      setMessage({ 
        type: 'success', 
        text: `${staffData.name} signed in with vehicle ${vehicleReg}` 
      })
      
      // Reset form
      setTimeout(() => {
        setStaffData(null)
        setStaffBarcode('')
        setVehicleReg('')
        setMessage(null)
        fetchStaffSessions()
      }, 2000)
      
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  // Staff departing with personal vehicle
  const handleStaffDeparture = async (sessionId) => {
    try {
      const { error } = await supabase
        .from('visitors')
        .update({
          time_out: new Date().toISOString(),
          officer_out_id: currentOfficer.id,
          status: 'departed'
        })
        .eq('id', sessionId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Staff signed out successfully' })
      
      setTimeout(() => {
        setMessage(null)
        fetchStaffSessions()
      }, 2000)
      
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  return (
    <Tabs defaultValue="arrival" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="arrival">Staff Sign IN</TabsTrigger>
        <TabsTrigger value="departure">
          Staff Sign OUT
          {staffOnSite.length > 0 && (
            <Badge variant="secondary" className="ml-2">{staffOnSite.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* STAFF ARRIVAL Tab */}
      <TabsContent value="arrival" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Staff Personal Vehicle - Sign IN</CardTitle>
            <CardDescription>Record staff arriving with personal vehicle</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            {/* Scan Staff */}
            <div className="space-y-3">
              <div className="font-medium">Step 1: Scan Staff Barcode</div>
              <BarcodeScanner onScan={handleStaffScan} />
              {staffData && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="font-medium">{staffData.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {staffData.department}
                  </div>
                </div>
              )}
            </div>

            {/* Vehicle Registration */}
            <div className="space-y-3">
              <Label htmlFor="vehicleReg">Step 2: Vehicle Registration</Label>
              <Input
                id="vehicleReg"
                placeholder="e.g., MK-1234"
                value={vehicleReg}
                onChange={(e) => setVehicleReg(e.target.value)}
                disabled={!staffData}
              />
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleStaffArrival} 
              disabled={!staffData || !vehicleReg || loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Processing...' : 'Sign IN'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* STAFF DEPARTURE Tab */}
      <TabsContent value="departure" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Staff on Premises</CardTitle>
            <CardDescription>Staff with personal vehicles currently on-site</CardDescription>
          </CardHeader>
          <CardContent>
            {staffOnSite.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No staff vehicles on premises</p>
            ) : (
              <div className="space-y-3">
                {staffOnSite.map((session) => (
                  <div key={session.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-lg">{session.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Vehicle: {session.vehicle_registration}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {session.host?.department}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Arrived: {new Date(session.time_in).toLocaleString()}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleStaffDeparture(session.id)}
                      >
                        Sign OUT
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}