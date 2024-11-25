export default function StartButton({ isStreaming, setIsStreaming }) {
  return (
    <button
      onClick={() => setIsStreaming(!isStreaming)}
      style={{ backgroundColor: isStreaming ? '#fa3f3ffc' : '' }}
    >
      {!isStreaming ? <>&#9658; Iniciar video</> : 'Detener video'}
    </button>
  )
}
