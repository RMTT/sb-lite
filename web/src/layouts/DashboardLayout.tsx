import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Activity } from 'lucide-react'

export function DashboardLayout() {
  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Sidebar */}
      <aside className="w-64 bg-[#09090b] border-r border-zinc-800/50 flex flex-col">
        {/* Brand / Title */}
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-zinc-800/50">
          <div className="flex items-center gap-2 font-semibold text-lg tracking-tight text-zinc-100">
            <Activity className="h-5 w-5 text-indigo-500" />
            <span>Dashboard</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
              }`
            }
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Overview
          </NavLink>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#09090b]">
        <div className="max-w-7xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
