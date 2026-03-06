import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export function Overview() {


  const [isRunning, setIsRunning] = useState(false)
  const [version, setVersion] = useState<string | null>(null)
  const [autoStart, setAutoStart] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/sing-box/status')
      if (res.ok) {
        const data = await res.json()
        setIsRunning(data.is_running)
        setVersion(data.version)
        setAutoStart(data.auto_start)
      }
    } catch {
      console.error('Failed to fetch status')
    } finally {
      setIsLoading(false)
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
    const interval = setInterval(fetchStatus, 2000)
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
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden shadow-sm">
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
              <span className="material-symbols-outlined !text-5xl text-zinc-400">router</span>
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
              <span className="material-symbols-outlined !text-sm">stop</span> Stop
            </button>
            <button
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 transition-colors font-semibold w-48 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleStart}
                disabled={isRunning || isLoading}
            >
              <span className="material-symbols-outlined !text-sm">play_arrow</span> Start
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">UPTIME</span>
            <span className="material-symbols-outlined !text-sm text-blue-500">schedule</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white">2h 45m</span>
            <span className="text-xs font-semibold text-emerald-500">+5%</span>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">DOWNLOAD</span>
            <span className="material-symbols-outlined !text-sm text-blue-500">download</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white">1.2 GB</span>
            <span className="text-xs font-semibold text-emerald-500">+12%</span>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">UPLOAD</span>
            <span className="material-symbols-outlined !text-sm text-blue-500">upload</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white">450 MB</span>
            <span className="text-xs font-semibold text-red-500">-2%</span>
          </div>
        </div>
      </div>

    </>
  )
}
