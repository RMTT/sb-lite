import { Info, BarChart3, Users, Clock } from 'lucide-react'

export function Overview() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-50">Overview</h2>
        <p className="text-zinc-400 mt-2 text-sm">
          Welcome back. Here is your dashboard summary.
        </p>
      </div>

      {/* Main Banner */}
      <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800/50 shadow-sm backdrop-blur-sm flex items-start gap-4">
        <div className="bg-indigo-500/10 p-2 rounded-lg shrink-0">
          <Info className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-zinc-100">Getting Started</h3>
          <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
            This dashboard area is designed to display your most important metrics at a glance. You can easily navigate back here using the sidebar.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {/* Widget 1 */}
         <div className="bg-zinc-900/40 rounded-xl border border-zinc-800/50 p-6 shadow-sm hover:border-zinc-700/50 transition-colors duration-200 flex flex-col justify-between group">
            <div className="flex items-center justify-between text-zinc-400 mb-4 group-hover:text-zinc-300 transition-colors">
              <span className="text-sm font-medium tracking-wide">Total Users</span>
              <Users className="h-4 w-4" />
            </div>
            <div className="text-3xl font-semibold text-zinc-100">
              1,248
            </div>
         </div>

         {/* Widget 2 */}
         <div className="bg-zinc-900/40 rounded-xl border border-zinc-800/50 p-6 shadow-sm hover:border-zinc-700/50 transition-colors duration-200 flex flex-col justify-between group">
            <div className="flex items-center justify-between text-zinc-400 mb-4 group-hover:text-zinc-300 transition-colors">
              <span className="text-sm font-medium tracking-wide">Active Sessions</span>
              <Clock className="h-4 w-4" />
            </div>
            <div className="text-3xl font-semibold text-zinc-100">
              312
            </div>
         </div>

         {/* Widget 3 */}
         <div className="bg-zinc-900/40 rounded-xl border border-zinc-800/50 p-6 shadow-sm hover:border-zinc-700/50 transition-colors duration-200 flex flex-col justify-between group">
            <div className="flex items-center justify-between text-zinc-400 mb-4 group-hover:text-zinc-300 transition-colors">
              <span className="text-sm font-medium tracking-wide">Revenue</span>
              <BarChart3 className="h-4 w-4" />
            </div>
            <div className="text-3xl font-semibold text-zinc-100">
              $4,890
            </div>
         </div>
      </div>
    </div>
  )
}
