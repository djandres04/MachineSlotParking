export default function ProcessedImageBar({
  currentCaptureDate,
  removeProcessedImage,
}) {
  return (
    <div className="processed-image-bar-container">
      <span>{currentCaptureDate ?? ''}</span>
      <button onClick={removeProcessedImage}>X</button>
    </div>
  )
}
