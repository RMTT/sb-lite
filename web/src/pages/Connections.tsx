import { useState, useEffect } from 'react'
import { X, Globe, ArrowRight, Network } from 'lucide-react'
import { toast } from 'sonner'

interface ConnectionMetadata {
    destinationIP: string
    destinationPort: string
    dnsMode: string
    host: string
    network: string
    processPath: string
    sourceIP: string
    sourcePort: string
    type: string
}

interface Connection {
    chains: string[]
    download: number
    id: string
    metadata: ConnectionMetadata
    rule: string
    rulePayload: string
    start: string
    upload: number
}

interface ConnectionsResponse {
    connections: Connection[]
    downloadTotal: number
    memory: number
    uploadTotal: number
}

// Format bytes to a human readable string (e.g. 1.2 MB)
function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 B'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function Connections() {
    const [connections, setConnections] = useState<Connection[]>([])
    const [, setGlobalStats] = useState({ downloadTotal: 0, uploadTotal: 0, memory: 0 })
    const [isLoading, setIsLoading] = useState(true)

    const fetchConnections = async () => {
        try {
            const res = await fetch('/api/sing-box/connections')
            if (!res.ok) throw new Error('Failed to fetch connections')
            const data: ConnectionsResponse = await res.json()

            // Sort by start time (newest first)
            const sortedConnections = data.connections.sort((a, b) => {
                return new Date(b.start).getTime() - new Date(a.start).getTime()
            })

            setConnections(sortedConnections)
            setGlobalStats({
                downloadTotal: data.downloadTotal,
                uploadTotal: data.uploadTotal,
                memory: data.memory
            })
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchConnections() // Initial fetch
        const interval = setInterval(fetchConnections, 1000)
        return () => clearInterval(interval)
    }, [])

    const handleCloseConnection = async (id: string) => {
        try {
            const res = await fetch(`/api/sing-box/connections/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to close connection')
            toast.success('Connection closed')
            // Optimistically remove from list
            setConnections(prev => prev.filter(c => c.id !== id))
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error closing connection')
        }
    }

    return (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 flex items-center justify-between border-b border-zinc-800/50">
                <div>
                    <h2 className="text-sm font-semibold text-white">Active Connections</h2>
                    <p className="text-xs text-zinc-500 mt-1">Real-time view of sing-box traffic.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800/50 border border-zinc-700/50">
                     <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                     </span>
                     <span className="text-xs font-medium text-zinc-300">{connections.length} Active</span>
                </div>
            </div>

            <div className="divide-y divide-zinc-800/50 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {isLoading && connections.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-sm">Loading connections...</div>
                ) : connections.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-sm">No active connections.</div>
                ) : (
                    connections.map(conn => {
                        const targetHost = conn.metadata.host || conn.metadata.destinationIP;
                        const targetStr = `${targetHost}:${conn.metadata.destinationPort}`;

                        return (
                            <div key={conn.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-zinc-800/20 transition-colors gap-4">
                                <div className="flex items-start sm:items-center gap-4 flex-1 overflow-hidden">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                                        <Globe className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-semibold text-zinc-200 truncate" title={targetStr}>
                                                {targetStr}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-bold tracking-widest uppercase text-zinc-400 shrink-0">
                                                {conn.metadata.network}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                                            <div className="flex items-center gap-1.5">
                                                <Network className="w-3 h-3" />
                                                <span className="truncate max-w-[200px]" title={conn.chains.join(' → ')}>
                                                    {conn.chains.map((chain, idx) => (
                                                        <span key={idx}>
                                                            <span className="text-zinc-300">{chain}</span>
                                                            {idx < conn.chains.length - 1 && <ArrowRight className="inline w-3 h-3 mx-1 text-zinc-600" />}
                                                        </span>
                                                    ))}
                                                </span>
                                            </div>
                                            <span className="text-zinc-600">•</span>
                                            <span className="truncate">{conn.metadata.type}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 sm:gap-4 ml-14 sm:ml-0 shrink-0">
                                    <div className="flex flex-col items-end gap-1 text-xs">
                                        <div className="flex items-center gap-1.5 text-zinc-300">
                                            <span className="text-emerald-400">↓</span> {formatBytes(conn.download)}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-zinc-300">
                                            <span className="text-sky-400">↑</span> {formatBytes(conn.upload)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleCloseConnection(conn.id)}
                                        className="w-8 h-8 flex items-center justify-center rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800/80 transition-colors"
                                        title="Close Connection"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
