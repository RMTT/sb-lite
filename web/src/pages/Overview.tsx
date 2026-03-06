import { useState } from 'react'

export function Overview() {
  const [isRunning, setIsRunning] = useState(true)

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
              <button className="w-10 h-6 rounded-full bg-blue-600 relative transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900">
                <div className="absolute top-1 left-5 bg-white size-4 rounded-full shadow transition-transform"></div>
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center mb-16 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="size-24 rounded-full bg-zinc-900 border border-zinc-700/50 shadow-2xl flex items-center justify-center relative z-10 mb-6">
              <span className="material-symbols-outlined !text-5xl text-zinc-400">router</span>
            </div>
            <div className="text-center relative z-10">
              <div className="text-zinc-300 font-medium mb-1">Core Version: 1.8.0-rc.1</div>
              <div className="text-xs text-zinc-500">Last restart: 2 hours ago</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 relative z-10">
            <button
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors font-medium w-48"
                onClick={() => setIsRunning(false)}
            >
              <span className="material-symbols-outlined !text-sm">stop</span> Stop
            </button>
            <button
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 transition-colors font-semibold w-48"
                onClick={() => setIsRunning(true)}
            >
              <span className="material-symbols-outlined !text-sm">refresh</span> Restart
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

      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden shadow-sm h-[300px] relative flex flex-col">
        <div className="p-6 pb-0 relative z-10">
          <h3 className="text-sm font-semibold text-zinc-200">Active Connections</h3>
          <p className="text-xs text-zinc-500 mt-1">Monitoring global network traffic</p>
        </div>
        <div className="flex-1 flex items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none"></div>
          <div className="text-6xl font-thin tracking-[0.2em] text-zinc-700/50 font-mono">300×300</div>
          <div className="absolute top-1/2 left-1/4 size-1 bg-blue-500 rounded-full blur-[1px]"></div>
          <div className="absolute top-1/3 left-3/4 size-1.5 bg-blue-400 rounded-full blur-[1px]"></div>
        </div>
      </div>
    </>
  )
}
