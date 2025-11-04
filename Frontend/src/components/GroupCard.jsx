import { Box, Flex, Text, Badge, Button } from '@chakra-ui/react'
import { Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

const GroupCard = ({ group }) => {
  const navigate = useNavigate()
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Box
      bg="white"
      borderRadius="xl"
      overflow="hidden"
      boxShadow="sm"
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      cursor="pointer"
      w="full"
      /* 👇 Match EventCard responsive sizing */
      flex={{ base: '1 1 100%', sm: '0 0 calc(50% - 10px)', lg: '0 0 280px' }}
      maxW={{ base: '100%', sm: 'calc(50% - 10px)', lg: '280px' }}
      minW={{ base: '100%', sm: 'calc(50% - 10px)', lg: '280px' }}
      position="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      _hover={{
        transform: 'translateY(-8px)',
        boxShadow: '0 20px 40px rgba(59, 130, 246, 0.15)',
      }}
    >
      {/* Soft aura on hover (same as EventCard) */}
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

      {/* 👇 Match EventCard media height (160px) */}
      <Box
        position="relative"
        h="160px"
        overflow="hidden"
        onClick={() => {
          navigate(`/groups/${group._id}`)
          scrollTo(0, 0)
        }}
      >
        <Box
          as="img"
          src={group.image}
          alt={group.name}
          w="100%"
          h="100%"
          objectFit="cover"
          transition="transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
          transform={isHovered ? 'scale(1.1)' : 'scale(1)'}
        />
        <Badge
          position="absolute"
          top={2.5}
          left={2.5}
          bg="white"
          color="gray.700"
          fontSize="10px"
          px={2.5}
          py={1}
          borderRadius="full"
          fontWeight="medium"
        >
          {group.category}
        </Badge>
      </Box>

      {/* 👇 Match EventCard body layout/height */}
      <Box p={4} h="200px" display="flex" flexDir="column">
        <Text fontSize="xs" color="gray.500" fontWeight="medium" mb={1.5}>
          {group.category}
        </Text>

        <Text fontSize="md" fontWeight="semibold" mb={2} noOfLines={1}>
          {group.name}
        </Text>

        <Text fontSize="xs" color="gray.600" mb={3} noOfLines={2} lineHeight="1.5">
          {group.description}
        </Text>

        <Flex align="center" gap={1} mb={3} color="gray.600" fontSize="xs">
          <Users size={14} />
          <Text>{group.members.toLocaleString()} members</Text>
        </Flex>

        {/* Push the CTA to the bottom for consistent height */}
        <Flex justify="flex-end" mt="auto">
          <Button
            size="xs"
            variant="link"
            color="#EC4899"
            fontWeight="medium"
            fontSize="xs"
            onClick={() => {
              navigate(`/groups/${group._id}`)
              scrollTo(0, 0)
            }}
            _hover={{ color: '#C7327C' }}
          >
            View Group
          </Button>
        </Flex>
      </Box>
    </Box>
  )
}

export default GroupCard
