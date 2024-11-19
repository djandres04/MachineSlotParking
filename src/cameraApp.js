import React, { useState, useEffect, useRef } from "react";

const CameraApp = () => {
    const [videoDevices, setVideoDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [stream, setStream] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const captureIntervalRef = useRef(null);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

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
            clearCanvas();
        }
    };

    // Función para detener el stream
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
            clearCanvas();
        }
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
            clearCanvas();
        }
    };

    // Función para enviar la imagen al backend y procesar las detecciones
    const captureAndSendImage = async () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");

            // Crear un canvas secundario para el buffer
            const bufferCanvas = document.createElement("canvas");
            const bufferContext = bufferCanvas.getContext("2d");

            // Ajustar dimensiones de ambos canvas al tamaño del video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            bufferCanvas.width = video.videoWidth;
            bufferCanvas.height = video.videoHeight;

            // Dibujar el video en el canvas principal
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convertir el canvas a un blob para enviarlo al backend
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

                        // Detecciones recibidas del backend
                        const detections = data.detections || [];
                        console.log("Detecciones:", detections);

                        // Dibujar las detecciones en el canvas de buffer
                        drawBoxes(detections, bufferContext);

                        // Alternar entre el buffer y el canvas principal
                        context.clearRect(0, 0, canvas.width, canvas.height); // Limpiar el canvas principal
                        context.drawImage(video, 0, 0, canvas.width, canvas.height); // Dibujar el video
                        context.drawImage(bufferCanvas, 0, 0); // Superponer las detecciones del buffer
                    } catch (error) {
                        console.error("Error al enviar la imagen:", error);
                    }
                }
            }, "image/jpeg");
        }
    };

// Función para dibujar las cajas en el buffer canvas
    const drawBoxes = (detections, context) => {
        // Limpiar el canvas de buffer antes de dibujar las nuevas detecciones
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);

        // Dibujar las cajas de detección
        detections.forEach((detection) => {
            const [x_min, y_min, x_max, y_max] = detection.box;
            const label = detection.class;
            const confidence = detection.confidence;

            const width = x_max - x_min;
            const height = y_max - y_min;

            // Dibujar el rectángulo (caja)
            context.beginPath();
            context.rect(x_min, y_min, width, height);
            context.lineWidth = 3;
            context.strokeStyle = "red";
            context.fillStyle = "rgba(255, 0, 0, 0.2)"; // Fondo semitransparente
            context.fill();
            context.stroke();

            // Dibujar el texto con la clase y confianza
            context.font = "18px Arial";
            context.fillStyle = "red";
            const text = `${label} (${(confidence * 100).toFixed(1)}%)`;
            context.fillText(text, x_min, y_min - 5); // Texto arriba de la caja
        });
    };

    // Función para iniciar la captura continua
    const startCapturing = () => {
        setIsCapturing(true);
        const intervalId = setInterval(() => {
            if (setIsCapturing) {
                captureAndSendImage(); // Captura la imagen y envíala al backend
            } else {
                clearInterval(intervalId); // Detener el intervalo cuando deje de capturar
            }
        }, 500); // Cada 200ms
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
                        width: "640px", height: "480px", display: stream ? "block" : "none"
                    }}
                />
            </div>
        </div>
    );
};

export default CameraApp;