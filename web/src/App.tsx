import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DashboardLayout } from './layouts/DashboardLayout'
import { Overview } from './pages/Overview'
import { Config } from './pages/Config'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="config" element={<Config />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
