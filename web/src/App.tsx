import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { DashboardLayout } from './layouts/DashboardLayout'
import { Overview } from './pages/Overview'
import { Config } from './pages/Config'
import { Connections } from './pages/Connections'
import { Logs } from './pages/Logs'
import { CoreProvider } from './contexts/CoreContext'
import './App.css'

function App() {
  return (
    <CoreProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          theme="dark"
          toastOptions={{
            className: 'bg-[#18181b] border-zinc-800 text-zinc-100'
          }}
        />
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="config" element={<Config />} />
            <Route path="connections" element={<Connections />} />
            <Route path="logs" element={<Logs />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CoreProvider>
  )
}

export default App
