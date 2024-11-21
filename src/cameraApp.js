import React, { useState, useEffect, useRef } from "react";

const CameraApp = () => {
    const [videoDevices, setVideoDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [stream, setStream] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);

    const videoRef = useRef(null); // Video principal
    const processedCanvasRef = useRef(null); // Canvas con detecciones
    const tempCanvasRef = useRef(null); // Canvas temporal para procesamiento
    const captureIntervalRef = useRef(null); // Referencia para intervalos de captura

    const clearCanvas = (canvas) => {
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

    useEffect(() => {
        const getVideoDevices = async () => {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter((device) => device.kind === "videoinput");
            setVideoDevices(videoDevices);
            if (videoDevices.length > 0) {
                setSelectedDevice(videoDevices[0].deviceId);
            }
        };
        getVideoDevices();
    }, []);

    const startCamera = async () => {
        if (selectedDevice) {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: selectedDevice },
            });
            setStream(newStream);
            videoRef.current.srcObject = newStream;
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
        }
        clearCanvas(processedCanvasRef.current);
    };

    const captureAndSendImage = async () => {
        if (videoRef.current && tempCanvasRef.current) {
            const video = videoRef.current;
            const tempCanvas = tempCanvasRef.current;
            const tempContext = tempCanvas.getContext("2d");

            // Ajustar dimensiones a 720p
            tempCanvas.width = 1280;
            tempCanvas.height = 720;

            // Dibujar el frame del video
            tempContext.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

            // Convertir el canvas temporal a un blob
            tempCanvas.toBlob(async (blob) => {
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

                        // Obtener detecciones del backend
                        const data = await response.json();
                        const detections = data.detections || [];

                        // Dibujar en el canvas procesado
                        const processedCanvas = processedCanvasRef.current;
                        const processedContext = processedCanvas.getContext("2d");

                        // Ajustar dimensiones
                        processedCanvas.width = tempCanvas.width;
                        processedCanvas.height = tempCanvas.height;

                        // Dibujar la imagen base
                        processedContext.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
                        processedContext.drawImage(tempCanvas, 0, 0);

                        // Dibujar los cuadros de detección
                        detections.forEach((detection) => {
                            const [x_min, y_min, x_max, y_max] = detection.box;
                            const label = `${detection.class} (${(detection.confidence * 100).toFixed(1)}%)`;

                            // Dibujar rectángulo
                            processedContext.strokeStyle = "red";
                            processedContext.lineWidth = 2;
                            processedContext.strokeRect(x_min, y_min, x_max - x_min, y_max - y_min);

                            // Dibujar texto
                            processedContext.font = "16px Arial";
                            processedContext.fillStyle = "red";
                            processedContext.fillText(label, x_min, y_min - 5);
                        });
                    } catch (error) {
                        console.error("Error al enviar la imagen:", error);
                    }
                }
            }, "image/jpeg");
        }
    };

    const startCapturing = () => {
        setIsCapturing(true);
        console.log("Iniciando Captura");
        captureIntervalRef.current = setInterval(captureAndSendImage, 75);
    };

    const stopCapturing = () => {
        setIsCapturing(false);
        if (captureIntervalRef.current) {
            console.log("Terminando Captura");
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
        }
    };

    return (
        <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
            <h1>Detección de Objetos con Cámara</h1>
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
            <div style={{ marginTop: "10px" }}>
                <button onClick={startCamera}>Iniciar Cámara</button>
                <button onClick={stopCamera}>Detener Cámara</button>
            </div>
            <div style={{ marginTop: "10px" }}>
                <button onClick={startCapturing} disabled={isCapturing}>
                    Iniciar Captura Continua
                </button>
                <button onClick={stopCapturing} disabled={!isCapturing}>
                    Detener Captura Continua
                </button>
            </div>
            <div style={{ display: "flex", marginTop: "20px", gap: "20px" }}>
                <div>
                    <h2>Video de Referencia</h2>
                    <video
                        ref={videoRef}
                        autoPlay
                        style={{ width: "640px", height: "360px", border: "1px solid #ccc" }}
                    />
                </div>
                <div>
                    <h2>Canvas Procesado</h2>
                    <canvas ref={tempCanvasRef} style={{ display: "none" }} />
                    <canvas
                        ref={processedCanvasRef}
                        style={{ width: "640px", height: "360px", border: "1px solid #ccc" }}
                    />
                </div>
            </div>
        </div>
    );
};

export default CameraApp;