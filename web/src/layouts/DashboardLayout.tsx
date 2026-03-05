import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Activity, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react'

export function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

  return (
    <div className="flex h-screen bg-base-100 text-base-content font-sans">
      {/* Sidebar */}
      <aside
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-base-200 border-r border-base-300 z-10 flex flex-col transition-all duration-300 ease-in-out`}
      >
        {/* Brand / Title */}
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-base-300">
          <div className="flex items-center gap-2 font-semibold text-lg tracking-tight overflow-hidden">
            <Activity className="h-5 w-5 shrink-0 text-primary" />
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
            className="btn btn-ghost btn-square btn-sm"
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
        <ul className="menu flex-1 p-3 gap-2 overflow-y-auto overflow-x-hidden">
          <li>
            <NavLink
              to="/"
              end
              title="Overview"
              className={({ isActive }) => `${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              <span
                className={`whitespace-nowrap transition-all duration-300 ${
                  isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'
                }`}
              >
                Overview
              </span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/config"
              title="Config"
              className={({ isActive }) => `${isActive ? 'active' : ''}`}
            >
              <Settings className="h-5 w-5 shrink-0" />
              <span
                className={`whitespace-nowrap transition-all duration-300 ${
                  isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'
                }`}
              >
                Config
              </span>
            </NavLink>
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-base-100">
        <div className="max-w-7xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
