import { Box, Flex, Text, Button } from '@chakra-ui/react'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BlurCircle from './BlurCircle'
import EventCard from './EventCard'
import { dummyEventsData } from '../assets/assets'

const FeaturedSection = () => {
  const navigate = useNavigate()

  return (
    <Box px={{ base: 6, md: 12, lg: 20, xl: 32 }} overflow="hidden" py={8}>
      <Flex
        align="center"
        justify="space-between"
        position="relative"
        pt={12}
        pb={6}
      >
        <BlurCircle top="60px" right="-80px" />
        
        <Text fontWeight="semibold" fontSize="xl" color="gray.800">
          Upcoming Events
        </Text>

        <Button
          onClick={() => { navigate('/events'); scrollTo(0, 0) }}
          variant="link"
          color="#EC4899"
          fontWeight="medium"
          fontSize="sm"
          rightIcon={<ArrowRight size={16} />}
          _hover={{ textDecoration: 'none', color: '#C7327C' }}
        >
          View All
        </Button>
      </Flex>

      <Flex
        gap={5}
        flexWrap="wrap"
        justify="center"
        mt={6}
      >
        {dummyEventsData.slice(0, 6).map((event) => (
          <EventCard key={event._id} event={event} />
        ))}
      </Flex>
    </Box>
  )
}

export default FeaturedSection

