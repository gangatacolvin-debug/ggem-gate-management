import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Button } from '@/components/ui/button'
import { Camera, X } from 'lucide-react'

export default function CameraBarcodeScanner({ onScan, disabled = false }) {
  const videoRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [codeReader, setCodeReader] = useState(null)
  const [lastScan, setLastScan] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    setCodeReader(reader)

    return () => {
      // Cleanup handled in stopScanning
    }
  }, [])

  const startScanning = async () => {
    if (!codeReader || disabled) return

    setError(null)
    setIsScanning(true)

    try {
      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices()
      
      if (videoInputDevices.length === 0) {
        throw new Error('No camera found on device')
      }

      // Use back camera if available (better for scanning)
      const backCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      )
      const selectedDeviceId = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId

      await codeReader.decodeFromVideoDevice(
  selectedDeviceId,
  videoRef.current,
  (result, error) => {
if (result && result.getText() !== lastScan && isScanning) {
  // Clean barcode and remove leading zeros
  let scannedCode = result.getText().trim()
  scannedCode = scannedCode.replace(/^0+/, '')
  console.log('Camera Scanned (cleaned):', scannedCode) // Debug log
      
      setLastScan(scannedCode)
      
      // Stop scanning IMMEDIATELY
      stopScanning()
      
      // Send the scan result
      onScan(scannedCode)
      
      // Reset after 3 seconds to allow re-scanning
      setTimeout(() => {
        setLastScan('')
      }, 3000)
    }
  }
)
    } catch (err) {
      console.error('Camera error:', err)
      setError(err.message || 'Failed to access camera')
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    if (codeReader) {
      try {
        codeReader.stopContinuousDecode()
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject
          const tracks = stream.getTracks()
          tracks.forEach(track => track.stop())
          videoRef.current.srcObject = null
        }
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
    }
    setIsScanning(false)
  }

  return (
    <div className="space-y-4">
      {!isScanning ? (
        <Button
          type="button"
          onClick={startScanning}
          disabled={disabled}
          variant="outline"
          className="w-full"
          size="lg"
        >
          <Camera className="h-5 w-5 mr-2" />
          Scan Barcode with Camera
        </Button>
      ) : (
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full rounded-lg border-2 border-primary"
            style={{ maxHeight: '400px', objectFit: 'cover' }}
          />
          <Button
            type="button"
            onClick={stopScanning}
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
          >
            <X className="h-4 w-4 mr-1" />
            Stop
          </Button>
          <div className="absolute bottom-2 left-0 right-0 text-center">
            <div className="inline-block bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
              Position barcode in camera view
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {lastScan && (
        <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded p-3">
          Scanned: {lastScan}
        </div>
      )}
    </div>
  )
}