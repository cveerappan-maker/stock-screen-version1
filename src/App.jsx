import { Routes, Route, Navigate } from 'react-router-dom'
import TopNav from './components/TopNav'
import ThemePage from './pages/ThemePage'
import PeerAnalysisPage from './pages/PeerAnalysisPage'

function App() {
  return (
    <div className="min-h-screen bg-dark-900">
      <TopNav />
      <main className="px-6 py-6 max-w-[1440px] mx-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/theme" replace />} />
          <Route path="/theme" element={<ThemePage />} />
          <Route path="/peers" element={<PeerAnalysisPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
