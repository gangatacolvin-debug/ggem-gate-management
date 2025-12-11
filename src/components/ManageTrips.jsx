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
import { Pencil, CheckCircle } from 'lucide-react'

export default function ManageTrips() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState(null)
  const [message, setMessage] = useState(null)

  // Form fields
  const [odometerEnd, setOdometerEnd] = useState('')
  const [status, setStatus] = useState('out')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchTrips()
  }, [])

  const fetchTrips = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          vehicle:vehicles(registration, notes),
          driver_out:employees!trips_driver_out_id_fkey(name),
          driver_in:employees!trips_driver_in_id_fkey(name)
        `)
        .order('time_out', { ascending: false })
        .limit(50)

      if (error) throw error
      setTrips(data || [])
    } catch (error) {
      console.error('Error fetching trips:', error)
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (trip) => {
    setEditingTrip(trip)
    setOdometerEnd(trip.odometer_end?.toString() || '')
    setStatus(trip.status)
    setNotes(trip.notes || '')
    setDialogOpen(true)
    setMessage(null)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingTrip(null)
  }

  const handleSave = async () => {
    if (status === 'returned' && !odometerEnd) {
      setMessage({ type: 'error', text: 'Ending odometer is required for returned trips' })
      return
    }

    const odometerValue = odometerEnd ? parseInt(odometerEnd) : null
    if (odometerValue && odometerValue < editingTrip.odometer_start) {
      setMessage({ type: 'error', text: 'Ending odometer must be >= starting odometer' })
      return
    }

    setLoading(true)
    try {
      const updateData = {
        status,
        notes,
        updated_at: new Date().toISOString()
      }

      if (status === 'returned') {
        updateData.odometer_end = odometerValue
        updateData.time_in = editingTrip.time_in || new Date().toISOString()
        
        // Update vehicle status and odometer
        await supabase
          .from('vehicles')
          .update({
            status: 'available',
            last_odometer: odometerValue
          })
          .eq('id', editingTrip.vehicle_id)
      }

      const { error } = await supabase
        .from('trips')
        .update(updateData)
        .eq('id', editingTrip.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Trip updated successfully' })
      fetchTrips()
      
      setTimeout(() => {
        closeDialog()
      }, 1500)
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleForceClose = async (trip) => {
    if (!confirm(`Force close trip for ${trip.vehicle.registration}? This will mark it as returned with current odometer.`)) {
      return
    }

    try {
      await supabase
        .from('trips')
        .update({
          status: 'returned',
          time_in: new Date().toISOString(),
          odometer_end: trip.odometer_start,
          notes: 'Force closed by admin'
        })
        .eq('id', trip.id)

      await supabase
        .from('vehicles')
        .update({ status: 'available' })
        .eq('id', trip.vehicle_id)

      setMessage({ type: 'success', text: 'Trip force closed' })
      fetchTrips()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Trips</CardTitle>
        <CardDescription>View and fix trip errors</CardDescription>
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
                  <TableHead>Date Out</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Odometer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    </TableCell>
                    <TableCell>{trip.driver_out.name}</TableCell>
                    <TableCell>{trip.destination}</TableCell>
                    <TableCell className="text-sm">
                      {trip.odometer_start.toLocaleString()}
                      {trip.odometer_end && ` → ${trip.odometer_end.toLocaleString()}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={trip.status === 'returned' ? 'default' : 'secondary'}>
                        {trip.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDialog(trip)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {trip.status === 'out' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleForceClose(trip)}
                            title="Force close trip"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Trip</DialogTitle>
              <DialogDescription>
                Fix trip errors or update trip information
              </DialogDescription>
            </DialogHeader>

            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            {editingTrip && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                  <div><span className="font-medium">Vehicle:</span> {editingTrip.vehicle.registration}</div>
                  <div><span className="font-medium">Driver:</span> {editingTrip.driver_out.name}</div>
                  <div><span className="font-medium">Start Odometer:</span> {editingTrip.odometer_start.toLocaleString()} km</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Trip Status *</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="out">Out</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {status === 'returned' && (
                  <div className="space-y-2">
                    <Label htmlFor="odometerEnd">Ending Odometer (km) *</Label>
                    <Input
                      id="odometerEnd"
                      type="number"
                      placeholder="Enter ending odometer"
                      value={odometerEnd}
                      onChange={(e) => setOdometerEnd(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Admin Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Add notes about this correction..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}