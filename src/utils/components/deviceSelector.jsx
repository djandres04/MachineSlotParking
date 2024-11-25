export default function DeviceSelector({
  selectedDevice,
  devices,
  handleDeviceSelect,
}) {
  return (
    <select value={selectedDevice.deviceId} onChange={handleDeviceSelect}>
      {devices.map((device) => (
        <option key={device.deviceId} value={device.deviceId}>
          {device.label || `Cámara ${devices.indexOf(device) + 1}`}
        </option>
      ))}
    </select>
  )
}
