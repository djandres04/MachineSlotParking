import React, { useState, useEffect, useRef } from "react";

const CameraApp = () => {
    const [videoDevices, setVideoDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [stream, setStream] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const captureIntervalRef = useRef(null);

    // Función para obtener los dispositivos de cámara disponibles
    useEffect(() => {
        const getVideoDevices = async () => {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter((device) => device.kind === "videoinput");
            setVideoDevices(videoDevices);
            if (videoDevices.length > 0) {
                setSelectedDevice(videoDevices[0].deviceId); // Seleccionar la primera cámara por defecto
            }
        };

        getVideoDevices();
    }, []);

    // Función para iniciar el stream de la cámara seleccionada
    const startCamera = async () => {
        if (selectedDevice) {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: selectedDevice },
            });
            setStream(newStream);
            videoRef.current.srcObject = newStream;
        }
    };

    // Función para detener el stream
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
        }
    };

    // Función para enviar la imagen al backend y procesar las detecciones
    const captureAndSendImage = async () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");

            // Establecer el tamaño del canvas para que coincida con las dimensiones del video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Dibujar el video en el canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convertir el canvas a un blob (imagen)
            canvas.toBlob(async (blob) => {
                if (blob) {
                    const formData = new FormData();
                    formData.append("file", blob, "image.jpg");

                    try {
                        const response = await fetch("http://127.0.0.1:8000/detect/", {
                            method: "POST",
                            body: formData,
                        });

                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }

                        const data = await response.json();
                        console.log("Respuesta del backend:", data);

                        // Asume que 'detections' es la respuesta del backend
                        const detections = data.detections || [];
                        console.log("Detecciones:", detections);

                        // Llama a la función para dibujar las cajas de detección sobre el canvas
                        drawBoxes(detections, context);
                    } catch (error) {
                        console.error("Error al enviar la imagen:", error);
                    }
                }
            }, "image/jpeg");
        }
    };

    // Función para dibujar las cajas de las detecciones en el canvas
    const drawBoxes = (detections, context) => {
        // Limpiar el canvas antes de dibujar las nuevas cajas
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // Dibujar el video de nuevo en el canvas
        const video = videoRef.current;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

        // Dibujar las cajas de detección sobre la imagen
        detections.forEach((box) => {
            const { x, y, width, height, confidence } = box;

            // Asegurarse de que las cajas no se salgan del canvas
            const maxX = Math.min(x + width, canvasRef.current.width);
            const maxY = Math.min(y + height, canvasRef.current.height);

            const finalWidth = maxX - x;
            const finalHeight = maxY - y;

            // Dibuja el rectángulo (caja)
            context.beginPath();
            context.rect(x, y, finalWidth, finalHeight);
            context.lineWidth = 3;
            context.strokeStyle = "red";
            context.fillStyle = "red";
            context.stroke();

            // Dibuja el texto con el nivel de confianza
            context.font = "20px Arial";
            context.fillText(`Conf: ${confidence.toFixed(2)}`, x, y - 10);
        });
    };

    // Función para iniciar la captura continua
    const startCapturing = () => {
        console.log("Iniciando captura continua...");
        setIsCapturing(true);
        captureIntervalRef.current = setInterval(() => {
            captureAndSendImage(); // Captura la imagen y envíala al backend
        }, 200); // Enviar la imagen cada 200 ms
    };

    // Función para detener la captura continua
    const stopCapturing = () => {
        setIsCapturing(false);
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
        }
    };

    return (
        <div>
            <h1>Aplicación de Cámara y Detección de Objetos</h1>

            {/* Seleccionar cámara */}
            <div>
                <label>Selecciona un dispositivo de cámara:</label>
                <select onChange={(e) => setSelectedDevice(e.target.value)} value={selectedDevice}>
                    {videoDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Cámara ${device.deviceId}`}
                        </option>
                    ))}
                </select>
            </div>

            {/* Botones para iniciar y detener la cámara */}
            <div>
                <button onClick={startCamera}>Iniciar Cámara</button>
                <button onClick={stopCamera}>Detener Cámara</button>
            </div>

            {/* Botones para controlar la captura continua */}
            <div>
                <button onClick={startCapturing} disabled={isCapturing}>
                    Iniciar Captura Continua
                </button>
                <button onClick={stopCapturing} disabled={!isCapturing}>
                    Detener Captura Continua
                </button>
            </div>

            {/* Video y Canvas */}
            <div style={{ position: "relative", display: "inline-block" }}>
                <video
                    ref={videoRef}
                    autoPlay
                    style={{ width: "640px", height: "480px", display: stream ? "block" : "none" }}
                />
                <canvas
                    ref={canvasRef}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        pointerEvents: "none", // Para que no interfiera con el video
                        display: stream ? "block" : "none",
                    }}
                />
            </div>
        </div>
    );
};

export default CameraApp;