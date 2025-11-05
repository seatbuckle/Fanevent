// Events.jsx
import { Box, Text, Flex } from '@chakra-ui/react'
import { dummyEventsData } from '../assets/assets'
import EventCard from '@/components/EventCard'

const Events = () => {
  return (
    <Box pt="80px" pb={16} bg="gray.50" minH="100vh">
      <Box px={{ base: 6, md: 12, lg: 20, xl: 32 }}>
        <Text fontSize="3xl" fontWeight="bold" mb={8}>
          All Events
        </Text>
        <Flex gap={5} flexWrap="wrap">
          {dummyEventsData.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </Flex>
      </Box>
    </Box>
  )
}

export default Events