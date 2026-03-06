import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Router, Square, Play, Clock, Download, Upload } from 'lucide-react'

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function formatUptime(startTimeString: string | null) {
  if (!startTimeString) return '0s'
  const startTime = new Date(startTimeString).getTime()
  const now = new Date().getTime()
  const diffInSeconds = Math.floor((now - startTime) / 1000)

  if (diffInSeconds < 0) return '0s'

  const days = Math.floor(diffInSeconds / (3600 * 24))
  const hours = Math.floor((diffInSeconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((diffInSeconds % 3600) / 60)
  const seconds = diffInSeconds % 60

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)

  return parts.slice(0, 2).join(' ')
}

export function Overview() {
  const [isRunning, setIsRunning] = useState(false)
  const [version, setVersion] = useState<string | null>(null)
  const [autoStart, setAutoStart] = useState(false)
  const [startTime, setStartTime] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [downloadTotal, setDownloadTotal] = useState(0)
  const [uploadTotal, setUploadTotal] = useState(0)

  const [uptimeStr, setUptimeStr] = useState('0s')

  useEffect(() => {
    const timer = setInterval(() => {
      setUptimeStr(formatUptime(startTime))
    }, 1000)
    return () => clearInterval(timer)
  }, [startTime])

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/sing-box/status')
      if (res.ok) {
        const data = await res.json()
        setIsRunning(data.is_running)
        setVersion(data.version)
        setAutoStart(data.auto_start)
        setStartTime(data.start_time)
        setUptimeStr(formatUptime(data.start_time))
      }
    } catch {
      console.error('Failed to fetch status')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/sing-box/connections')
      if (res.ok) {
        const data = await res.json()
        setDownloadTotal(data.downloadTotal || 0)
        setUploadTotal(data.uploadTotal || 0)
      }
    } catch {
      console.error('Failed to fetch connections')
    }
  }

  const handleToggleAutoStart = async () => {
      const newAutoStart = !autoStart
      try {
          const res = await fetch('/api/sing-box/autostart', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ enabled: newAutoStart })
          })
          if (res.ok) {
              setAutoStart(newAutoStart)
              toast.success(`Auto Start on Boot ${newAutoStart ? 'enabled' : 'disabled'}`)
          } else {
              toast.error('Failed to update Auto Start settings')
          }
      } catch {
          toast.error('Failed to update Auto Start settings')
      }
  }

  useEffect(() => {
    fetchStatus()
    fetchConnections()
    const interval = setInterval(() => {
      fetchStatus()
      fetchConnections()
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleStart = async () => {
    try {
      const res = await fetch('/api/sing-box/start', { method: 'POST' })
      if (!res.ok) {
        const msg = await res.text()
        toast.error(`Failed to start: ${msg}`)
      } else {
        toast.success('Started successfully')
        fetchStatus()
      }
    } catch {
      toast.error('Failed to start')
    }
  }

  const handleStop = async () => {
    try {
      const res = await fetch('/api/sing-box/stop', { method: 'POST' })
      if (!res.ok) {
        const msg = await res.text()
        toast.error(`Failed to stop: ${msg}`)
      } else {
        toast.success('Stopped successfully')
        fetchStatus()
      }
    } catch {
      toast.error('Failed to stop')
    }
  }

  return (
    <>
      <div className="max-w-2xl bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden shadow-sm">
        <div className="p-8 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent pointer-events-none"></div>
          <div className="relative flex justify-between items-start mb-16">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className={`size-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className={`text-xs font-bold uppercase tracking-widest ${isRunning ? 'text-emerald-500' : 'text-red-500'}`}>PROCESS STATUS</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white">{isRunning ? 'Running' : 'Stopped'}</h2>
            </div>
            <div className="flex items-center gap-3 bg-zinc-950/50 px-4 py-2 rounded-lg border border-zinc-800/50">
              <span className="text-sm font-medium text-zinc-400">Auto Start on Boot</span>
              <button
                onClick={handleToggleAutoStart}
                disabled={isLoading}
                className={`w-10 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 ${autoStart ? 'bg-blue-600' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-1 bg-white size-4 rounded-full shadow transition-transform ${autoStart ? 'translate-x-5' : 'translate-x-1'}`}></div>
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center mb-16 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="size-24 rounded-full bg-zinc-900 border border-zinc-700/50 shadow-2xl flex items-center justify-center relative z-10 mb-6">
              <Router className="w-12 h-12 text-zinc-400" strokeWidth={1.5} />
            </div>
            <div className="text-center relative z-10">
              <div className="text-zinc-300 font-medium mb-1">Core Version: {version || 'Unknown'}</div>

            </div>
          </div>
          <div className="flex items-center justify-center gap-4 relative z-10">
            <button
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors font-medium w-48 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleStop}
                disabled={!isRunning || isLoading}
            >
              <Square className="w-4 h-4 fill-current" /> Stop
            </button>
            <button
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 transition-colors font-semibold w-48 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleStart}
                disabled={isRunning || isLoading}
            >
              <Play className="w-4 h-4 fill-current" /> Start
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">UPTIME</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white">{isRunning ? uptimeStr : '0s'}</span>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">DOWNLOAD</span>
            <Download className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white">{isRunning ? formatBytes(downloadTotal) : '0 Bytes'}</span>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">UPLOAD</span>
            <Upload className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white">{isRunning ? formatBytes(uploadTotal) : '0 Bytes'}</span>
          </div>
        </div>
      </div>

    </>
  )
}
