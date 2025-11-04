// import React from 'react'
// import { Box } from '@chakra-ui/react'

// const Home = () => {
//   return (
//     <Box bg="#E5E7EB" minH="100vh" pt="80px">
//       {/* Content goes here */}
//     </Box>
//   )
// }

// export default Home


import React from 'react'
import { Box } from '@chakra-ui/react'
import FeaturedSection from '../components/FeaturedSection'
import PopularGroupsSection from '../components/PopularGroupsSection'

const Home = () => {
  return (
    <Box bg="#F9FAFB" minH="100vh" pt={20} overflow="visible">
      <FeaturedSection />
      <PopularGroupsSection />
      <Box h={{ base: '100px', md: '160px' }} /> {/* adds bottom space */}
    </Box>
  )
}

export default Home
