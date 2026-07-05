import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import './index.css'

export default function App() {
  const [participant, setParticipant] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('orevy_participant')
    const adminSaved = localStorage.getItem('orevy_admin')
    if (saved) setParticipant(JSON.parse(saved))
    if (adminSaved) setIsAdmin(true)
  }, [])

  function handleLogin(data) {
    if (data.isAdmin) {
      localStorage.setItem('orevy_admin', '1')
      localStorage.removeItem('orevy_participant')
      setIsAdmin(true)
      setParticipant(null)
    } else {
      localStorage.setItem('orevy_participant', JSON.stringify(data))
      setParticipant(data)
    }
  }

  function handleLogout() {
    localStorage.removeItem('orevy_participant')
    localStorage.removeItem('orevy_admin')
    setParticipant(null)
    setIsAdmin(false)
    window.location.href = 'https://davidbucari-ui.github.io/orevy-formations/'
  }

  if (isAdmin) return <Admin onLogout={handleLogout} />
  if (participant) return <Dashboard participant={participant} onLogout={handleLogout} />
  return <Login onLogin={handleLogin} />
}
