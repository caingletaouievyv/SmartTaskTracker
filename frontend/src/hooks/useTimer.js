import { useState, useEffect, useRef } from 'react'
import { settingsService } from '../services/settingsService'

export function useTimer(taskId, initialTimeSpent = 0, onTimeUpdate) {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [totalTime, setTotalTime] = useState(initialTimeSpent)
  const intervalRef = useRef(null)
  const startTimeRef = useRef(null)

  useEffect(() => {
    const loadTimer = async () => {
      try {
        const settings = await settingsService.get()
        if (settings?.activeTimer && settings.activeTimer.taskId === taskId && settings.activeTimer.startTime) {
          const elapsed = Math.floor((Date.now() - settings.activeTimer.startTime) / 1000)
          setElapsed(elapsed)
          setIsRunning(true)
          startTimeRef.current = settings.activeTimer.startTime
        }
      } catch (err) {
        console.error('Failed to load timer:', err)
      }
    }
    loadTimer()
  }, [taskId])

  useEffect(() => {
    setTotalTime(initialTimeSpent)
  }, [initialTimeSpent])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
          setElapsed(elapsed)
        }
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning])

  const start = async () => {
    try {
      const settings = await settingsService.get() || {}
      if (settings.activeTimer && settings.activeTimer.taskId !== taskId) {
        await settingsService.update({ ...settings, activeTimer: null })
      }
      const startTime = Date.now()
      startTimeRef.current = startTime
      setIsRunning(true)
      setElapsed(0)
      await settingsService.update({ ...settings, activeTimer: { taskId, startTime } })
    } catch (err) {
      console.error('Failed to save timer:', err)
    }
  }

  const stop = async () => {
    if (startTimeRef.current && isRunning) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const newTotal = totalTime + elapsed
      setTotalTime(newTotal)
      setElapsed(0)
      setIsRunning(false)
      startTimeRef.current = null
      
      try {
        const settings = await settingsService.get() || {}
        await settingsService.update({ ...settings, activeTimer: null })
      } catch (err) {
        console.error('Failed to clear timer:', err)
      }
      
      if (onTimeUpdate) {
        await onTimeUpdate(newTotal)
      }
    }
  }

  const reset = async () => {
    setElapsed(0)
    setIsRunning(false)
    startTimeRef.current = null
    try {
      const settings = await settingsService.get() || {}
      await settingsService.update({ ...settings, activeTimer: null })
    } catch (err) {
      console.error('Failed to clear timer:', err)
    }
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`
  }

  const displayTime = isRunning ? totalTime + elapsed : totalTime

  return {
    isRunning,
    elapsed,
    totalTime: displayTime,
    formattedTime: formatTime(displayTime),
    formattedElapsed: formatTime(elapsed),
    start,
    stop,
    reset
  }
}
