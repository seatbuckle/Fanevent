import { useEffect, useState, useRef } from 'react'
import { Box, Flex, Text, Button, Skeleton, SimpleGrid } from '@chakra-ui/react'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BlurCircle from './BlurCircle'
import GroupCard from './GroupCard'
import { api } from '@/lib/api'

const PopularGroupsSection = () => {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    ;(async () => {
      try {
        // Adjust query params to match your backend (e.g., sort by members/score)
        const data = await api('/api/groups?limit=6&sort=members:desc', {
          signal: abortRef.current.signal,
        }).catch(() => [])
        setGroups(Array.isArray(data) ? data : (data?.items ?? []))
      } catch (e) {
        setError(e?.message || 'Failed to load groups')
      } finally {
        setLoading(false)
      }
    })()

    return () => abortRef.current?.abort()
  }, [])

  return (
    <Box px={{ base: 6, md: 12, lg: 20, xl: 32 }} overflow="hidden" py={8}>
      <Flex align="center" justify="space-between" position="relative" pt={12} pb={6}>
        <BlurCircle top="100px" left="-80px" />

        <Text fontWeight="semibold" fontSize="xl" color="gray.800">
          Popular Groups
        </Text>

        <Button
          onClick={() => { navigate('/groups'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
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

      {/* Content */}
      {loading ? (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={5} mt={6}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height="280px" borderRadius="xl" />
          ))}
        </SimpleGrid>
      ) : error ? (
        <Flex justify="center" mt={6}>
          <Text color="red.500" fontSize="sm">{error}</Text>
        </Flex>
      ) : groups.length ? (
        <Flex gap={5} flexWrap="wrap" justify="center" mt={6}>
          {groups.slice(0, 6).map((group) => (
            <GroupCard key={group._id || group.id} group={group} />
          ))}
        </Flex>
      ) : (
        <Flex justify="center" mt={6}>
          <Text color="gray.500" fontSize="sm">No groups yet.</Text>
        </Flex>
      )}
    </Box>
  )
}

export default PopularGroupsSection
