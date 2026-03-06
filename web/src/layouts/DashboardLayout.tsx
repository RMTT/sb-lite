import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Settings, User } from 'lucide-react'

export function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans">
      {/* Sidebar */}
      <aside
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } shrink-0 bg-[#09090b] border-r border-zinc-800/50 z-10 flex flex-col transition-all duration-300 ease-in-out`}
      >
        {/* Brand / Title */}
        <div className="flex h-16 shrink-0 items-center px-4 mb-4 mt-2">
          <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center shrink-0">
               <Settings className="h-5 w-5 text-white" />
            </div>
            <div
              className={`flex flex-col whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
              }`}
            >
              <span className="font-bold text-base leading-tight tracking-tight text-zinc-100">sing-box</span>
              <span className="text-[10px] font-medium text-zinc-500 tracking-wider">NETWORK CORE</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <ul className="flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-zinc-800/50 text-zinc-100' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/30'
              }`}
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
          </li>
          <li>
            <NavLink
              to="/config"
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-zinc-800/50 text-zinc-100' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/30'
              }`}
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span
                className={`whitespace-nowrap transition-all duration-300 ${
                  isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'
                }`}
              >
                Configuration
              </span>
            </NavLink>
          </li>
        </ul>

        {/* User Profile / Version Footer */}
        <div className="p-4 border-t border-zinc-800/50">
             <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-zinc-400" />
                </div>
                <div
                    className={`flex flex-col whitespace-nowrap transition-all duration-300 ${
                        isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
                    }`}
                >
                    <span className="text-sm font-medium text-zinc-200">System Admin</span>
                    <span className="text-[10px] text-zinc-500">v1.8.0-rc.1</span>
                </div>
             </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#09090b] custom-scrollbar relative">
        <div className="max-w-7xl mx-auto p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
