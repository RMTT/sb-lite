import { Router as RouterIcon, RefreshCw, Square, Clock, Download, Upload, Activity } from 'lucide-react'
import { useState } from 'react'

export function Overview() {
  const [isRunning, setIsRunning] = useState(true)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-semibold tracking-tight text-white">Dashboard Overview</h1>
        <div className="flex gap-4">
          {/* Top right actions could go here */}
        </div>
      </div>

      {/* Main Status Card */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-800/50 bg-[#0c0c0e] p-8 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

        <div className="relative flex justify-between items-start mb-12">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`h-2 w-2 rounded-full ${isRunning ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
              <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">PROCESS STATUS</span>
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              {isRunning ? 'Running' : 'Stopped'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-sm text-zinc-400">Auto Start on Boot</span>
             <input type="checkbox" className="toggle toggle-primary bg-zinc-700 border-zinc-700 checked:bg-blue-600 toggle-sm" defaultChecked />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center mb-16 relative">
             <div className="absolute inset-0 bg-blue-500/10 blur-[80px] rounded-full w-64 h-64 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
             <div className="h-24 w-24 rounded-full border border-zinc-700/50 bg-[#121214] flex items-center justify-center relative z-10 shadow-lg mb-6">
                <RouterIcon className="h-10 w-10 text-zinc-400" />
             </div>
             <div className="text-center space-y-1 relative z-10">
                 <div className="text-sm text-zinc-300 font-medium">Core Version: 1.8.0-rc.1</div>
                 <div className="text-xs text-zinc-500">Last restart: 2 hours ago</div>
             </div>
        </div>

        <div className="flex justify-center gap-4 relative z-10">
            <button
                className="btn border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-500 w-40 rounded-lg font-medium transition-colors"
                onClick={() => setIsRunning(false)}
            >
                <Square className="h-4 w-4 fill-current mr-2" />
                Stop
            </button>
            <button
                className="btn bg-white hover:bg-zinc-200 text-black border-none w-40 rounded-lg font-medium transition-colors"
                onClick={() => setIsRunning(true)}
            >
                <RefreshCw className="h-4 w-4 mr-2" />
                Restart
            </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Uptime */}
        <div className="rounded-xl border border-zinc-800/50 bg-[#0c0c0e] p-6 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start mb-4">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">UPTIME</span>
              <Clock className="h-4 w-4 text-blue-500" />
           </div>
           <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight">2h 45m</span>
              <span className="text-xs font-medium text-emerald-500">+5%</span>
           </div>
        </div>

        {/* Download */}
        <div className="rounded-xl border border-zinc-800/50 bg-[#0c0c0e] p-6 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start mb-4">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">DOWNLOAD</span>
              <Download className="h-4 w-4 text-blue-500" />
           </div>
           <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight">1.2 GB</span>
              <span className="text-xs font-medium text-emerald-500">+12%</span>
           </div>
        </div>

        {/* Upload */}
        <div className="rounded-xl border border-zinc-800/50 bg-[#0c0c0e] p-6 shadow-sm flex flex-col justify-between">
           <div className="flex justify-between items-start mb-4">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">UPLOAD</span>
              <Upload className="h-4 w-4 text-blue-500" />
           </div>
           <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight">450 MB</span>
              <span className="text-xs font-medium text-red-500">-2%</span>
           </div>
        </div>
      </div>

      {/* Active Connections */}
      <div className="rounded-xl border border-zinc-800/50 bg-[#0c0c0e] overflow-hidden shadow-sm h-64 relative flex flex-col">
          <div className="p-6 pb-0 absolute top-0 left-0 w-full z-10">
              <h3 className="text-sm font-semibold text-white">Active Connections</h3>
              <p className="text-xs text-zinc-500 mt-1">Monitoring global network traffic</p>
          </div>
          <div className="flex-1 w-full flex items-center justify-center bg-gradient-to-b from-transparent to-blue-500/5 relative">
              {/* Fake chart visualization */}
              <Activity className="h-32 w-32 text-blue-500/20 stroke-1 absolute opacity-50" />
              <div className="text-6xl font-thin tracking-widest text-zinc-800/80">
                 300×300
              </div>
          </div>
      </div>
    </div>
  )
}
