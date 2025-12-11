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

export default function ManageKeys() {
  const [keys, setKeys] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingKey, setEditingKey] = useState(null)
  const [message, setMessage] = useState(null)

  // Form fields
  const [keyNumber, setKeyNumber] = useState('')
  const [keyType, setKeyType] = useState('warehouse')
  const [description, setDescription] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [status, setStatus] = useState('available')

  useEffect(() => {
    fetchKeys()
    fetchVehicles()
  }, [])

const fetchKeys = async () => {
  setLoading(true)
  try {
    const { data, error } = await supabase
      .from('keys')
      .select('*')
      .order('key_type')
      .order('key_number')

    if (error) throw error

    // Fetch vehicle info separately for keys that have vehicle_id
    const keysWithVehicles = await Promise.all(
      (data || []).map(async (key) => {
        if (key.vehicle_id) {
          const { data: vehicle } = await supabase
            .from('vehicles')
            .select('registration')
            .eq('id', key.vehicle_id)
            .single()
          
          return { ...key, vehicle }
        }
        return key
      })
    )

    setKeys(keysWithVehicles)
  } catch (error) {
    console.error('Error fetching keys:', error)
  } finally {
    setLoading(false)
  }
}

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, registration, notes')
        .order('registration')

      if (error) throw error
      setVehicles(data || [])
    } catch (error) {
      console.error('Error fetching vehicles:', error)
    }
  }

  const openDialog = (key = null) => {
    if (key) {
      setEditingKey(key)
      setKeyNumber(key.key_number)
      setKeyType(key.key_type)
      setDescription(key.description || '')
      setVehicleId(key.vehicle_id || '')
      setStatus(key.status)
    } else {
      setEditingKey(null)
      setKeyNumber('')
      setKeyType('warehouse')
      setDescription('')
      setVehicleId('')
      setStatus('available')
    }
    setDialogOpen(true)
    setMessage(null)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingKey(null)
  }

  const handleSave = async () => {
    if (!keyNumber || !keyType) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    setLoading(true)
    try {
      const keyData = {
        key_number: keyNumber.toUpperCase(),
        key_type: keyType,
        description,
        vehicle_id: vehicleId || null,
        status,
        updated_at: new Date().toISOString()
      }

      if (editingKey) {
        // Update existing key
        const { error } = await supabase
          .from('keys')
          .update(keyData)
          .eq('id', editingKey.id)

        if (error) throw error
        setMessage({ type: 'success', text: 'Key updated successfully' })
      } else {
        // Create new key
        const { error } = await supabase
          .from('keys')
          .insert(keyData)

        if (error) throw error
        setMessage({ type: 'success', text: 'Key added successfully' })
      }

      fetchKeys()
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
            <CardTitle>Manage Keys</CardTitle>
            <CardDescription>Add or edit vehicle and warehouse keys</CardDescription>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Key
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
                  <TableHead>Key Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Linked Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.key_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {key.key_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{key.description || '-'}</TableCell>
                    <TableCell>
                      {key.vehicle?.registration || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.status === 'available' ? 'default' : 'secondary'}>
                        {key.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDialog(key)}
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
                {editingKey ? 'Edit Key' : 'Add New Key'}
              </DialogTitle>
              <DialogDescription>
                {editingKey ? 'Update key information' : 'Enter key details'}
              </DialogDescription>
            </DialogHeader>

            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyNumber">Key Number *</Label>
                <Input
                  id="keyNumber"
                  placeholder="e.g., WH1, VK-BZ15172"
                  value={keyNumber}
                  onChange={(e) => setKeyNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="keyType">Key Type *</Label>
                <Select value={keyType} onValueChange={setKeyType}>
                  <SelectTrigger id="keyType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vehicle">Vehicle Key</SelectItem>
                    <SelectItem value="warehouse">Warehouse Key</SelectItem>
                    <SelectItem value="office">Office Key</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="e.g., Main Warehouse, Ford Ranger Key"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {keyType === 'vehicle' && (
                <div className="space-y-2">
                  <Label htmlFor="vehicle">Link to Vehicle</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger id="vehicle">
                      <SelectValue placeholder="Select vehicle (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.registration} - {vehicle.notes}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="checked_out">Checked Out</SelectItem>
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