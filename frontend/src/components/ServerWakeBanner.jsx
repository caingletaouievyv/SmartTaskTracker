import { useState, useEffect, useRef } from 'react'
import { checkServerUp } from '../services/api'

const POLL_MS = 10000

export default function ServerWakeBanner() {
  const [show, setShow] = useState(false)
  const [isWaking, setIsWaking] = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    const onWaking = () => {
      setShow(true)
      setIsWaking(true)
    }
    const onUp = () => {
      setShow(false)
      setIsWaking(false)
    }
    window.addEventListener('server-waking', onWaking)
    window.addEventListener('server-up', onUp)
    return () => {
      window.removeEventListener('server-waking', onWaking)
      window.removeEventListener('server-up', onUp)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isWaking) return
    const poll = async () => {
      if (await checkServerUp()) {
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = null
        setIsWaking(false)
        setShow(false)
        window.dispatchEvent(new CustomEvent('server-up'))
        window.dispatchEvent(new CustomEvent('server-back'))
      }
    }
    pollRef.current = setInterval(poll, POLL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [isWaking])

  if (!show) return null

  return (
    <div
      className="server-wake-banner position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3"
      style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.4)' }}
      role="alert"
      aria-live="polite"
    >
      <div
        className="server-wake-banner-card rounded-3 shadow-lg border-0 p-4 text-center"
        style={{ maxWidth: '360px', backgroundColor: 'var(--bs-body-bg)', color: 'var(--bs-body-color)' }}
      >
        <p className="mb-3 mb-md-2 small text-muted">
          Server is waking up. Auto-retrying every 10s.
        </p>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setShow(false)}
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
