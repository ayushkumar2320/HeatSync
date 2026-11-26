import { useMemo } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Hero from './components/Hero'
import ExploreOdisha from './components/ExploreOdisha'
import Prediction from './components/Prediction'
import DisasterManagement from './components/DisasterManagement'
import WebsiteInfo from './components/WebsiteInfo'
import AirQuality from './components/AirQuality'
import { BackendStatusProvider } from './context/BackendStatusContext'
import { getTimelineSteps } from './adapters/dataAdapter'
import './index.css'

function App() {
  // Derive snapshot date from the CURRENT step in heatx15DayData.json so the
  // offline banner can say exactly which date the static data was compiled for.
  const snapshotDate = useMemo(() => {
    const steps = getTimelineSteps()
    const today = steps.find(s => s.state === 'CURRENT')
    return today?.date ?? null
  }, [])

  return (
    <BackendStatusProvider snapshotDate={snapshotDate}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/explore" element={<ExploreOdisha />} />
          <Route path="/prediction" element={<Prediction />} />
          <Route path="/disaster-management" element={<DisasterManagement />} />
          <Route path="/website-info" element={<WebsiteInfo />} />
          <Route path="/air-quality" element={<AirQuality />} />
        </Routes>
      </BrowserRouter>
    </BackendStatusProvider>
  )
}

export default App
