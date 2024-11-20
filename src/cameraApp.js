import React, { useState, useEffect, useRef } from "react";

const CameraApp = () => {
    const [videoDevices, setVideoDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [stream, setStream] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);

    const videoRef = useRef(null); // Video principal
    const referenceVideoRef = useRef(null); // Video de referencia
    const mainCanvasRef = useRef(null);
    const tempCanvasRef = useRef(null);
    const captureIntervalRef = useRef(null);

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
            referenceVideoRef.current.srcObject = newStream; // Vincular stream al video de referencia
            clearCanvas(mainCanvasRef.current);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
            clearCanvas(mainCanvasRef.current);
        }
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
        }
    };

    const captureAndSendImage = async () => {
        if (videoRef.current && tempCanvasRef.current) {
            console.log("Capturando y enviando");
            const video = videoRef.current;
            const tempCanvas = tempCanvasRef.current;
            const mainCanvas = mainCanvasRef.current;

            const tempContext = tempCanvas.getContext("2d");
            const mainContext = mainCanvas.getContext("2d");

            tempCanvas.width = video.videoWidth;
            tempCanvas.height = video.videoHeight;

            mainCanvas.width = video.videoWidth;
            mainCanvas.height = video.videoHeight;

            tempContext.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

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

                        const data = await response.json();
                        const detections = data.detections || [];

                        // Dibujar boxes en el canvas temporal
                        drawBoxes(detections, tempContext);

                        // Limpiar y copiar contenido del canvas temporal al principal
                        mainContext.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
                        mainContext.drawImage(tempCanvas, 0, 0);
                    } catch (error) {
                        console.error("Error al enviar la imagen:", error);
                    }
                }
            }, "image/jpeg");
        }
    };

    const drawBoxes = (detections, context) => {
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        detections.forEach((detection) => {
            const [x_min, y_min, x_max, y_max] = detection.box;
            const label = detection.class;
            const confidence = detection.confidence;

            const width = x_max - x_min;
            const height = y_max - y_min;

            context.beginPath();
            context.rect(x_min, y_min, width, height);
            context.lineWidth = 3;
            context.strokeStyle = "red";
            context.fillStyle = "rgba(255, 0, 0, 0.2)";
            context.fill();
            context.stroke();

            context.font = "18px Arial";
            context.fillStyle = "red";
            const text = `${label} (${(confidence * 100).toFixed(1)}%)`;
            context.fillText(text, x_min, y_min - 5);
        });
    };

    const startCapturing = () => {
        setIsCapturing(true);
        console.log("Iniciando captura");
        captureIntervalRef.current = setInterval(captureAndSendImage, 250);
    };

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
            <div>
                <button onClick={startCamera}>Iniciar Cámara</button>
                <button onClick={stopCamera}>Detener Cámara</button>
            </div>
            <div>
                <button onClick={startCapturing} disabled={isCapturing}>
                    Iniciar Captura Continua
                </button>
                <button onClick={stopCapturing} disabled={!isCapturing}>
                    Detener Captura Continua
                </button>
            </div>
            <div style={{ display: "flex", gap: "20px" }}>
                {/* Video principal con detecciones */}
                <div style={{ position: "relative" }}>
                    <video ref={videoRef} autoPlay style={{ display: stream ? "block" : "none" }} />
                    <canvas ref={mainCanvasRef} style={{ position: "absolute", top: 0, left: 0 }} />
                    <canvas ref={tempCanvasRef} style={{ display: "none" }} />
                </div>
                {/* Video de referencia */}
                <div>
                    <video ref={referenceVideoRef} autoPlay style={{ display: stream ? "block" : "none" }} />
                </div>
            </div>
        </div>
    );
};

export default CameraApp;
