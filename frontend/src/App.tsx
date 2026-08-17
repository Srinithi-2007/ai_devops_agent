import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from '@/context/AppContext'
import Dashboard from '@/pages/Dashboard'
import IncidentMemory from '@/pages/IncidentMemory'
import IncidentDetails from '@/pages/IncidentDetails'
import AIAgent from '@/pages/AIAgent'
import Analytics from '@/pages/Analytics'
import SystemHealth from '@/pages/SystemHealth'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/memory" element={<IncidentMemory />} />
          <Route path="/incident/:id" element={<IncidentDetails />} />
          <Route path="/agent" element={<AIAgent />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/health" element={<SystemHealth />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}
