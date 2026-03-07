import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Network, LayoutDashboard, Settings, Activity, FileText } from 'lucide-react'

export function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved === 'true'
  })
  const location = useLocation()

  // State to hold any extra actions a child page wants to inject into the header
  const [headerAction, setHeaderAction] = useState<React.ReactNode>(null)

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090b] text-zinc-100 antialiased font-sans">
      {/* Sidebar */}
      <aside
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } border-r border-zinc-800/50 flex flex-col bg-zinc-950 transition-all duration-300 ease-in-out shrink-0 z-20`}
      >
        <div
           className="p-6 flex items-center gap-3 cursor-pointer overflow-hidden"
           onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="size-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 shrink-0">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div className={`flex flex-col whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
            <h1 className="text-sm font-bold tracking-tight text-zinc-100 leading-tight">sing-box</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold leading-tight">NETWORK CORE</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-100'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" strokeWidth={2} />
            <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}`}>Overview</span>
          </NavLink>

          <NavLink
            to="/connections"
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-100'
            }`}
          >
            <Activity className="w-5 h-5 shrink-0" strokeWidth={2} />
            <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}`}>Connections</span>
          </NavLink>

          <NavLink
            to="/logs"
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-100'
            }`}
          >
            <FileText className="w-5 h-5 shrink-0" strokeWidth={2} />
            <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}`}>Logs</span>
          </NavLink>

          <NavLink
            to="/config"
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-100'
            }`}
          >
            <Settings className="w-5 h-5 shrink-0" strokeWidth={2} />
            <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}`}>Config</span>
          </NavLink>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative bg-[#09090b] custom-scrollbar">
        {/* Top Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-800/50 bg-[#09090b]/80 backdrop-blur-md">
           <div className="flex items-center gap-2">
               <span className="text-base font-semibold text-zinc-100">
                  {location.pathname === '/' ? 'Dashboard Overview' : location.pathname === '/connections' ? 'Connections' : location.pathname === '/logs' ? 'Logs' : 'Configuration'}
               </span>
           </div>
           {/* Render injected header action if any */}
           {headerAction && (
             <div className="flex items-center">
                 {headerAction}
             </div>
           )}
        </header>

        {/* Content Container */}
        <div className="w-full mx-auto px-6 py-6 sm:px-8 lg:px-8 space-y-8">
            <Outlet context={{ setHeaderAction }} />
        </div>
      </main>
    </div>
  )
}
