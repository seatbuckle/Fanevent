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

const App = () => {

	const isAdminRoute = useLocation().pathname.startsWith('/admin')

	return (
    <>
      <Toaster />
        {!isAdminRoute && <Navbar/>}
        <Routes>
          <Route path='/' element={<Home/>} />
          <Route path='/events' element={<Events/>} />
          <Route path='/events/:id' element={<EventDetails/>} />
          <Route path='/groups' element={<Groups/>} />
          <Route path='/groups/:id' element={<GroupDetails/>} />
          <Route path='/my-dashboard' element={<MyDashboard/>} />
        </Routes>
          {!isAdminRoute && <Footer />}
    </>
	)
}

export default App




// import { Routes, Route, useLocation } from 'react-router-dom'
// import Home from './pages/Home'
// import Footer from './components/Footer'
// import Navbar from './components/Navbar'

// const App = () => {
//   const isAdminRoute = useLocation().pathname.startsWith('/admin')

//   return (
//     <>
//       <Navbar/>
//       <Routes>
//         <Route path='/' element={<Home />} />
//       </Routes>
//       <Footer/>
//     </>
//   )
// }
// export default App

