import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import BarcodeScanner from './BarcodeScanner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

export default function KeyReturn({ transaction, onSuccess }) {
  const { currentOfficer } = useAuthStore()
  const [returnerBarcode, setReturnerBarcode] = useState('')
  const [returnerData, setReturnerData] = useState(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const isDifferentPerson = returnerData && returnerData.id !== transaction.person_out_id

// Add this console log right after
console.log('Returner ID:', returnerData?.id)
console.log('Person Out ID:', transaction.person_out_id)
console.log('Is Different?:', isDifferentPerson)

  // Handle returner barcode scan
  const handleReturnerScan = async (barcode) => {
    setReturnerBarcode(barcode)
    
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('barcode', barcode)
      .eq('status', 'active')
      .single()

    if (data) {
      setReturnerData(data)
      setMessage({ type: 'success', text: `${data.name} verified` })
    } else {
      setMessage({ type: 'error', text: 'Employee not found' })
    }
  }

  // Return key
  const handleReturn = async () => {
    if (!returnerData) {
      setMessage({ type: 'error', text: 'Please scan employee barcode' })
      return
    }

    if (isDifferentPerson && !reason) {
      setMessage({ type: 'error', text: 'Please select reason for different person' })
      return
    }

    setLoading(true)

    try {
      // Update key transaction
      const { error: txError } = await supabase
        .from('key_transactions')
        .update({
          person_in_id: returnerData.id,
          officer_return_id: currentOfficer.id,
          return_time: new Date().toISOString(),
          reason_if_different_person: isDifferentPerson ? reason : null,
          status: 'returned'
        })
        .eq('id', transaction.id)

      if (txError) throw txError

      // Update key status
      const { error: keyError } = await supabase
        .from('keys')
        .update({ 
          status: 'available',
          last_checkout_by: null,
          last_checkout_time: null
        })
        .eq('id', transaction.key.id)

      if (keyError) throw keyError

      setMessage({ type: 'success', text: `Key ${transaction.key.key_number} returned successfully` })
      
      // Call success callback
      if (onSuccess) onSuccess()
      
      // Reset form
      setTimeout(() => {
        setReturnerData(null)
        setReturnerBarcode('')
        setReason('')
        setMessage(null)
      }, 2000)
      
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Original checkout info */}
      <div className="p-4 bg-gray-50 border rounded-lg space-y-2">
        <div className="text-sm">
          <span className="font-medium">Key:</span> {transaction.key.key_number} - {transaction.key.description}
        </div>
        <div className="text-sm">
          <span className="font-medium">Checked out to:</span> {transaction.person_out.name}
        </div>
        <div className="text-sm">
          <span className="font-medium">Purpose:</span> {transaction.purpose}
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date(transaction.checkout_time).toLocaleString()}
        </div>
      </div>

      {/* Scan returner */}
      <div className="space-y-3">
        <Label>Scan Person Returning Key</Label>
        <BarcodeScanner onScan={handleReturnerScan} disabled={loading} />
        
        {returnerData && (
          <div className={`p-4 border rounded-lg ${
            isDifferentPerson ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
          }`}>
            <div className="font-medium">{returnerData.name}</div>
            <div className="text-sm text-muted-foreground">
              {returnerData.role.replace('_', ' ')} - {returnerData.department}
            </div>
            {isDifferentPerson && (
              <div className="mt-2 text-sm font-medium text-yellow-700">
                Warning: Different person returning key
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reason if different person */}
      {isDifferentPerson && (
        <div className="space-y-3">
          <Label>Reason for Different Person</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger>
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="driver_swapped_mid_trip">Driver swapped mid-trip</SelectItem>
              <SelectItem value="emergency_takeover">Emergency takeover</SelectItem>
              <SelectItem value="breakdown_replacement">Breakdown replacement</SelectItem>
              <SelectItem value="shift_change">Shift change</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          
          {reason === 'other' && (
            <Input
              placeholder="Please specify reason"
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </div>
      )}

      {/* Return Button */}
      <Button 
        onClick={handleReturn} 
        disabled={!returnerData || (isDifferentPerson && !reason) || loading}
        className="w-full"
      >
        {loading ? 'Processing...' : 'Return Key'}
      </Button>
    </div>
  )
}