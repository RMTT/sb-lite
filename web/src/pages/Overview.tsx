import { useEffect, useState } from 'react'
import { Server, Activity, Power, RefreshCw, Settings } from 'lucide-react'
import { toast } from 'sonner'

interface StatusResponse {
  running: boolean;
  auto_start: boolean;
}

export function Overview() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/sing-box/status')
      if (!res.ok) throw new Error('Failed to fetch status')
      const data = await res.json()
      setStatus(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error fetching status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // Poll status every 5 seconds
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleStart = async () => {
    try {
      const res = await fetch('/api/sing-box/start', { method: 'POST' })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text)
      }
      toast.success('sing-box started successfully')
      fetchStatus()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start sing-box')
    }
  }

  const handleStop = async () => {
    try {
      const res = await fetch('/api/sing-box/stop', { method: 'POST' })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text)
      }
      toast.success('sing-box stopped')
      fetchStatus()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to stop sing-box')
    }
  }

  const handleToggleAutoStart = async () => {
    if (!status) return
    const newValue = !status.auto_start
    try {
      const res = await fetch('/api/sing-box/auto-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_start: newValue })
      })
      if (!res.ok) {
         const text = await res.text()
         throw new Error(text)
      }
      setStatus({ ...status, auto_start: newValue })
      toast.success(`Auto-start ${newValue ? 'enabled' : 'disabled'}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to toggle auto-start')
    }
  }

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  const isRunning = status?.running ?? false

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Overview</h2>
          <p className="text-zinc-400 mt-2 text-sm">
            Manage your sing-box network core.
          </p>
        </div>
      </div>

      <div className="max-w-3xl">
        <div className="bg-[#09090b] border border-zinc-800/50 rounded-xl overflow-hidden shadow-sm">
          <div className="p-8">
            <div className="flex justify-between items-start mb-12">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {isRunning ? (
                    <>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-semibold text-emerald-500 tracking-wide uppercase">Running</span>
                    </>
                  ) : (
                    <>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-zinc-600"></span>
                      </span>
                      <span className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">Stopped</span>
                    </>
                  )}
                </div>
                <h3 className="text-2xl font-bold tracking-tight">Process Status</h3>
              </div>

              <div className="flex items-center gap-3 bg-zinc-900/50 px-4 py-2 rounded-lg border border-zinc-800/50">
                <Settings className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">Auto Start on Boot</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={status?.auto_start ?? false}
                  onChange={handleToggleAutoStart}
                />
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative group mb-8">
                <div className={`absolute -inset-4 bg-gradient-to-r ${isRunning ? 'from-indigo-500/20 to-emerald-500/20' : 'from-zinc-500/10 to-zinc-600/10'} rounded-full blur-2xl transition-all duration-1000`}></div>
                <div className={`relative size-32 rounded-full flex items-center justify-center border ${isRunning ? 'bg-zinc-900/80 border-indigo-500/30' : 'bg-zinc-900 border-zinc-800'}`}>
                  {isRunning ? (
                    <Activity className="w-16 h-16 text-indigo-400 animate-pulse" />
                  ) : (
                    <Server className="w-16 h-16 text-zinc-600" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 pt-4 border-t border-zinc-800/50">
              {isRunning ? (
                <>
                  <button
                    onClick={handleStop}
                    className="flex-1 max-w-[200px] py-2.5 px-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <Power className="w-4 h-4" />
                    Stop
                  </button>
                  <button
                    onClick={handleStart}
                    className="flex-1 max-w-[200px] py-2.5 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 transition-colors font-medium text-sm flex items-center justify-center gap-2 shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Restart
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStart}
                  className="flex-1 max-w-[416px] py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors font-medium text-sm flex items-center justify-center gap-2 shadow-sm"
                >
                  <Power className="w-4 h-4" />
                  Start Process
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
