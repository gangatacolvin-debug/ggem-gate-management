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
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function ManageEmployees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [message, setMessage] = useState(null)

  // Form fields
  const [barcode, setBarcode] = useState('')
  const [pin, setPin] = useState('1234')
  const [name, setName] = useState('')
  const [role, setRole] = useState('staff')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('active')

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name')

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee)
      setBarcode(employee.barcode)
      setPin(employee.pin || '1234')
      setName(employee.name)
      setRole(employee.role)
      setDepartment(employee.department || '')
      setStatus(employee.status)
    } else {
      setEditingEmployee(null)
      setBarcode('')
      setPin('1234')
      setName('')
      setRole('staff')
      setDepartment('')
      setStatus('active')
    }
    setDialogOpen(true)
    setMessage(null)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingEmployee(null)
  }

const handleSave = async () => {
  if (!barcode || !name || !role || !pin) {
    setMessage({ type: 'error', text: 'Please fill in all required fields' })
    return
  }

  // Validate PIN is exactly 4 digits
  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    setMessage({ type: 'error', text: 'PIN must be exactly 4 digits' })
    return
  }

  setLoading(true)
  try {
    if (editingEmployee) {
      // Update existing employee
      const { error } = await supabase
        .from('employees')
        .update({
          barcode,
          pin,  
          name,
          role,
          department,
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingEmployee.id)

      if (error) throw error
      setMessage({ type: 'success', text: 'Employee updated successfully' })
    } else {
      // Create new employee
      const { error } = await supabase
        .from('employees')
        .insert({
          barcode,
          pin,  
          name,
          role,
          department,
          status
        })

      if (error) throw error
      setMessage({ type: 'success', text: 'Employee added successfully' })
    }

    fetchEmployees()
    setTimeout(() => {
      closeDialog()
    }, 1500)
  } catch (error) {
    setMessage({ type: 'error', text: error.message })
  } finally {
    setLoading(false)
  }
}

  const handleDeactivate = async (employee) => {
    if (!confirm(`Are you sure you want to deactivate ${employee.name}?`)) return

    try {
      const { error } = await supabase
        .from('employees')
        .update({ status: 'inactive' })
        .eq('id', employee.id)

      if (error) throw error
      setMessage({ type: 'success', text: 'Employee deactivated' })
      fetchEmployees()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Manage Employees</CardTitle>
            <CardDescription>Add, edit, or deactivate employees</CardDescription>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
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
                  <TableHead>Name</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell className="font-mono text-sm">{employee.barcode}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {employee.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{employee.department || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDialog(employee)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {employee.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeactivate(employee)}
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </DialogTitle>
              <DialogDescription>
                {editingEmployee ? 'Update employee information' : 'Enter employee details'}
              </DialogDescription>
            </DialogHeader>

            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode *</Label>
                <Input
                  id="barcode"
                  placeholder="Employee barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
              </div>

                        {/* ADD THIS NEW SECTION */}
<div className="space-y-2">
  <Label htmlFor="pin">4-Digit PIN *</Label>
  <Input
    id="pin"
    type="text"
    inputMode="numeric"
    placeholder="1234"
    value={pin}
    onChange={(e) => {
      const value = e.target.value.replace(/\D/g, '').slice(0, 4)
      setPin(value)
    }}
    maxLength={4}
  />
  <p className="text-xs text-muted-foreground">
    {editingEmployee 
      ? 'Change PIN if employee forgot theirs' 
      : 'Default PIN is 1234. Employee should change after first login.'}
  </p>
</div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Employee name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="security_control">Security Control Room</SelectItem>
                    <SelectItem value="security_gate">Security Gate</SelectItem>
                    <SelectItem value="ceo">CEO</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="Department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
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