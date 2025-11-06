import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import useGroupMemberships from '@/hooks/useGroupMemberships'
import {
  Box,
  Flex,
  Text,
  Button,
  IconButton,
  Badge,
  Grid,
} from '@chakra-ui/react'
import {
  ChevronLeft,
  Users,
  Flag,
  Calendar,
  MapPin,
  Tag as TagIcon,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { dummyGroupsData, dummyEventsData } from '../assets/assets'

/** simple inline separator to replace <Divider /> */
const Separator = (props) => (
  <Box h="1px" bg="gray.100" my={4} {...props} />
)

const GroupDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUser()
  const { isMember, join, leave } = useGroupMemberships(user?.id)
  


  const [group, setGroup] = useState(null)
  const [activeTab, setActiveTab] = useState('events')

  useEffect(() => {
    const g = dummyGroupsData.find((x) => x._id === id)
    setGroup(g || null)
    if (!g) navigate('/groups')
  }, [id, navigate])

  const groupEvents = useMemo(() => {
    if (!group) return []
    // In your data, event.category == group.name (e.g., "Art Museum Enthusiasts")
    return dummyEventsData
      .filter((e) => e.category === group.name)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [group])

  if (!group) return null

  const handleReport = () =>
    toast('Report submitted – thank you!', { icon: '⚠️' })

  const joined = isMember(group._id)
  const handleJoinLeave = () => {
    joined ? leave(group._id) : join(group._id)
    toast.success(joined ? 'Left group.' : 'Joined group!')
  }

  const formatLongDate = (d) =>
    new Date(d).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

  return (
    <Box pt="88px" pb={16} bg="gray.50" minH="100vh">
      <Box px={{ base: 6, md: 12, lg: 20, xl: 32 }}>
        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          color="gray.700"
          mb={4}
          leftIcon={<ChevronLeft size={16} />}
          _hover={{ bg: 'gray.100' }}
        >
          Back
        </Button>

        {/* Hero */}
        <Box
          bg="white"
          borderRadius="2xl"
          overflow="hidden"
          boxShadow="sm"
          mb={6}
        >
          <Box position="relative" h={{ base: '180px', md: '240px' }}>
            <Box
              as="img"
              src={group.image}
              alt={group.name}
              w="100%"
              h="100%"
              objectFit="cover"
              transform="scale(1.02)"
            />
            {/* Soft overlay */}
            <Box
              position="absolute"
              inset={0}
              bg="linear-gradient(180deg, rgba(0,0,0,0.35) 10%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.45) 100%)"
            />
            {/* Title block */}
            <Flex
              position="absolute"
              inset={0}
              px={{ base: 6, md: 8 }}
              py={{ base: 5, md: 6 }}
              align="end"
              justify="space-between"
            >
              <Box color="white">
                <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold">
                  {group.name}
                </Text>
                <Flex mt={1} gap={2} align="center" fontSize="sm" opacity={0.95}>
                  <Flex align="center" gap={1.5}>
                    <Users size={16} />
                    <Text>{group.members.toLocaleString()} members</Text>
                  </Flex>
                  <Text>•</Text>
                  <Text>{group.category}</Text>
                </Flex>
              </Box>

              <Flex align="center" gap={2}>
              <IconButton
                aria-label="Report group"
                variant="ghost"
                color="white"
                onClick={handleReport}
                _hover={{ bg: 'whiteAlpha.300' }}
              >
                <Flag size={18} />
              </IconButton>

              <Button
                size="sm"
                px={5}
                onClick={handleJoinLeave}
                _hover={{ bg: joined ? 'gray.200' : '#C7327C' }}
                transition="all 0.2s ease"
                {...(joined
                  ? {
                      bg: 'gray.100',
                      color: 'gray.700',
                      _hover: { bg: 'gray.200' },
                    }
                  : {
                      bg: '#EC4899',
                      color: 'white',
                      _hover: { bg: '#C7327C' },
                    })}
              >
                {joined ? 'Leave Group' : 'Join Group'}
              </Button>
            </Flex>

            </Flex>
          </Box>

          {/* Tabs */}
          <Flex
            px={{ base: 4, md: 6, lg: 8 }}
            py={3}
            borderTop="1px solid"
            borderColor="gray.100"
            align="center"
            justify="space-between"
          >
            <Flex gap={6}>
              {['events', 'members', 'about'].map((t) => (
                <Button
                  key={t}
                  variant="ghost"
                  onClick={() => setActiveTab(t)}
                  color={activeTab === t ? '#EC4899' : 'gray.700'}
                  fontWeight={activeTab === t ? 'semibold' : 'medium'}
                  size="sm"
                  borderBottom={activeTab === t ? '2px solid #EC4899' : '2px solid transparent'}
                  borderRadius="0"
                  _hover={{ bg: 'transparent', color: '#EC4899' }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Button>
              ))}
            </Flex>

            {/* mini meta on the right */}
            <Badge bg="pink.50" color="#EC4899" borderRadius="full" px={3} py={1} fontSize="xs">
              {group.category}
            </Badge>
          </Flex>
        </Box>

        {/* Content */}
        {activeTab === 'events' && (
          <EventsSection
            groupEvents={groupEvents}
            formatLongDate={formatLongDate}
            navigate={navigate}
          />
        )}

        {activeTab === 'members' && (
          <MembersSection members={group.members} />
        )}

        {activeTab === 'about' && (
          <AboutSection group={group} />
        )}
      </Box>
    </Box>
  )
}

/* ----------------- Sections ----------------- */

const EventsSection = ({ groupEvents, formatLongDate, navigate }) => {
  // helper to neatly truncate text
  const truncate = (text = '', maxLen = 80) => {
    if (!text) return ''
    return text.length > maxLen ? text.slice(0, maxLen - 3).trim() + '...' : text
  }

  return (
    <Box>
      <Text fontSize="lg" fontWeight="semibold" mb={4} color="gray.800">
        Upcoming Events
      </Text>

      {groupEvents.length === 0 && (
        <Box
          bg="white"
          borderRadius="xl"
          p={8}
          boxShadow="sm"
          color="gray.600"
          textAlign="center"
        >
          No upcoming events yet. Check back soon!
        </Box>
      )}

      <Flex direction="column" gap={4}>
        {groupEvents.map((e) => (
          <Box
            key={e._id}
            bg="white"
            borderRadius="xl"
            overflow="hidden"
            boxShadow="sm"
            cursor="pointer"
            transition="all 0.25s ease"
            _hover={{ transform: 'translateY(-4px)', boxShadow: '0 12px 28px rgba(0,0,0,0.08)' }}
            onClick={() => {
              navigate(`/events/${e._id}`)
              window.scrollTo(0, 0)
            }}
            role="link"
            tabIndex={0}
            _focusVisible={{ outline: '2px solid #EC4899', outlineOffset: '2px' }}
          >
            <Grid
              templateColumns={{ base: '1fr', md: '360px 1fr' }} // larger image width
              alignItems="stretch"
            >
              {/* Thumbnail */}
              <Box position="relative" h={{ base: '100px', md: '250px' }} overflow="hidden">
                <Box
                  as="img"
                  src={e.image}
                  alt={e.title}
                  w="100%"
                  h="100%"
                  objectFit="cover"
                  transition="transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)"
                  _hover={{ transform: 'scale(1.05)' }}
                />
              </Box>

              {/* Body */}
              <Box p={{ base: 4, md: 5 }} display="flex" flexDir="column">
                <Flex justify="space-between" align="start" mb={2}>
                  <Text fontWeight="semibold" color="gray.800" fontSize="lg" noOfLines={1}>
                    {e.title}
                  </Text>
                  <IconButton
                    aria-label="Report event"
                    variant="ghost"
                    size="sm"
                    color="gray.500"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      toast('Report submitted – thank you!', { icon: '⚠️' })
                    }}
                    _hover={{ bg: 'gray.100' }}
                  >
                    <Flag size={16} />
                  </IconButton>
                </Flex>

                <Flex direction="column" gap={2} color="gray.600" fontSize="sm" mb={3}>
                  <Flex align="center" gap={2}>
                    <Calendar size={16} color="#EC4899" />
                    <Text>{formatLongDate(e.date)}</Text>
                  </Flex>
                  <Flex align="center" gap={2}>
                    <MapPin size={16} color="#EC4899" />
                    <Text>{e.location}</Text>
                  </Flex>
                </Flex>

                <Text
                  color="gray.700"
                  fontSize="sm"
                  mb={3}
                  lineHeight="1.6"
                  noOfLines={4} // Chakra’s native truncation for multi-line
                >
                  {truncate(e.description, 200)}
                </Text>

                <Flex gap={2} flexWrap="wrap" align="center" mt="auto">
                  <TagIcon size={14} color="#EC4899" />
                  {(e.tags || []).slice(0, 4).map((t, i) => (
                    <Badge
                      key={i}
                      bg="pink.50"
                      color="#EC4899"
                      fontSize="xs"
                      px={2.5}
                      py={1}
                      borderRadius="md"
                      fontWeight="medium"
                    >
                      {t}
                    </Badge>
                  ))}
                </Flex>
              </Box>
            </Grid>
          </Box>
        ))}
      </Flex>
    </Box>
  )
}


