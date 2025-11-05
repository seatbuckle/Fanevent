// Events.jsx
import { useMemo } from 'react'
import { Box, Text, Flex } from '@chakra-ui/react'
import { useSearchParams } from 'react-router-dom'
import { dummyEventsData } from '../assets/assets'
import EventCard from '@/components/EventCard'

const normalize = (s) => (s || '').toString().toLowerCase()
const cleanText = (s = '') => s.replace(/\s+/g, ' ').trim()
const truncate = (s = '', n = 48) => (s.length > n ? s.slice(0, n - 1) + '…' : s)


const inDateWindow = (eventDate, filters) => {
  if (!filters.length) return true
  const d = new Date(eventDate) // assumes event.date is ISO or parseable
  if (Number.isNaN(d.getTime())) return true

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  // week: Monday-Sunday-ish (use current locale week start = Mon)
  const day = startOfDay.getDay() || 7
  const startOfWeek = new Date(startOfDay)
  startOfWeek.setDate(startOfDay.getDate() - (day - 1))
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const time = d.getTime()

  // If user added custom date text, we don't parse here; we just don't filter on it.
  // (You can expand with date parsing later.)
  const checks = filters.map(f => f.toLowerCase()).map(f => {
    if (f === 'today') return time >= startOfDay.getTime() && time < endOfDay.getTime()
    if (f === 'this week') return time >= startOfWeek.getTime() && time < endOfWeek.getTime()
    if (f === 'this month') return time >= startOfMonth.getTime() && time < endOfMonth.getTime()
    // unknown custom date string -> ignore (treat as pass)
    return true
  })

  // require all date filters to pass
  return checks.every(Boolean)
}

const Events = () => {
  const [params] = useSearchParams()

  const q = normalize(params.get('q') || '')
  const type = params.get('type') || '' // 'events' or 'groups' (we only show events here; you can extend)
  const categories = (params.get('categories') || '').split(',').filter(Boolean)
  const tags = (params.get('tags') || '').split(',').filter(Boolean)
  const dates = (params.get('dates') || '').split(',').filter(Boolean)

  const filtered = useMemo(() => {
    return (dummyEventsData || []).filter(evt => {
      // text match
      const hay = [
        evt.title,
        evt.location,
        evt.groupName,
        ...(evt.tags || []),
        ...(evt.categories || []),
        evt.description,
      ].map(normalize).join(' | ')

      const textOK = q ? hay.includes(q) || hay.indexOf(q) !== -1 : true

      // categories match: if filters present, require intersection
      const cats = (evt.categories || []).map(normalize)
      const catOK = categories.length
        ? categories.every(c => cats.includes(normalize(c)))
        : true

      // tags match: if filters present, require intersection
      const tg = (evt.tags || []).map(normalize)
      const tagsOK = tags.length
        ? tags.every(t => tg.includes(normalize(t)))
        : true

      // date window
      const dateOK = inDateWindow(evt.date, dates)

      // kind (if you later use same page for groups, you can gate by evt.type)
      const typeOK = type ? type === 'events' : true

      return textOK && catOK && tagsOK && dateOK && typeOK
    })
  }, [q, type, categories, tags, dates])

    return (
    <Box pt="120px" pb={16} bg="gray.50" minH="100vh">
      <Box px={{ base: 6, md: 12, lg: 20, xl: 32 }} maxW="1400px" mx="auto">
      <Text fontSize="3xl" fontWeight="bold" mb={10} textAlign="center">
        All Events
      </Text>

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
            filtered.map((event) => (
              <EventCard key={event._id} event={event} />
            ))
          ) : (
            <Text color="gray.500" mt={20}>
              No events match your filters.
            </Text>
          )}
        </Flex>
      </Box>
    </Box>
  )
}

export default Events
