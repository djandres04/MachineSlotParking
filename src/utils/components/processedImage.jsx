import { ProcessedImageBar } from './'

export default function ProcessedImage({
  processedImage,
  currentCaptureDate,
  removeProcessedImage,
  boxHeight,
  boxWidth,
}) {
  return (
    <div>
      <div className="content-title">
        <h3 className="text-content-color">Output</h3>
      </div>
      <div
        className="card"
        style={{
          height: `${boxHeight}px`,
          width: `${boxWidth}px`,
          position: 'relative',
        }}
      >
        {processedImage ? (
          <>
            <img
              src={processedImage}
              alt="Imagen procesada"
              height={boxHeight}
              width={boxWidth}
            />
            <ProcessedImageBar
              {...{ currentCaptureDate, removeProcessedImage }}
            />
          </>
        ) : (
          <div className="empty-prcessed-image-container">
            No hay imagen procesada.
          </div>
        )}
      </div>
    </div>
  )
}
