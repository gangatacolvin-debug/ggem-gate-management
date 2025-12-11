import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function VisitorManagement() {
  const { currentOfficer } = useAuthStore()
  const [visitors, setVisitors] = useState([])
  const [employees, setEmployees] = useState([])
  
  // Form fields
  const [visitorName, setVisitorName] = useState('')
  const [organization, setOrganization] = useState('')
  const [purpose, setPurpose] = useState('')
  const [hostEmployeeId, setHostEmployeeId] = useState('')
  const [vehicleRegistration, setVehicleRegistration] = useState('')
  const [visitorType, setVisitorType] = useState('walk_in')
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  // Fetch active visitors and employees
  const fetchData = async () => {
    try {
      // Get active visitors
      const { data: visitorsData } = await supabase
        .from('visitors')
        .select(`
          *,
          host:employees!visitors_host_employee_id_fkey(name),
          officer_in:employees!visitors_officer_in_id_fkey(name)
        `)
        .eq('status', 'on_premises')
        .order('time_in', { ascending: false })

      setVisitors(visitorsData || [])

      // Get employees for host selection
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, name, role, department')
        .eq('status', 'active')
        .order('name')

      setEmployees(employeesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Register visitor
  const handleRegisterVisitor = async () => {
    if (!visitorName || !purpose) {
      setMessage({ type: 'error', text: 'Please enter visitor name and purpose' })
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('visitors')
        .insert({
          name: visitorName,
          organization: organization || null,
          purpose: purpose,
          host_employee_id: hostEmployeeId || null,
          vehicle_registration: vehicleRegistration || null,
          visitor_type: visitorType,
          officer_in_id: currentOfficer.id,
          status: 'on_premises'
        })

      if (error) throw error

      setMessage({ type: 'success', text: `${visitorName} registered successfully` })
      
      // Reset form
      setVisitorName('')
      setOrganization('')
      setPurpose('')
      setHostEmployeeId('')
      setVehicleRegistration('')
      setVisitorType('walk_in')
      
      // Refresh visitors
      fetchData()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  // Check out visitor
  const handleCheckoutVisitor = async (visitorId) => {
    try {
      const { error } = await supabase
        .from('visitors')
        .update({
          time_out: new Date().toISOString(),
          officer_out_id: currentOfficer.id,
          status: 'departed'
        })
        .eq('id', visitorId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Visitor checked out successfully' })
      
      // Refresh visitors
      fetchData()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  return (
    <Tabs defaultValue="register" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="register">Register Visitor</TabsTrigger>
        <TabsTrigger value="active">
          Active Visitors
          {visitors.length > 0 && (
            <Badge variant="secondary" className="ml-2">{visitors.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="register" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Register New Visitor</CardTitle>
            <CardDescription>Record visitor entry to premises</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="visitorName">Visitor Name *</Label>
                <Input
                  id="visitorName"
                  placeholder="Full name"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  placeholder="Company/Organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visitorType">Visitor Type *</Label>
                <Select value={visitorType} onValueChange={setVisitorType}>
                  <SelectTrigger id="visitorType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                    <SelectItem value="vehicle">With Vehicle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {visitorType === 'vehicle' && (
                <div className="space-y-2">
                  <Label htmlFor="vehicleReg">Vehicle Registration</Label>
                  <Input
                    id="vehicleReg"
                    placeholder="e.g., ABC-1234"
                    value={vehicleRegistration}
                    onChange={(e) => setVehicleRegistration(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="host">Host Employee</Label>
                <Select value={hostEmployeeId} onValueChange={setHostEmployeeId}>
                  <SelectTrigger id="host">
                    <SelectValue placeholder="Select employee (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} - {emp.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="purpose">Purpose of Visit *</Label>
                <Input
                  id="purpose"
                  placeholder="e.g., Meeting, Delivery, Inspection"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>
            </div>

            <Button 
              onClick={handleRegisterVisitor} 
              disabled={!visitorName || !purpose || loading}
              className="w-full"
            >
              {loading ? 'Registering...' : 'Register Visitor'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="active" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Visitors on Premises</CardTitle>
            <CardDescription>Currently active visitors</CardDescription>
          </CardHeader>
          <CardContent>
            {visitors.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No visitors on premises</p>
            ) : (
              <div className="space-y-3">
                {visitors.map((visitor) => (
                  <div key={visitor.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="font-medium text-lg">{visitor.name}</div>
                        {visitor.organization && (
                          <div className="text-sm text-muted-foreground">
                            From: {visitor.organization}
                          </div>
                        )}
                        <div className="text-sm">
                          <span className="font-medium">Purpose:</span> {visitor.purpose}
                        </div>
                        {visitor.host && (
                          <div className="text-sm text-muted-foreground">
                            Visiting: {visitor.host.name}
                          </div>
                        )}
                        {visitor.vehicle_registration && (
                          <div className="text-sm text-muted-foreground">
                            Vehicle: {visitor.vehicle_registration}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{visitor.visitor_type.replace('_', ' ')}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Arrived: {new Date(visitor.time_in).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCheckoutVisitor(visitor.id)}
                      >
                        Check Out
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