const MembersSection = ({ members }) => {
  return (
    <Box bg="white" borderRadius="2xl" p={{ base: 5, md: 7 }} boxShadow="sm">
      <Text fontSize="lg" fontWeight="semibold" mb={2}>
        Members
      </Text>
      <Separator />
      <Flex align="center" gap={2} color="gray.700">
        <Users size={18} />
        <Text>
          This group has{' '}
          <Text as="span" fontWeight="semibold">
            {members.toLocaleString()}
          </Text>{' '}
          members.
        </Text>
      </Flex>
      <Text mt={4} color="gray.600" fontSize="sm">
        New members are welcome! Join the group to take part in upcoming
        activities and discussions.
      </Text>
    </Box>
  )
}

const AboutSection = ({ group }) => {
  return (
    <Box bg="white" borderRadius="2xl" p={{ base: 5, md: 7 }} boxShadow="sm">
      <Text fontSize="lg" fontWeight="semibold" mb={2}>
        About {group.name}
      </Text>
      <Separator />

      <Box mb={6}>
        <Text fontWeight="semibold" mb={2}>
          Description
        </Text>
        <Text color="gray.700" lineHeight="1.8">
          {group.description}
        </Text>
      </Box>

      <Box mb={6}>
        <Text fontWeight="semibold" mb={2}>
          What to Expect
        </Text>
        <Text color="gray.700" lineHeight="1.8">
          We host regular meetups, special events, and discussions tailored to{' '}
          <Text as="span" fontWeight="semibold">
            {group.category.toLowerCase()}
          </Text>
          . Whether you’re brand new or a seasoned enthusiast, you’ll find a
          friendly community and plenty of ways to get involved.
        </Text>
      </Box>

      <Box>
        <Text fontWeight="semibold" mb={2}>
          Group Guidelines
        </Text>
        <Box as="ul" pl={5} color="gray.700" lineHeight="1.9">
          <Box as="li">Be respectful and inclusive to all members.</Box>
          <Box as="li">No spam or self-promotion without approval.</Box>
          <Box as="li">Keep discussions on topic and constructive.</Box>
        </Box>
      </Box>

      <Flex mt={6} gap={2} align="center">
        <Badge bg="pink.50" color="#EC4899" borderRadius="full" px={3} py={1} fontSize="xs">
          {group.category}
        </Badge>
        <Badge bg="gray.100" color="gray.700" borderRadius="full" px={3} py={1} fontSize="xs">
          {group.members.toLocaleString()} members
        </Badge>
      </Flex>
    </Box>
  )
}

export default GroupDetails
