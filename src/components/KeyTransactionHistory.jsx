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

export default function KeyTransactionHistory() {
  const [transactions, setTransactions] = useState([])
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Filters
  const [selectedKey, setSelectedKey] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchPerson, setSearchPerson] = useState('')

  // Fetch keys for filter
  useEffect(() => {
    const fetchKeys = async () => {
      const { data } = await supabase
        .from('keys')
        .select('id, key_number, key_type')
        .order('key_number')
      
      setKeys(data || [])
    }
    fetchKeys()
  }, [])

  // Fetch transactions with filters
  const fetchTransactions = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('key_transactions')
        .select(`
          *,
          key:keys(key_number, description, key_type),
          person_out:employees!key_transactions_person_out_id_fkey(name),
          person_in:employees!key_transactions_person_in_id_fkey(name),
          officer_checkout:employees!key_transactions_officer_checkout_id_fkey(name),
          officer_return:employees!key_transactions_officer_return_id_fkey(name)
        `)
        .order('checkout_time', { ascending: false })
        .limit(100)

      // Apply filters
      if (selectedKey !== 'all') {
        query = query.eq('key_id', selectedKey)
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus)
      }

      if (dateFrom) {
        query = query.gte('checkout_time', new Date(dateFrom).toISOString())
      }

      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        query = query.lte('checkout_time', endDate.toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      // Filter by key type and person (client-side)
      let filteredData = data || []
      
      if (selectedType !== 'all') {
        filteredData = filteredData.filter(tx => tx.key.key_type === selectedType)
      }

      if (searchPerson) {
        filteredData = filteredData.filter(tx => 
          tx.person_out?.name.toLowerCase().includes(searchPerson.toLowerCase()) ||
          tx.person_in?.name.toLowerCase().includes(searchPerson.toLowerCase())
        )
      }

      setTransactions(filteredData)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [selectedKey, selectedStatus, dateFrom, dateTo, selectedType])

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Checkout Time',
      'Return Time',
      'Key Number',
      'Key Type',
      'Description',
      'Checked Out To',
      'Returned By',
      'Purpose',
      'Status'
    ]

    const rows = transactions.map(tx => [
      new Date(tx.checkout_time).toLocaleString(),
      tx.return_time ? new Date(tx.return_time).toLocaleString() : 'N/A',
      tx.key.key_number,
      tx.key.key_type,
      tx.key.description,
      tx.person_out.name,
      tx.person_in?.name || 'N/A',
      tx.purpose,
      tx.status
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `key-transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Key Transaction History</CardTitle>
            <CardDescription>View and export key checkout records</CardDescription>
          </div>
          <Button onClick={exportToCSV} disabled={transactions.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-2">
            <Label>Key</Label>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Keys</SelectItem>
                {keys.map(key => (
                  <SelectItem key={key.id} value={key.id}>
                    {key.key_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="vehicle">Vehicle</SelectItem>
                <SelectItem value="warehouse">Warehouse</SelectItem>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="other">Other</SelectItem>
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
                <SelectItem value="out">Out</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
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
            <Label htmlFor="searchPerson">Search Person</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="searchPerson"
                placeholder="Name..."
                value={searchPerson}
                onChange={(e) => setSearchPerson(e.target.value)}
                onBlur={fetchTransactions}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div>
          <div className="text-sm text-muted-foreground mb-2">
            Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No transactions found</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Checkout Time</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Checked Out To</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Return Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {new Date(tx.checkout_time).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {tx.key.key_number}
                        <div className="text-xs text-muted-foreground">
                          {tx.key.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tx.key.key_type}</Badge>
                      </TableCell>
                      <TableCell>{tx.person_out.name}</TableCell>
                      <TableCell>{tx.purpose}</TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'returned' ? 'default' : 'secondary'}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {tx.return_time 
                          ? new Date(tx.return_time).toLocaleString()
                          : '-'
                        }
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