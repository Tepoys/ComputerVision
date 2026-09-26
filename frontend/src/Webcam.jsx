import { useEffect, useRef, useState, useCallback } from 'react'

export default function Webcam() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [devices, setDevices] = useState([])
  const [deviceId, setDeviceId] = useState('')
  const [status, setStatus] = useState('idle') // idle | requesting | live | error
  const [errorMessage, setErrorMessage] = useState('')
  const [snapshot, setSnapshot] = useState(null)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const startStream = useCallback(async (id) => {
    setStatus('requesting')
    setErrorMessage('')
    stopStream()

    const constraints = {
      audio: false,
      video: id ? { deviceId: { exact: id } } : true,
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setStatus('live')

      // Populate the device list now that we have permission (labels are
      // only available after a getUserMedia call has been granted).
      const list = await navigator.mediaDevices.enumerateDevices()
      const videoInputs = list.filter((d) => d.kind === 'videoinput')
      setDevices(videoInputs)

      const activeTrack = stream.getVideoTracks()[0]
      const activeId = activeTrack?.getSettings().deviceId
      if (activeId) setDeviceId(activeId)
    } catch (err) {
      setStatus('error')
      setErrorMessage(describeError(err))
    }
  }, [stopStream])

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error')
      setErrorMessage(
        'This browser has no camera API available. Serve the app over HTTPS (or localhost) in a supported browser.'
      )
      return
    }
    startStream()
    return () => stopStream()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDeviceChange = (event) => {
    const id = event.target.value
    setDeviceId(id)
    startStream(id)
  }

  const handleCapture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || status !== 'live') return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setSnapshot(canvas.toDataURL('image/png'))
  }

  const handleRetry = () => startStream(deviceId)

  return (
    <div className="webcam-app">
      <header className="webcam-header">
        <h1>Webcam Viewer</h1>
        <p>A minimal React front end for a local or network camera feed.</p>
      </header>

      <div className="video-frame">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={status === 'live' ? 'video visible' : 'video'}
        />
        {status !== 'live' && (
          <div className="overlay">
            {status === 'requesting' && <p>Requesting camera access…</p>}
            {status === 'idle' && <p>Starting camera…</p>}
            {status === 'error' && (
              <div className="overlay-error">
                <p>{errorMessage}</p>
                <button onClick={handleRetry}>Try again</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="controls">
        {devices.length > 1 && (
          <select value={deviceId} onChange={handleDeviceChange} disabled={status === 'requesting'}>
            {devices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        )}
        <button onClick={handleCapture} disabled={status !== 'live'}>
          Capture photo
        </button>
        <button onClick={handleRetry} disabled={status === 'requesting'}>
          Restart stream
        </button>
      </div>

      {snapshot && (
        <div className="snapshot">
          <h2>Last capture</h2>
          <img src={snapshot} alt="Captured frame from the webcam" />
          <a href={snapshot} download="capture.png">
            Download PNG
          </a>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

function describeError(err) {
  if (err?.name === 'NotAllowedError') {
    return 'Camera access was denied. Allow camera permission for this site and retry.'
  }
  if (err?.name === 'NotFoundError') {
    return 'No camera device was found on this machine.'
  }
  if (err?.name === 'NotReadableError') {
    return 'The camera is already in use by another application.'
  }
  return `Could not start the camera: ${err?.message || 'unknown error'}.`
}
