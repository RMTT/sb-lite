/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'

interface CoreStatus {
  is_running: boolean
  version: string | null
  auto_start: boolean
  start_time: string | null
}

interface CoreContextType {
  status: CoreStatus
  isLoading: boolean
  refreshStatus: () => Promise<void>
  setAutoStart: (enabled: boolean) => void
}

const defaultStatus: CoreStatus = {
  is_running: false,
  version: null,
  auto_start: false,
  start_time: null
}

const CoreContext = createContext<CoreContextType | undefined>(undefined)

export function CoreProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CoreStatus>(defaultStatus)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sing-box/status')
      if (res.ok) {
        const data = await res.json()
        setStatus({
          is_running: data.is_running,
          version: data.version,
          auto_start: data.auto_start,
          start_time: data.start_time
        })
      }
    } catch {
      console.error('Failed to fetch status')
      setStatus(defaultStatus)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 2000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const setAutoStart = useCallback((enabled: boolean) => {
    setStatus(prev => ({ ...prev, auto_start: enabled }))
  }, [])

  return (
    <CoreContext.Provider value={{ status, isLoading, refreshStatus: fetchStatus, setAutoStart }}>
      {children}
    </CoreContext.Provider>
  )
}

export function useCore() {
  const context = useContext(CoreContext)
  if (context === undefined) {
    throw new Error('useCore must be used within a CoreProvider')
  }
  return context
}
