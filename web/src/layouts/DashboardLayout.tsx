import { Link, Outlet } from 'react-router-dom'

export function DashboardLayout() {
  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold tracking-wider text-gray-100">Dashboard</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link
            to="/"
            className="block px-4 py-2 rounded-md hover:bg-gray-700 hover:text-white transition-colors text-gray-300"
          >
            Overview
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 bg-gray-900">
        <Outlet />
      </main>
    </div>
  )
}
