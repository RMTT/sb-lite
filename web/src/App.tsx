import { BrowserRouter, Routes, Route, Link, Outlet } from 'react-router-dom'
import './App.css'

function DashboardLayout() {
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

function Overview() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold text-gray-100">Overview</h2>
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-md">
        <p className="text-gray-400">
          Welcome to your dashboard. This area will display key metrics and summaries.
        </p>
      </div>

      {/* Placeholders for future widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <div className="bg-gray-800 h-32 rounded-lg border border-gray-700 shadow flex items-center justify-center text-gray-500">
            Widget Placeholder
         </div>
         <div className="bg-gray-800 h-32 rounded-lg border border-gray-700 shadow flex items-center justify-center text-gray-500">
            Widget Placeholder
         </div>
         <div className="bg-gray-800 h-32 rounded-lg border border-gray-700 shadow flex items-center justify-center text-gray-500">
            Widget Placeholder
         </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
