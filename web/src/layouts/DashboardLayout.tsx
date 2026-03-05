import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Activity, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

export function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Sidebar */}
      <aside
        className={`${
          isCollapsed ? 'w-16' : 'w-64'
        } bg-[#09090b] border-r border-zinc-700 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.5)] z-10 flex flex-col transition-all duration-300 ease-in-out`}
      >
        {/* Brand / Title */}
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-2 font-semibold text-lg tracking-tight text-zinc-100 overflow-hidden">
            <Activity className="h-5 w-5 shrink-0 text-indigo-500" />
            <span
              className={`whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
              }`}
            >
              Dashboard
            </span>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-100 transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
          <NavLink
            to="/"
            end
            title="Overview"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
              }`
            }
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span
              className={`whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'
              }`}
            >
              Overview
            </span>
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
