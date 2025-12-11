import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import BarcodeScanner from '../components/BarcodeScanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Login() {
  const navigate = useNavigate()
  const { loginWithBarcode, isAuthenticated, loading, error, clearError } = useAuthStore()
  const [manualBarcode, setManualBarcode] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const handleBarcodeScanned = async (barcode) => {
    clearError()
    await loginWithBarcode(barcode)
  }

  const handleManualLogin = async (e) => {
    e.preventDefault()
    if (!manualBarcode) return
    clearError()
    await loginWithBarcode(manualBarcode)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">GGEM Gate Management</CardTitle>
          <CardDescription>
            Scan your employee barcode to log in
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <BarcodeScanner 
              onScan={handleBarcodeScanned}
              disabled={loading}
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  Or enter manually
                </span>
              </div>
            </div>

            <form onSubmit={handleManualLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">Employee Barcode</Label>
                <Input
                  id="barcode"
                  type="text"
                  placeholder="41486001051"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  disabled={loading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={loading || !manualBarcode}
              >
                {loading ? 'Logging in...' : 'Log In'}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}