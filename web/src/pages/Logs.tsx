import { useEffect, useState, useRef, useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import { useSingBox } from '../contexts/SingBoxContext'

interface LogEntry {
  timestamp: string;
  level: string;
  payload: string;
  raw: string;
}

export function Logs() {
  const [level, setLevel] = useState('info')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const { status } = useSingBox()
  const wsRef = useRef<WebSocket | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Format current time
  const getTimestamp = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  }

  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    if (!status.is_running) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/api/sing-box/logs?level=${level}`

    const ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setLogs(prev => [...prev, {
          timestamp: getTimestamp(),
          level: data.level || 'info',
          payload: data.payload || event.data,
          raw: event.data
        }])
      } catch {
        // Not JSON
        let parsedLevel = 'info'
        if (event.data.toLowerCase().includes('[warning]')) parsedLevel = 'warning'
        if (event.data.toLowerCase().includes('[error]')) parsedLevel = 'error'
        if (event.data.toLowerCase().includes('[debug]')) parsedLevel = 'debug'
        if (event.data.toLowerCase().includes('[info]')) parsedLevel = 'info'

        let payload = event.data
        const levelMatch = payload.match(/\[(info|warning|error|debug)\]\s*(.*)/i)
        if (levelMatch) {
            parsedLevel = levelMatch[1].toLowerCase()
            payload = levelMatch[2]
        }

        setLogs(prev => [...prev, {
          timestamp: getTimestamp(),
          level: parsedLevel,
          payload: payload,
          raw: event.data
        }])
      }
    }

    ws.onclose = () => {
      console.log('Logs WebSocket closed')
      // Optional: implement reconnect logic
    }

    wsRef.current = ws
  }, [level, status.is_running])

  useEffect(() => {
    connectWebSocket()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connectWebSocket, status.is_running])

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  const clearLogs = () => {
    setLogs([])
  }

  const getLevelColor = (levelStr: string) => {
    switch (levelStr.toLowerCase()) {
      case 'error': return 'text-red-400'
      case 'warning': return 'text-yellow-400'
      case 'debug': return 'text-purple-400'
      case 'info':
      default: return 'text-blue-400'
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-zinc-400">Log Level</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 transition-colors text-zinc-100"
          >
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
        <button
          onClick={clearLogs}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-400 bg-zinc-900/50 hover:bg-zinc-800/80 hover:text-red-400 border border-zinc-800/50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Clear Logs
        </button>
      </div>

      <div className="flex-1 bg-[#09090b] border border-zinc-800/50 rounded-xl overflow-y-auto custom-scrollbar font-mono text-sm p-4 text-zinc-300 shadow-inner">
        {!status.is_running ? (
          <div className="h-full flex items-center justify-center text-zinc-600 italic">
            Waiting for core to start...
          </div>
        ) : logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600 italic">
            Waiting for logs...
          </div>
        ) : (
          <div className="space-y-1 pb-4">
            {logs.map((log, index) => (
              <div key={index} className="flex gap-3 hover:bg-zinc-900/30 px-2 py-1 rounded transition-colors break-all">
                <span className="text-zinc-500 shrink-0 select-none">[{log.timestamp}]</span>
                <span className={`shrink-0 uppercase w-16 font-semibold ${getLevelColor(log.level)} select-none`}>
                  {log.level}
                </span>
                <span className="text-zinc-200">{log.payload}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}
