import { Info, BarChart3, Users, Clock } from 'lucide-react'

export function Overview() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Overview</h2>
        <p className="text-base-content/60 mt-2 text-sm">
          Welcome back. Here is your dashboard summary.
        </p>
      </div>

      {/* Main Banner */}
      <div role="alert" className="alert shadow-sm bg-base-200 border-base-300">
        <Info className="h-6 w-6 text-info shrink-0" />
        <div>
          <h3 className="font-medium text-base-content">Getting Started</h3>
          <div className="text-base-content/60 text-sm mt-1 leading-relaxed">
            This dashboard area is designed to display your most important metrics at a glance. You can easily navigate back here using the sidebar.
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {/* Widget 1 */}
         <div className="card bg-base-200 shadow-sm border border-base-300 hover:border-base-content/20 transition-colors duration-200 group">
           <div className="card-body p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between text-base-content/60 mb-4 group-hover:text-base-content/80 transition-colors">
                <span className="text-sm font-medium tracking-wide">Total Users</span>
                <Users className="h-5 w-5" />
              </div>
              <div className="text-3xl font-semibold">
                1,248
              </div>
           </div>
         </div>

         {/* Widget 2 */}
         <div className="card bg-base-200 shadow-sm border border-base-300 hover:border-base-content/20 transition-colors duration-200 group">
           <div className="card-body p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between text-base-content/60 mb-4 group-hover:text-base-content/80 transition-colors">
                <span className="text-sm font-medium tracking-wide">Active Sessions</span>
                <Clock className="h-5 w-5" />
              </div>
              <div className="text-3xl font-semibold">
                312
              </div>
           </div>
         </div>

         {/* Widget 3 */}
         <div className="card bg-base-200 shadow-sm border border-base-300 hover:border-base-content/20 transition-colors duration-200 group">
           <div className="card-body p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between text-base-content/60 mb-4 group-hover:text-base-content/80 transition-colors">
                <span className="text-sm font-medium tracking-wide">Revenue</span>
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="text-3xl font-semibold">
                $4,890
              </div>
           </div>
         </div>
      </div>
    </div>
  )
}
