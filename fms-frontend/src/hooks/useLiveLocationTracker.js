import { useEffect, useRef, useState } from 'react'
import { gpsAPI } from '../services/api'

// ── useLiveLocationTracker ───────────────────────────────────────────────
// Uses the device's real GPS (via the browser Geolocation API — works on
// phones and laptops, no hardware tracker needed) and pushes the driver's
// actual position to the backend while a trip is in progress.
//
// watchPosition fires whenever the device's GPS reports a new fix (varies
// by device, often every few seconds while moving). We throttle outbound
// pushes to MIN_PUSH_INTERVAL so we don't spam the server if the browser
// fires faster than that.
//
// Usage:
//   const { status, lastPush, error } = useLiveLocationTracker(vehicleId, isActive)

const MIN_PUSH_INTERVAL = 5000 // ms between pushes, even if GPS updates faster

export function useLiveLocationTracker(vehicleId, isActive) {
  const [status, setStatus] = useState('idle') // idle | requesting | tracking | error | unsupported
  const [lastPush, setLastPush] = useState(null)
  const [error, setError] = useState(null)
  const watchIdRef = useRef(null)
  const lastPushTimeRef = useRef(0)
  const lastHeadingRef = useRef(null)

  useEffect(() => {
    // Only track when there's an active trip with a known vehicle, and the
    // browser actually supports geolocation.
    if (!isActive || !vehicleId) {
      setStatus('idle')
      return
    }
    if (!('geolocation' in navigator)) {
      setStatus('unsupported')
      setError('This browser/device does not support GPS location')
      return
    }

    setStatus('requesting')

    const onPosition = (pos) => {
      setStatus('tracking')
      setError(null)

      const now = Date.now()
      if (now - lastPushTimeRef.current < MIN_PUSH_INTERVAL) return // throttle
      lastPushTimeRef.current = now

      const { latitude, longitude, speed, heading } = pos.coords
      // speed comes in m/s from the browser (or null if device can't tell);
      // convert to km/h to match what the rest of the app expects.
      const speed_kmh = speed != null && speed >= 0 ? Math.round(speed * 3.6) : 0
      // heading can be null when stationary — keep the last known value
      // instead of snapping the marker to 0 every time the vehicle stops.
      if (heading != null && !Number.isNaN(heading)) lastHeadingRef.current = heading

      gpsAPI.push({
        vehicle_id: vehicleId,
        latitude,
        longitude,
        speed_kmh,
        heading: lastHeadingRef.current ?? 0,
        accuracy_m: pos.coords.accuracy,
      })
        .then(() => setLastPush(new Date()))
        .catch((err) => setError(err.response?.data?.message || 'Failed to push location'))
    }

    const onError = (err) => {
      setStatus('error')
      setError(
        err.code === err.PERMISSION_DENIED
          ? 'Location permission denied — enable it in your browser/device settings to track this trip'
          : err.message || 'Unable to get GPS location'
      )
    }

    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 15000,
    })

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [isActive, vehicleId])

  return { status, lastPush, error }
}