import React, { useEffect, useRef, useState } from 'react'
import {
  DeviceSelector,
  ProcessedImage,
  Spinner,
  StartButton,
  VideoCapture,
} from './utils/components'
import CarParking from './utils/icons/car-parking'

const boxWidth = 600
const boxHeight = 338
const dateOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}
const timeDelay = 10000 // Intervalo de tiempo para capturar imágenes

export default function App() {
  const [devices, setDevices] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [processedImage, setProcessedImage] = useState(null)
  const [currentCaptureDate, setCurrentCaptureDate] = useState(null)
  const [uploadedImage, setUploadedImage] = useState(null)
  const fileInputRef = useRef(null)
  const [selectedDevice, setSelectedDevice] = useState({
    deviceId: '',
    label: '',
  })
  const webcamRef = useRef(null)

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target.result)
      }
      reader.readAsDataURL(file)
    } else {
      alert('Por favor, sube un archivo de imagen válido.') // Mensaje de error
    }
  }

  const handleSendImage = async () => {
    if (!uploadedImage) {
      alert('No hay imagen para enviar.')
      return
    }

    try {
      const response = await fetch(uploadedImage)
      const blob = await response.blob()

      const formData = new FormData()
      formData.append('file', blob, 'uploaded_image.jpg')

      const res = await fetch('http://localhost:8000/detect/', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`)
      }

      const processedBlob = await res.blob()
      const processedUrl = URL.createObjectURL(processedBlob)

      setProcessedImage(processedUrl)
    } catch (error) {
      console.error('Error al enviar la imagen:', error)
      alert('Ocurrió un error al procesar la imagen.')
    }
  }

  const captureImage = async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot()
      if (imageSrc) {
        const formattedDate = new Date()
          .toLocaleString('es-ES', dateOptions)
          .replace(',', '')
        setCurrentCaptureDate(formattedDate)
        await sendImageRequest(imageSrc)
      } else {
        alert('No se pudo capturar la imagen.')
      }
    }
  }

  const sendImageRequest = async (imageSrc) => {
    try {
      if (!imageSrc) {
        console.error('Imagen inválida o no disponible.')
        return
      }

      const response = await fetch(imageSrc)
      const blob = await response.blob()

      const formData = new FormData()
      formData.append('file', blob, 'captured_image.jpg')

      const res = await fetch('http://localhost:8000/detect/', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`)
      }

      const processedBlob = await res.blob()
      const processedUrl = URL.createObjectURL(processedBlob)

      setProcessedImage(processedUrl)
    } catch (err) {
      console.error('Error al enviar la imagen:', err)
    }
  }

  const removeProcessedImage = () => {
    setProcessedImage(null)
  }

  const handleDeviceSelect = (e) => {
    setSelectedDevice({
      deviceId: e.target.value,
      label: e.target.label,
    })
    if (isStreaming) {
      setIsStreaming(false)
      setTimeout(() => setIsStreaming(true), 100)
    }
  }

  useEffect(() => {
    const getVideoDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        console.log(devices)
        const videoDevices = devices.filter(
          (device) => device.kind === 'videoinput',
        )
        setDevices(videoDevices)

        if (videoDevices.length > 0) {
          setSelectedDevice({
            deviceId: videoDevices[0].deviceId,
            label: videoDevices[0].label,
          })
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error accediendo a los dispositivos:', error)
      }
    }

    getVideoDevices()
  }, [])

  useEffect(() => {
    if (!isStreaming) return

    const timeoutId = setTimeout(() => {
      captureImage()

      const intervalId = setInterval(captureImage, timeDelay)

      return () => clearInterval(intervalId)
    }, timeDelay)

    return () => clearTimeout(timeoutId)
  }, [isStreaming, captureImage])

  const videoConstraints = {
    deviceId: selectedDevice.deviceId,
    width: {
      ideal: 1920,
      max: 1920,
      min: 640,
    },
    height: {
      ideal: 1080,
      max: 1080,
      min: 480,
    }
  }

  if (isLoading) return <Spinner />

  return (
    <div className="main-container">
      <div className="title-container">
        <h1>Detección de vehículos en tiempo real</h1>
        <CarParking />
      </div>
      <div className="controls-bar-container">
        <label>Seleccionar dispositivo de video:</label>
        <DeviceSelector
          {...{
            selectedDevice,
            devices,
            handleDeviceSelect,
          }}
        />
        <div className="control-buttons">
          <StartButton
            {...{
              isStreaming,
              setIsStreaming,
            }}
          />
          <button
            onClick={() => fileInputRef.current.click()}
            disabled={isStreaming}
          >
            Subir imagen
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
          <button onClick={handleSendImage} disabled={!uploadedImage}>
            Enviar
          </button>
        </div>
      </div>
      <div className="content-container">
        <VideoCapture
          {...{
            isStreaming,
            selectedDevice,
            uploadedImage,
            webcamRef,
            videoConstraints,
            boxHeight,
            boxWidth,
          }}
        />
        <ProcessedImage
          {...{
            processedImage,
            currentCaptureDate,
            removeProcessedImage,
            boxHeight,
            boxWidth,
          }}
        />
      </div>
    </div>
  )
}
