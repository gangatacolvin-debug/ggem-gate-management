import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import BarcodeScanner from '../components/BarcodeScanner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Login() {
  const navigate = useNavigate()
  const { loginWithBarcode, error, loading } = useAuthStore()
  const [scannedBarcode, setScannedBarcode] = useState('')
  const [scannedEmployee, setScannedEmployee] = useState(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')

  const handleBarcodeScanned = async (barcode) => {
    setScannedBarcode(barcode)
    setPinError('')
    setPin('')
    
    // Verify employee exists before asking for PIN
    const employee = await useAuthStore.getState().verifyEmployee(barcode)
    
    if (employee) {
      setScannedEmployee(employee)
    } else {
      setScannedEmployee(null)
      setPinError('Employee not found')
    }
  }

 const handlePinSubmit = async (e) => {
  e.preventDefault()
  
  if (pin.length !== 4) {
    setPinError('PIN must be 4 digits')
    return
  }

  console.log('Attempting login with barcode:', scannedBarcode, 'and PIN:', pin)
  const success = await loginWithBarcode(scannedBarcode, pin)
  console.log('Login result:', success)
  
  if (success) {
    console.log('Login successful, navigating to dashboard')
    navigate('/dashboard')
  } else {
    console.log('Login failed')
    setPinError('Invalid PIN')
    setPin('')
  }
}

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(value)
    setPinError('')
  }

  const handleReset = () => {
    setScannedBarcode('')
    setScannedEmployee(null)
    setPin('')
    setPinError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">GGEM Gate Management</CardTitle>
          <CardDescription>Scan your employee card and enter PIN</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Scan Barcode */}
          {!scannedEmployee ? (
            <>
              <div className="text-center text-sm text-muted-foreground mb-4">
                Step 1 of 2: Scan Employee Card
              </div>
              <BarcodeScanner onScan={handleBarcodeScanned} />
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {pinError && (
                <Alert variant="destructive">
                  <AlertDescription>{pinError}</AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            /* Step 2: Enter PIN */
            <>
              <div className="text-center text-sm text-muted-foreground mb-4">
                Step 2 of 2: Enter Your PIN
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-medium text-center">{scannedEmployee.name}</div>
                <div className="text-sm text-muted-foreground text-center">
                  {scannedEmployee.role.replace('_', ' ')} - {scannedEmployee.department}
                </div>
              </div>

              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pin">4-Digit PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    placeholder="Enter PIN"
                    value={pin}
                    onChange={handlePinChange}
                    maxLength={4}
                    className="text-center text-2xl tracking-widest"
                    autoFocus
                  />
                </div>

                {pinError && (
                  <Alert variant="destructive">
                    <AlertDescription>{pinError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={pin.length !== 4 || loading}
                    className="flex-1"
                  >
                    {loading ? 'Verifying...' : 'Login'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}