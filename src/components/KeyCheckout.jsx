import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import BarcodeScanner from './BarcodeScanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import KeyReturn from './KeyReturn'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'


export default function KeyCheckout() {
  const { currentOfficer } = useAuthStore()
  const [availableKeys, setAvailableKeys] = useState([])
  const [checkedOutKeys, setCheckedOutKeys] = useState([])
  const [selectedKey, setSelectedKey] = useState(null)
  const [personBarcode, setPersonBarcode] = useState('')
  const [personData, setPersonData] = useState(null)
  const [purpose, setPurpose] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingKeys, setFetchingKeys] = useState(true)
  const [message, setMessage] = useState(null)
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)

// Fetch available and checked out keys
const fetchKeys = async () => {
  setFetchingKeys(true)
  try {
    // Available keys - simplified query without vehicle join for now
    const { data: available, error: availError } = await supabase
      .from('keys')
      .select('*')
      .eq('status', 'available')
      .order('key_type')
      .order('key_number')

    console.log('Available keys:', available)
    
    if (availError) {
      console.error('Available keys error details:', availError)
      setMessage({ type: 'error', text: `Error loading keys: ${availError.message}` })
    }

    setAvailableKeys(available || [])

    // Checked out keys with transaction info
    const { data: checkedOut, error: checkError } = await supabase
      .from('key_transactions')
      .select(`
        *,
        key:keys(*),
        person_out:employees!key_transactions_person_out_id_fkey(name, barcode),
        officer_checkout:employees!key_transactions_officer_checkout_id_fkey(name)
      `)
      .eq('status', 'out')
      .order('checkout_time', { ascending: false })

    console.log('Checked out keys:', checkedOut)
    
    if (checkError) {
      console.error('Checked out keys error:', checkError)
    }

    setCheckedOutKeys(checkedOut || [])
  } catch (error) {
    console.error('Error fetching keys:', error)
    setMessage({ type: 'error', text: 'Failed to load keys: ' + error.message })
  } finally {
    setFetchingKeys(false)
  }
}

  useEffect(() => {
    fetchKeys()
  }, [])

  // Handle person barcode scan
  const handlePersonScan = async (barcode) => {
    setPersonBarcode(barcode)
    
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('barcode', barcode)
      .eq('status', 'active')
      .single()

    if (data) {
      setPersonData(data)
      setMessage({ type: 'success', text: `${data.name} verified` })
    } else {
      setMessage({ type: 'error', text: 'Employee not found' })
    }
  }

  // Checkout key
  const handleCheckout = async () => {
    if (!selectedKey || !personData || !purpose) {
      setMessage({ type: 'error', text: 'Please select key, scan person, and enter purpose' })
      return
    }

    setLoading(true)

    try {
      // Create key transaction
      const { error: txError } = await supabase
        .from('key_transactions')
        .insert({
          key_id: selectedKey.id,
          person_out_id: personData.id,
          officer_checkout_id: currentOfficer.id,
          purpose: purpose,
          status: 'out'
        })

      if (txError) throw txError

      // Update key status
      const { error: keyError } = await supabase
        .from('keys')
        .update({ 
          status: 'checked_out',
          last_checkout_by: personData.id,
          last_checkout_time: new Date().toISOString()
        })
        .eq('id', selectedKey.id)

      if (keyError) throw keyError

      setMessage({ type: 'success', text: `Key ${selectedKey.key_number} checked out to ${personData.name}` })
      
      // Reset form
      setSelectedKey(null)
      setPersonData(null)
      setPersonBarcode('')
      setPurpose('')
      
      // Refresh keys
      fetchKeys()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="checkout" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="checkout">Check Out Key</TabsTrigger>
          <TabsTrigger value="return">Return Key</TabsTrigger>
        </TabsList>

        <TabsContent value="checkout" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Check Out Key</CardTitle>
              <CardDescription>Select a key and scan employee barcode</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {message && (
                <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}

              {/* Step 1: Select Key */}
              <div className="space-y-3">
                <Label>Step 1: Select Key</Label>
                {fetchingKeys ? (
                  <div className="text-center py-8 text-muted-foreground">Loading keys...</div>
                ) : availableKeys.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No keys available</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {availableKeys.map((key) => (
                      <button
                        key={key.id}
                        onClick={() => setSelectedKey(key)}
                        className={`p-4 border rounded-lg text-left transition-colors ${
                          selectedKey?.id === key.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">{key.key_number}</div>
                        <div className="text-sm text-muted-foreground">{key.description}</div>
                        <Badge variant="outline" className="mt-2">
                          {key.key_type}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 2: Scan Person */}
              <div className="space-y-3">
                <Label>Step 2: Scan Employee Barcode</Label>
                <BarcodeScanner onScan={handlePersonScan} disabled={!selectedKey} />
                {personData && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="font-medium">{personData.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {personData.role.replace('_', ' ')} - {personData.department}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Purpose */}
              <div className="space-y-3">
                <Label htmlFor="purpose">Step 3: Purpose</Label>
                <Input
                  id="purpose"
                  placeholder="e.g., Warehouse inspection, Vehicle trip, etc."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  disabled={!personData}
                />
              </div>

              {/* Checkout Button */}
              <Button 
                onClick={handleCheckout} 
                disabled={!selectedKey || !personData || !purpose || loading}
                className="w-full"
              >
                {loading ? 'Processing...' : 'Check Out Key'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="return" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Checked Out Keys</CardTitle>
              <CardDescription>Keys currently in use</CardDescription>
            </CardHeader>
            <CardContent>
              {checkedOutKeys.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No keys checked out</p>
              ) : (
                <div className="space-y-3">
                  {checkedOutKeys.map((tx) => (
                    <div key={tx.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{tx.key.key_number}</div>
                          <div className="text-sm text-muted-foreground">{tx.key.description}</div>
                          <div className="text-sm mt-2">
                            <span className="font-medium">Checked out to:</span> {tx.person_out.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Purpose: {tx.purpose}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(tx.checkout_time).toLocaleString()}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedTransaction(tx)
                            setReturnDialogOpen(true)
                          }}
                        >
                          Return
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

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Return Key</DialogTitle>
            <DialogDescription>
              Scan the person returning the key
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <KeyReturn 
              transaction={selectedTransaction}
              onSuccess={() => {
                setReturnDialogOpen(false)
                setSelectedTransaction(null)
                fetchKeys()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}