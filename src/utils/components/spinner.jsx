export default function Spinner() {
  return (
    <div
      style={{
        display: 'grid',
        placeContent: 'center',
        height: '100vh',
        width: '100vw',
      }}
    >
      <span className="loader"></span>
    </div>
  )
}