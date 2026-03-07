import { useState, useEffect } from 'react'
import { X, Globe, ArrowRight, Network, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useOutletContext } from 'react-router-dom'

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
    const [searchQuery, setSearchQuery] = useState('')

    // Inject header action
    const { setHeaderAction } = useOutletContext<{ setHeaderAction: (node: React.ReactNode) => void }>()

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

    useEffect(() => {
        // Set header action to search box
        setHeaderAction(
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                    type="text"
                    placeholder="Search connections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all shadow-sm"
                />
            </div>
        )
        // Cleanup on unmount
        return () => setHeaderAction(null)
    }, [searchQuery, setHeaderAction])

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

    const filteredConnections = connections.filter(conn => {
        const query = searchQuery.toLowerCase()
        if (!query) return true

        const targetHost = conn.metadata.host || conn.metadata.destinationIP
        const targetStr = `${targetHost}:${conn.metadata.destinationPort}`

        return (
            targetStr.toLowerCase().includes(query) ||
            conn.metadata.network.toLowerCase().includes(query) ||
            conn.chains.join(' ').toLowerCase().includes(query) ||
            conn.metadata.type.toLowerCase().includes(query)
        )
    })

    return (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/50 gap-4">
                <div>
                    <h2 className="text-sm font-semibold text-white">Active Connections</h2>
                    <p className="text-xs text-zinc-500 mt-1">Real-time view of sing-box traffic.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-2 sm:py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 shrink-0">
                         <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                         </span>
                         <span className="text-xs font-medium text-zinc-300">{connections.length} Active</span>
                    </div>
                </div>
            </div>

            <div className="w-full">
                {/* Header Columns */}
                <div className="grid grid-cols-12 gap-4 pb-3 border-b border-zinc-800/50 text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4 pt-4">
                    <div className="col-span-6 sm:col-span-5 pl-12">Destination</div>
                    <div className="col-span-4 hidden sm:block">Routing</div>
                    <div className="col-span-4 sm:col-span-2 text-right">Traffic</div>
                    <div className="col-span-2 sm:col-span-1 text-right">Action</div>
                </div>

                <div className="divide-y divide-zinc-800/50 max-h-[65vh] overflow-y-auto custom-scrollbar">
                    {isLoading && connections.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-sm">Loading connections...</div>
                    ) : connections.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-sm">No active connections.</div>
                    ) : filteredConnections.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-sm">No connections match your filter.</div>
                    ) : (
                        filteredConnections.map(conn => {
                            const targetHost = conn.metadata.host || conn.metadata.destinationIP;
                            const targetStr = `${targetHost}:${conn.metadata.destinationPort}`;

                            return (
                                <div key={conn.id} className="grid grid-cols-12 gap-4 items-center p-4 hover:bg-zinc-800/20 transition-colors group">
                                    {/* Destination Column */}
                                    <div className="col-span-6 sm:col-span-5 flex items-center gap-4 overflow-hidden">
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
                                            <span className="text-xs text-zinc-500 truncate" title={conn.metadata.type}>{conn.metadata.type}</span>
                                        </div>
                                    </div>

                                    {/* Routing Column */}
                                    <div className="col-span-4 hidden sm:flex items-center gap-3 text-xs text-zinc-500 overflow-hidden">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <Network className="w-3 h-3 shrink-0" />
                                            <div className="truncate flex items-center gap-1" title={conn.chains.join(' → ')}>
                                                {conn.chains.map((chain, idx) => (
                                                    <span key={idx} className="flex items-center gap-1">
                                                        <span className="text-zinc-300 truncate">{chain}</span>
                                                        {idx < conn.chains.length - 1 && <ArrowRight className="w-3 h-3 text-zinc-600 shrink-0" />}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Traffic Column */}
                                    <div className="col-span-4 sm:col-span-2 flex flex-col items-end gap-1 text-xs justify-center">
                                        <div className="flex items-center gap-1.5 text-zinc-300">
                                            <span className="text-emerald-400">↓</span> {formatBytes(conn.download)}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-zinc-300">
                                            <span className="text-sky-400">↑</span> {formatBytes(conn.upload)}
                                        </div>
                                    </div>

                                    {/* Action Column */}
                                    <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                                        <button
                                            onClick={() => handleCloseConnection(conn.id)}
                                            className="w-8 h-8 flex items-center justify-center rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800/80 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
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
        </div>
    )
}
