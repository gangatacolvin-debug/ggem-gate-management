import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Download, Search } from 'lucide-react'

export default function VisitorLogs() {
  const [visitors, setVisitors] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Filters
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchName, setSearchName] = useState('')

  // Fetch visitors with filters
  const fetchVisitors = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('visitors')
        .select(`
          *,
          host:employees!visitors_host_employee_id_fkey(name),
          officer_in:employees!visitors_officer_in_id_fkey(name),
          officer_out:employees!visitors_officer_out_id_fkey(name)
        `)
        .order('time_in', { ascending: false })
        .limit(100)

      // Apply filters
      if (selectedType !== 'all') {
        query = query.eq('visitor_type', selectedType)
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus)
      }

      if (dateFrom) {
        query = query.gte('time_in', new Date(dateFrom).toISOString())
      }

      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        query = query.lte('time_in', endDate.toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      // Filter by name (client-side search)
      let filteredData = data || []
      if (searchName) {
        filteredData = filteredData.filter(visitor => 
          visitor.name.toLowerCase().includes(searchName.toLowerCase()) ||
          visitor.organization?.toLowerCase().includes(searchName.toLowerCase())
        )
      }

      setVisitors(filteredData)
    } catch (error) {
      console.error('Error fetching visitors:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVisitors()
  }, [selectedType, selectedStatus, dateFrom, dateTo])

  // Calculate duration
  const calculateDuration = (timeIn, timeOut) => {
    if (!timeOut) return '-'
    
    const start = new Date(timeIn)
    const end = new Date(timeOut)
    const diffMs = end - start
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHrs > 0) {
      return `${diffHrs}h ${diffMins}m`
    }
    return `${diffMins}m`
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Time In',
      'Time Out',
      'Name',
      'Organization',
      'Purpose',
      'Host',
      'Type',
      'Vehicle Registration',
      'Duration',
      'Status'
    ]

    const rows = visitors.map(visitor => [
      new Date(visitor.time_in).toLocaleString(),
      visitor.time_out ? new Date(visitor.time_out).toLocaleString() : 'N/A',
      visitor.name,
      visitor.organization || 'N/A',
      visitor.purpose,
      visitor.host?.name || 'N/A',
      visitor.visitor_type,
      visitor.vehicle_registration || 'N/A',
      calculateDuration(visitor.time_in, visitor.time_out),
      visitor.status
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `visitor-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Visitor Logs</CardTitle>
            <CardDescription>View and export visitor records</CardDescription>
          </div>
          <Button onClick={exportToCSV} disabled={visitors.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="vehicle">With Vehicle</SelectItem>
                <SelectItem value="walk_in">Walk-in</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="on_premises">On Premises</SelectItem>
                <SelectItem value="departed">Departed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateFrom">From Date</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateTo">To Date</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="searchName">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="searchName"
                placeholder="Name or org..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onBlur={fetchVisitors}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div>
          <div className="text-sm text-muted-foreground mb-2">
            Showing {visitors.length} visitor{visitors.length !== 1 ? 's' : ''}
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : visitors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No visitors found</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time In</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitors.map((visitor) => (
                    <TableRow key={visitor.id}>
                      <TableCell className="text-sm">
                        {new Date(visitor.time_in).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {visitor.name}
                        {visitor.vehicle_registration && (
                          <div className="text-xs text-muted-foreground">
                            Vehicle: {visitor.vehicle_registration}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{visitor.organization || '-'}</TableCell>
                      <TableCell>{visitor.purpose}</TableCell>
                      <TableCell>{visitor.host?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {visitor.visitor_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {calculateDuration(visitor.time_in, visitor.time_out)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={visitor.status === 'departed' ? 'default' : 'secondary'}>
                          {visitor.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}