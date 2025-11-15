import { Box, Flex, Text, Badge } from '@chakra-ui/react'
import { Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

const GroupCard = ({ group = {} }) => {
  const navigate = useNavigate()
  const [isHovered, setIsHovered] = useState(false)

  // Members can be a number, an array, or provided via membersCount.
  const membersCount = (() => {
    if (typeof group.members === 'number') return group.members || 0
    if (Array.isArray(group.members)) return group.members.length
    if (typeof group.membersCount === 'number') return group.membersCount || 0
    const n = Number(group.members) // handle stringified numbers
    return Number.isFinite(n) ? n : 0
  })()

  const go = () => {
    if (!group._id) return
    navigate(`/groups/${group._id}`)
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

      {/* Media */}
      <Box position="relative" h="160px" overflow="hidden">
        <Box
          as="img"
          src={group.image || '/placeholder.png'}
          alt={group.name || 'Group'}
          w="100%"
          h="100%"
          objectFit="cover"
          transition="transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
          transform={isHovered ? 'scale(1.1)' : 'scale(1)'}
          draggable={false}
          pointerEvents="none"
        />
        {!!group.category && (
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
            pointerEvents="none"
          >
            {group.category}
          </Badge>
        )}
      </Box>

      {/* Body */}
      <Box p={4} h="200px" display="flex" flexDir="column">
        {!!group.category && (
          <Text fontSize="xs" color="gray.500" fontWeight="medium" mb={1.5}>
            {group.category}
          </Text>
        )}

        <Text fontSize="md" fontWeight="semibold" mb={2} noOfLines={1}>
          {group.name || 'Group'}
        </Text>

        <Text fontSize="xs" color="gray.600" mb={3} noOfLines={2} lineHeight="1.5">
          {group.description || 'No description provided.'}
        </Text>

        <Flex align="center" gap={1} mb={3} color="gray.600" fontSize="xs">
          <Users size={14} />
          <Text>{membersCount.toLocaleString()} members</Text>
        </Flex>

        <Text
          mt="auto"
          fontSize="xs"
          color="#EC4899"
          fontWeight="medium"
          pointerEvents="none"
        >
          View Group →
        </Text>
      </Box>
    </Box>
  )
}

export default GroupCard
