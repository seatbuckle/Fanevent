import { Box, Flex, Text, Badge } from '@chakra-ui/react'
import { Calendar, MapPin, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

const EventCard = ({ event }) => {
  const navigate = useNavigate()
  const [isHovered, setIsHovered] = useState(false)

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const go = () => {
    navigate(`/events/${event._id}`)
    window.scrollTo(0, 0)
  }

  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      go()
    }
  }

  return (
    <Box
      bg="white"
      borderRadius="xl"
      overflow="hidden"
      boxShadow="sm"
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      cursor="pointer"
      w="full"
      flex={{ base: '1 1 100%', sm: '0 0 calc(50% - 10px)', lg: '0 0 280px' }}
      maxW={{ base: '100%', sm: 'calc(50% - 10px)', lg: '280px' }}
      minW={{ base: '100%', sm: 'calc(50% - 10px)', lg: '280px' }}
      position="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      _hover={{ transform: 'translateY(-8px)', boxShadow: '0 20px 40px rgba(59, 130, 246, 0.15)' }}
      onClick={go}
      role="link"
      tabIndex={0}
      onKeyDown={onKey}
      _focusVisible={{
        outline: '2px solid #EC4899',
        outlineOffset: '2px',
      }}
    >
      {/* Soft aura on hover */}
      <Box
        position="absolute"
        top="-20px"
        left="-20px"
        right="-20px"
        bottom="-20px"
        bg="radial-gradient(circle, rgba(219, 234, 254, 0.6) 0%, transparent 70%)"
        opacity={isHovered ? 1 : 0}
        transition="opacity 0.3s ease"
        pointerEvents="none"
        zIndex={-1}
      />

      <Box position="relative" h="160px" overflow="hidden">
        <Box
          as="img"
          src={event.image}
          alt={event.title}
          w="100%"
          h="100%"
          objectFit="cover"
          transition="transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
          transform={isHovered ? 'scale(1.1)' : 'scale(1)'}
          draggable={false}
          pointerEvents="none" /* image won't steal clicks */
        />
      </Box>

      <Box p={4} h="200px" display="flex" flexDir="column">
        <Text fontSize="xs" color="gray.500" fontWeight="medium" mb={1.5}>
          {event.category}
        </Text>

        <Text fontSize="md" fontWeight="semibold" mb={2.5} noOfLines={1}>
          {event.title}
        </Text>

        <Flex align="center" gap={1} mb={1.5} color="gray.600" fontSize="xs">
          <Calendar size={14} />
          <Text>{formatDate(event.date)}</Text>
        </Flex>

        <Flex align="center" gap={1} mb={1.5} color="gray.600" fontSize="xs">
          <MapPin size={14} />
          <Text noOfLines={1}>{event.location}</Text>
        </Flex>

        <Flex align="center" gap={1} mb={3} color="gray.600" fontSize="xs">
          <Users size={14} />
          <Text>{event.attendees} attending</Text>
        </Flex>

        <Flex gap={1.5} flexWrap="wrap" mt="auto">
          {event.tags.slice(0, 3).map((tag, index) => (
            <Badge
              key={index}
              bg="pink.50"
              color="#EC4899"
              fontSize="10px"
              px={2}
              py={0.5}
              borderRadius="md"
              fontWeight="medium"
              pointerEvents="none" /* badges won't intercept clicks */
            >
              {tag}
            </Badge>
          ))}
        </Flex>
      </Box>
    </Box>
  )
}

export default EventCard
