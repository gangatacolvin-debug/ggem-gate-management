import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil } from 'lucide-react'

export default function ManageVehicles() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [message, setMessage] = useState(null)

  // Form fields
  const [registration, setRegistration] = useState('')
  const [vehicleType, setVehicleType] = useState('company')
  const [notes, setNotes] = useState('')
  const [lastOdometer, setLastOdometer] = useState('0')
  const [status, setStatus] = useState('available')

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('registration')

      if (error) throw error
      setVehicles(data || [])
    } catch (error) {
      console.error('Error fetching vehicles:', error)
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (vehicle = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle)
      setRegistration(vehicle.registration)
      setVehicleType(vehicle.vehicle_type)
      setNotes(vehicle.notes || '')
      setLastOdometer(vehicle.last_odometer.toString())
      setStatus(vehicle.status)
    } else {
      setEditingVehicle(null)
      setRegistration('')
      setVehicleType('company')
      setNotes('')
      setLastOdometer('0')
      setStatus('available')
    }
    setDialogOpen(true)
    setMessage(null)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingVehicle(null)
  }

  const handleSave = async () => {
    if (!registration || !vehicleType) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    const odometerValue = parseInt(lastOdometer)
    if (isNaN(odometerValue) || odometerValue < 0) {
      setMessage({ type: 'error', text: 'Invalid odometer reading' })
      return
    }

    setLoading(true)
    try {
      if (editingVehicle) {
        // Update existing vehicle
        const { error } = await supabase
          .from('vehicles')
          .update({
            registration: registration.toUpperCase(),
            vehicle_type: vehicleType,
            notes,
            last_odometer: odometerValue,
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingVehicle.id)

        if (error) throw error
        setMessage({ type: 'success', text: 'Vehicle updated successfully' })
      } else {
        // Create new vehicle
        const { error } = await supabase
          .from('vehicles')
          .insert({
            registration: registration.toUpperCase(),
            vehicle_type: vehicleType,
            notes,
            last_odometer: odometerValue,
            status,
            current_location: vehicleType === 'ceo' ? 'off_premises' : 'on_premises'
          })

        if (error) throw error
        setMessage({ type: 'success', text: 'Vehicle added successfully' })
      }

      fetchVehicles()
      setTimeout(() => {
        closeDialog()
      }, 1500)
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Manage Vehicles</CardTitle>
            <CardDescription>Add or edit company vehicles</CardDescription>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && !dialogOpen && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {loading && !dialogOpen ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Registration</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Last Odometer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">{vehicle.registration}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {vehicle.vehicle_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{vehicle.notes || '-'}</TableCell>
                    <TableCell>{vehicle.last_odometer.toLocaleString()} km</TableCell>
                    <TableCell>
                      <Badge variant={vehicle.status === 'available' ? 'default' : 'secondary'}>
                        {vehicle.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDialog(vehicle)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
              </DialogTitle>
              <DialogDescription>
                {editingVehicle ? 'Update vehicle information' : 'Enter vehicle details'}
              </DialogDescription>
            </DialogHeader>

            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="registration">Registration Number *</Label>
                <Input
                  id="registration"
                  placeholder="e.g., BZ-15172"
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleType">Vehicle Type *</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger id="vehicleType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company Vehicle</SelectItem>
                    <SelectItem value="ceo">CEO Vehicle</SelectItem>
                    <SelectItem value="personal">Personal Vehicle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Description/Notes</Label>
                <Input
                  id="notes"
                  placeholder="e.g., Ford Ranger, Hino Truck"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastOdometer">Current Odometer (km) *</Label>
                <Input
                  id="lastOdometer"
                  type="number"
                  placeholder="0"
                  value={lastOdometer}
                  onChange={(e) => setLastOdometer(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_use">In Use</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}