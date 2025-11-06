import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import Events from './pages/Events'
import EventDetails from './pages/EventDetails'
import Groups from './pages/Groups'
import GroupDetails from './pages/GroupDetails'
import MyDashboard from './pages/MyDashboard'
import { Toaster } from 'react-hot-toast'
import AllResults from './pages/AllResults'

const App = () => {
  const isAdminRoute = useLocation().pathname.startsWith('/admin')

  return (
    <>
      {/* 🔔 Global Toast Configuration */}
      <Toaster
        position="center" // center horizontally at top of screen
        toastOptions={{
          duration: 2500,
          style: {
            fontSize: '14px',
            padding: '12px 18px',
            borderRadius: '10px',
            textAlign: 'center',
            background: 'white',
            color: '#333',
            boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
          },
          success: {
            iconTheme: {
              primary: '#EC4899',
              secondary: 'white',
            },
          },
          error: {
            style: {
              background: '#EF4444',
              color: 'white',
            },
          },
        }}
      />

      {!isAdminRoute && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/all-results" element={<AllResults />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetails />} />
        <Route path="/my-dashboard" element={<MyDashboard />} />
      </Routes>
      {!isAdminRoute && <Footer />}
    </>
  )
}

export default App
