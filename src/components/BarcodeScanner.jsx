import { useState, useEffect, useRef } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CameraBarcodeScanner from './CameraBarcodeScanner'
import EmployeeSearch from './EmployeeSearch'

export default function BarcodeScanner({ onScan, disabled = false }) {
  const [manualInput, setManualInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [usbBuffer, setUsbBuffer] = useState('')
  const usbTimeoutRef = useRef(null)
  const inputRef = useRef(null)

  // USB Scanner Detection - listens for rapid keyboard input
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (disabled) return

      // Ignore if user is typing in an input field (except our hidden one)
      if (e.target.tagName === 'INPUT' && e.target !== inputRef.current) return
      if (e.target.tagName === 'TEXTAREA') return

      // Enter key means barcode scan is complete
      if (e.key === 'Enter' && usbBuffer.length > 0) {
        e.preventDefault()
        handleUsbScan(usbBuffer)
        setUsbBuffer('')
        return
      }

      // Ignore special keys
      if (e.key.length > 1 && e.key !== 'Enter') return

      // Add character to buffer
      setUsbBuffer(prev => prev + e.key)

      // Clear buffer after 100ms of no input (in case it's manual typing)
      if (usbTimeoutRef.current) {
        clearTimeout(usbTimeoutRef.current)
      }
      usbTimeoutRef.current = setTimeout(() => {
        setUsbBuffer('')
      }, 100)
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => {
      window.removeEventListener('keypress', handleKeyPress)
      if (usbTimeoutRef.current) {
        clearTimeout(usbTimeoutRef.current)
      }
    }
  }, [usbBuffer, disabled])

const handleUsbScan = (barcode) => {
  // Clean barcode - remove whitespace, newlines, carriage returns
  let cleanBarcode = barcode.trim().replace(/[\r\n]/g, '')
  
  // Remove leading zeros (printed cards have leading 0, database doesn't)
  cleanBarcode = cleanBarcode.replace(/^0+/, '')
  
  console.log('USB Scanned (cleaned):', cleanBarcode) // Debug log
  
  setScanning(true)
  onScan(cleanBarcode)
  
  setTimeout(() => {
    setScanning(false)
  }, 2000)
}

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (!manualInput || disabled) return
    
    setScanning(true)
    onScan(manualInput)
    setManualInput('')
    
    setTimeout(() => {
      setScanning(false)
    }, 2000)
  }

  const handleCameraScan = (barcode) => {
    setScanning(true)
    onScan(barcode)
    
    setTimeout(() => {
      setScanning(false)
    }, 2000)
  }

  return (
    <div className="space-y-4">
      {/* Hidden input to capture USB scanner focus */}
      <input
        ref={inputRef}
        type="text"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      <Tabs defaultValue="usb" className="w-full">
<TabsList className="grid w-full grid-cols-4">
  <TabsTrigger value="usb">USB Scanner</TabsTrigger>
  <TabsTrigger value="camera">Camera</TabsTrigger>
  <TabsTrigger value="search">Search</TabsTrigger>
  <TabsTrigger value="manual">Manual</TabsTrigger>
</TabsList>

        <TabsContent value="usb" className="space-y-4">
          <div className="border-2 border-dashed border-primary rounded-lg p-8 text-center bg-primary/5">
            <div className="text-lg font-medium mb-2">USB Scanner Ready</div>
            <div className="text-sm text-muted-foreground">
              {disabled 
                ? 'Scanner disabled - complete previous step first' 
                : 'Scan barcode with your USB scanner device'
              }
            </div>
            {usbBuffer.length > 0 && (
              <div className="mt-4 text-xs text-muted-foreground font-mono">
                Reading: {usbBuffer}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="camera" className="space-y-4">
          <CameraBarcodeScanner onScan={handleCameraScan} disabled={disabled} />
        </TabsContent>

<TabsContent value="search" className="space-y-4">
  <EmployeeSearch 
    onSelect={(employee) => {
      if (employee) {
        handleManualSubmit({ preventDefault: () => {} })
        onScan(employee.barcode)
      }
    }}
    disabled={disabled}
    label="Search Employee by Name"
  />
</TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter barcode number"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              disabled={disabled}
              className="flex-1"
            />
            <Button type="submit" disabled={disabled || !manualInput}>
              Submit
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {scanning && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-700">
            Barcode scanned successfully
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}