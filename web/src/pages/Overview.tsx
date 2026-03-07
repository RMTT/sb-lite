import { useState, useEffect } from 'react'
import { useSingBox } from '../contexts/SingBoxContext'
import { Square, Play, Router, Clock, Cpu, Download, Upload, ChevronDown, Activity, Globe, Zap } from 'lucide-react'
import { toast } from 'sonner'

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatUptime(startTime: string | null) {
  if (!startTime) return '0s'
  const start = new Date(startTime).getTime()
  const now = new Date().getTime()
  const diffInSeconds = Math.floor((now - start) / 1000)

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

type ProxyNode = {
  type: string
  name: string
  now?: string
  all?: string[]
}

export function Overview() {
  const { status, isLoading, refreshStatus, setAutoStart } = useSingBox()
  const isRunning = status.is_running
  const version = status.version
  const autoStart = status.auto_start
  const startTime = status.start_time


  const [downloadTotal, setDownloadTotal] = useState(0)
  const [uploadTotal, setUploadTotal] = useState(0)
  const [memory, setMemory] = useState(0)
  const [proxies, setProxies] = useState<Record<string, ProxyNode>>({})

  const [uptimeStr, setUptimeStr] = useState('0s')

  const [latencies, setLatencies] = useState<Record<string, { value: number, error: boolean, testing: boolean }>>(() => {
    const saved = localStorage.getItem('singbox_lite_proxy_latencies')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const clean: Record<string, { value: number, error: boolean, testing: boolean }> = {}
        for (const key in parsed) {
          clean[key] = { ...parsed[key], testing: false }
        }
        return clean
      } catch {
        return {}
      }
    }
    return {}
  })

  useEffect(() => {
    localStorage.setItem('singbox_lite_proxy_latencies', JSON.stringify(latencies))
  }, [latencies])

  const handleTestLatency = async (proxyName: string) => {
    setLatencies(prev => ({ ...prev, [proxyName]: { value: 0, error: false, testing: true } }))
    try {
      const res = await fetch(`/api/sing-box/proxies/${encodeURIComponent(proxyName)}/delay?url=http://www.gstatic.com/generate_204&timeout=5000`)
      if (!res.ok) throw new Error('Latency test failed')
      const data = await res.json()
      setLatencies(prev => ({ ...prev, [proxyName]: { value: data.delay || 0, error: false, testing: false } }))
    } catch {
      setLatencies(prev => ({ ...prev, [proxyName]: { value: 0, error: true, testing: false } }))
    }
  }


  useEffect(() => {
    const timer = setInterval(() => {
      setUptimeStr(formatUptime(startTime))
    }, 1000)
    return () => clearInterval(timer)
  }, [startTime])



  const fetchConnections = async () => {
    if (!isRunning) {
      setDownloadTotal(0);
      setUploadTotal(0);
      setMemory(0);
      return;
    }
    try {
      const res = await fetch('/api/sing-box/connections')
      if (res.ok) {
        const data = await res.json()
        setDownloadTotal(data.downloadTotal || 0)
        setUploadTotal(data.uploadTotal || 0)
        setMemory(data.memory || 0)
      }
    } catch {
      console.error('Failed to fetch connections')
    }
  }

  const fetchProxies = async () => {
    if (!isRunning) {
      setProxies({});
      return;
    }
    try {
      const res = await fetch('/api/sing-box/proxies')
      if (res.ok) {
        const data = await res.json()
        if (data && data.proxies) {
           setProxies(data.proxies)
        }
      }
    } catch {
      console.error('Failed to fetch proxies')
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

  const handleSelectProxy = async (selectorName: string, proxyName: string) => {
    try {
      // Optimistic update
      setProxies(prev => ({
        ...prev,
        [selectorName]: {
          ...prev[selectorName],
          now: proxyName
        }
      }))

      const res = await fetch(`/api/sing-box/proxies/${encodeURIComponent(selectorName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: proxyName })
      })

      if (!res.ok) {
        toast.error(`Failed to change proxy for ${selectorName}`)
        fetchProxies() // Revert on failure
      }
    } catch {
      toast.error('Failed to update proxy')
      fetchProxies()
    }
  }

  useEffect(() => {
    fetchConnections()
    fetchProxies()
    const interval = setInterval(() => {
      fetchConnections()
      fetchProxies()
    }, 2000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning])

  const handleStart = async () => {
    try {
      const res = await fetch('/api/sing-box/start', { method: 'POST' })
      if (!res.ok) {
        const msg = await res.text()
        toast.error(`Failed to start: ${msg}`)
      } else {
        toast.success('Started successfully')
        refreshStatus()
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
        refreshStatus()
      }
    } catch {
      toast.error('Failed to stop')
    }
  }

  const selectors = Object.values(proxies).filter(p => p.type === 'Selector' || p.type === 'URLTest' || p.type === 'Fallback')

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Main Control Panel */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="p-6 relative flex-1 flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent pointer-events-none"></div>

            <div className="relative flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`size-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className={`text-xs font-bold uppercase tracking-widest ${isRunning ? 'text-emerald-500' : 'text-red-500'}`}>PROCESS STATUS</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">{isRunning ? 'Running' : 'Stopped'}</h2>
              </div>
              <div className="flex items-center gap-3 bg-zinc-950/50 px-3 py-1.5 rounded-lg border border-zinc-800/50">
                <span className="text-sm font-medium text-zinc-400">Auto Start</span>
                <button
                  onClick={handleToggleAutoStart}
                  disabled={isLoading}
                  className={`w-10 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 ${autoStart ? 'bg-blue-600' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute top-1 bg-white size-4 rounded-full shadow transition-transform ${autoStart ? 'translate-x-5' : 'translate-x-1'}`}></div>
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center flex-1 relative min-h-[100px]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="size-16 rounded-full bg-zinc-900 border border-zinc-700/50 shadow-2xl flex items-center justify-center relative z-10 mb-2">
                <Router className="w-8 h-8 text-zinc-400" strokeWidth={1.5} />
              </div>
              <div className="text-center relative z-10">
                <div className="text-zinc-400 font-medium mb-1 text-xs">Core Version: {version || 'Unknown'}</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 relative z-10 mt-6">
              <button
                  className="flex flex-1 items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleStop}
                  disabled={!isRunning || isLoading}
              >
                <Square className="w-3.5 h-3.5 fill-current" /> Stop
              </button>
              <button
                  className="flex flex-1 items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleStart}
                  disabled={isRunning || isLoading}
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Start
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 h-full">
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 shadow-sm flex flex-col justify-center h-full">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">UPTIME</span>
              <Clock className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-auto">
              <span className="text-xl font-bold tracking-tight text-white">{isRunning ? uptimeStr : '0s'}</span>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 shadow-sm flex flex-col justify-center h-full">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">MEMORY</span>
              <Cpu className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-auto">
              <span className="text-xl font-bold tracking-tight text-white">{isRunning ? formatBytes(memory) : '0 Bytes'}</span>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 shadow-sm flex flex-col justify-center h-full">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">DOWNLOAD</span>
              <Download className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-auto">
              <span className="text-xl font-bold tracking-tight text-white">{isRunning ? formatBytes(downloadTotal) : '0 Bytes'}</span>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 shadow-sm flex flex-col justify-center h-full">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">UPLOAD</span>
              <Upload className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-auto">
              <span className="text-xl font-bold tracking-tight text-white">{isRunning ? formatBytes(uploadTotal) : '0 Bytes'}</span>
            </div>
          </div>
        </div>
      </div>

      {isRunning && selectors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pb-8">
          {selectors.map((selector) => (
            <SelectorPanel
              key={selector.name}
              selector={selector}
              allProxies={proxies}
              onSelectProxy={handleSelectProxy}
              latencies={latencies}
              onTestLatency={handleTestLatency}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SelectorPanel({
  selector,
  allProxies,
  onSelectProxy,
  latencies,
  onTestLatency
}: {
  selector: ProxyNode,
  allProxies: Record<string, ProxyNode>,
  onSelectProxy: (selectorName: string, proxyName: string) => void,
  latencies: Record<string, { value: number, error: boolean, testing: boolean }>,
  onTestLatency: (proxyName: string) => void
}) {
  const storageKey = `singbox_lite_selector_${selector.name}_open`

  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    return saved === 'true'
  })

  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const newState = e.currentTarget.open
    setIsOpen(newState)
    localStorage.setItem(storageKey, String(newState))
  }

  const handleLocalTestLatency = (e: React.MouseEvent, proxyName: string) => {
    e.stopPropagation()
    onTestLatency(proxyName)
  }

  return (
    <details
      className="group bg-zinc-900/40 border border-zinc-800/50 rounded-xl shadow-sm overflow-hidden transition-all duration-200"
      open={isOpen}
      onToggle={handleToggle}
    >
      <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/30 transition-colors select-none list-none [&::-webkit-details-marker]:hidden relative z-10">
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-blue-500/70" />
          <span className="text-sm font-semibold text-zinc-200 tracking-wide">{selector.name}</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800/80 text-zinc-400 uppercase shadow-sm border border-zinc-700/30">{selector.type}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-blue-400/90">{selector.now}</span>
          <ChevronDown className="w-4 h-4 text-zinc-500 group-open:-rotate-180 transition-transform duration-200" />
        </div>
      </summary>

      <div className="p-4 pt-0 border-t border-zinc-800/30 relative">
        <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-black/20 to-transparent pointer-events-none"></div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-4 relative z-10">
          {selector.all?.map((outbound) => {
            const isActive = selector.now === outbound;
            const outboundType = allProxies[outbound]?.type || 'Unknown';
            return (
              <button
                key={outbound}
                onClick={() => onSelectProxy(selector.name, outbound)}
                className={`text-left p-3.5 rounded-lg border transition-all truncate focus:outline-none flex flex-col gap-4 group/btn relative overflow-hidden ${
                  isActive
                    ? 'bg-blue-500/10 border-blue-500/40 border-l-2 border-l-blue-500 shadow-sm'
                    : 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-800/60 hover:border-zinc-700 hover:-translate-y-[1px]'
                }`}
                title={outbound}
              >
                {/* Background glow for active item */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
                )}

                <div className="flex justify-between items-start w-full gap-2 relative z-10">
                  <span className={`text-sm truncate font-medium ${isActive ? 'text-blue-400' : 'text-zinc-300 group-hover/btn:text-zinc-100 transition-colors'}`}>
                    {outbound}
                  </span>

                  <button
                    onClick={(e) => handleLocalTestLatency(e, outbound)}
                    disabled={latencies[outbound]?.testing}
                    className={`shrink-0 p-1 rounded hover:bg-zinc-800/80 transition-colors ${latencies[outbound]?.testing ? 'opacity-50 cursor-wait' : ''} ${isActive ? 'text-blue-400 hover:text-blue-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="Test Latency"
                  >
                    <Zap className={`w-3.5 h-3.5 ${latencies[outbound]?.testing ? 'animate-pulse' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between w-full relative z-10">
                  <div className={`flex items-center gap-1.5 ${isActive ? 'text-blue-500/70' : 'text-zinc-500 group-hover/btn:text-zinc-400'}`}>
                     <Globe className="w-3 h-3" />
                     <span className="text-[10px] uppercase font-bold tracking-widest">
                       {outboundType}
                     </span>
                  </div>

                  {latencies[outbound] && !latencies[outbound].testing && (
                    <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${
                      latencies[outbound].error
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : latencies[outbound].value < 200
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : latencies[outbound].value < 500
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    }`}>
                      {latencies[outbound].error ? 'Error' : `${latencies[outbound].value}ms`}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </details>
  )
}
