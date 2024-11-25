import Webcam from 'react-webcam'

export default function VideoCapture({
  isStreaming,
  selectedDevice,
  webcamRef,
  uploadedImage,
  videoConstraints,
  boxHeight,
  boxWidth,
}) {
  return (
    <div>
      <div className="content-title">
        <h3 className="text-content-color">Input</h3>
      </div>
      <div
        className="card"
        style={{
          height: `${boxHeight}px`,
          width: `${boxWidth}px`,
        }}
      >
        {isStreaming && selectedDevice ? (
          <Webcam
            ref={webcamRef}
            audio={false}
            forceScreenshotSourceSize
            videoConstraints={videoConstraints}
            screenshotQuality={1}
            screenshotFormat="image/png"
            width={boxWidth}
            height={boxHeight}
            // style={{
            //   width: '100%',
            //   height: '100%',
            //   objectFit: 'contain',
            // }}
          />
        ) : uploadedImage ? (
          <img
            src={uploadedImage}
            alt="Imagen subida"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <div className="empty-video-container">Video desactivado</div>
        )}
      </div>
    </div>
  )
}
