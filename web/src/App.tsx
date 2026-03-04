import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './App.css'

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-900">
      <h1 className="text-4xl font-bold mb-4 text-blue-600">Hello World</h1>
      <p className="text-lg">Welcome to the bundled frontend and backend app!</p>
      <Link to="/about" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 transition">Go to About</Link>
    </div>
  )
}

function About() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-900">
      <h1 className="text-4xl font-bold mb-4 text-green-600">About</h1>
      <p className="text-lg">This is the about page. React Router is working!</p>
      <Link to="/" className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700 transition">Go to Home</Link>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
