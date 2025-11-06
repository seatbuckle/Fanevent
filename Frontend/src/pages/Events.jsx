// pages/Events.jsx
import { useMemo, useState } from 'react'
import { Box, Text, Flex } from '@chakra-ui/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { dummyEventsData, dummyGroupsData } from '../assets/assets'
import EventCard from '@/components/EventCard'
import AdvancedSearchSheet from '@/components/AdvancedSearchModal'

const normalize = (s) => (s || '').toString().toLowerCase()
const cleanText = (s = '') => s.replace(/\s+/g, ' ').trim()
const truncate = (s = '', n = 48) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

const inDateWindow = (eventDate, filters) => {
  if (!filters.length) return true
  const d = new Date(eventDate)
  if (Number.isNaN(d.getTime())) return true

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const day = startOfDay.getDay() || 7
  const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - (day - 1))
  const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 7)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const time = d.getTime()

  const checks = filters.map(f => f.toLowerCase()).map(f => {
    if (f === 'today') return time >= startOfDay.getTime() && time < endOfDay.getTime()
    if (f === 'this week') return time >= startOfWeek.getTime() && time < endOfWeek.getTime()
    if (f === 'this month') return time >= startOfMonth.getTime() && time < endOfMonth.getTime()
    return true
  })

  return checks.every(Boolean)
}

const Events = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const q = normalize(params.get('q') || '')
  const type = params.get('type') || ''
  const categories = (params.get('categories') || '').split(',').filter(Boolean)
  const tags = (params.get('tags') || '').split(',').filter(Boolean)
  const dates = (params.get('dates') || '').split(',').filter(Boolean)

  const handleApplySearch = (filters) => {
    const qp = new URLSearchParams()
    if (filters.query) qp.set('q', filters.query)
    if (filters.tags?.length) qp.set('tags', filters.tags.join(','))
    if (filters.dates?.length) qp.set('dates', filters.dates.join(','))
    // force events
    qp.set('type', 'events')
    navigate(`/events?${qp.toString()}`)
  }

  const filtered = useMemo(() => {
    return (dummyEventsData || []).filter(evt => {
      const hay = [
        evt.title, evt.location, evt.groupName,
        ...(evt.tags || []), ...(evt.categories || []), evt.description,
      ].map(normalize).join(' | ')

      const textOK = q ? hay.includes(q) || hay.indexOf(q) !== -1 : true

      const cats = (evt.categories || []).map(normalize)
      const catOK = categories.length ? categories.every(c => cats.includes(normalize(c))) : true

      const tg = (evt.tags || []).map(normalize)
      const tagsOK = tags.length ? tags.every(t => tg.includes(normalize(t))) : true

      const dateOK = inDateWindow(evt.date, dates)
      const typeOK = type ? type === 'events' : true

      return textOK && catOK && tagsOK && dateOK && typeOK
    })
  }, [q, type, categories, tags, dates])

  return (
    <Box pt="120px" pb={16} bg="gray.50" minH="100vh">
      <Box px={{ base: 6, md: 12, lg: 20, xl: 32 }} maxW="1400px" mx="auto">
        <Text fontSize="3xl" fontWeight="bold" mb={4} textAlign="center">
          All Events
        </Text>

        {/* Search pill */}
        <Box display="flex" justifyContent="center" mb={8}>
          <Box
            role="button"
            onClick={() => setOpen(true)}
            px={4}
            py={3}
            borderRadius="9999px"
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            boxShadow="sm"
            maxW="720px"
            w="100%"
            cursor="pointer"
            _hover={{ borderColor: 'pink.300', boxShadow: 'md' }}
          >
            <Flex align="center" gap={3} color="gray.500">
              <Box>🔍</Box>
              <Text fontSize="sm" flex="1" noOfLines={1}>
                {params.get('q') ? `Search events… (${params.get('q')})` : 'Search events…'}
              </Text>
              <Box
                px="8px"
                py="2px"
                borderRadius="9999px"
                bg="pink.50"
                color="pink.600"
                fontSize="xs"
                border="1px solid"
                borderColor="pink.200"
              >
                Events
              </Box>
            </Flex>
          </Box>
        </Box>

        {q && (
          <Box mb={6} display="flex" justifyContent="center">
            <Text fontSize="sm" color="gray.500" mr={2}>
              Showing results for
            </Text>
            <Box
              as="span"
              px="10px"
              py="4px"
              borderRadius="9999px"
              bg="pink.50"
              color="pink.600"
              border="1px solid"
              borderColor="pink.200"
              fontSize="sm"
              lineHeight="1"
              whiteSpace="nowrap"
              maxW="70vw"
              textOverflow="ellipsis"
              overflow="hidden"
              display="inline-block"
            >
              {truncate(cleanText(params.get('q') || ''))}
            </Box>
          </Box>
        )}

        <Flex gap={5} flexWrap="wrap" justify="center" align="center">
          {filtered.length ? (
            filtered.map((event) => <EventCard key={event._id} event={event} />)
          ) : (
            <Text color="gray.500" mt={20}>No events match your filters.</Text>
          )}
        </Flex>
      </Box>

      {/* Local overlay instance preset to Events */}
      <AdvancedSearchSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        onApply={handleApplySearch}
        events={dummyEventsData || []}
        groups={dummyGroupsData || []}
        initialKind="Events"
      />
    </Box>
  )
}

export default Events
