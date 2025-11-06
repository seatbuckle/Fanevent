import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { Box, Flex, Text, Button, Badge, IconButton, Grid } from '@chakra-ui/react'
import {
  Calendar,
  MapPin,
  Users,
  Heart,
  Share2,
  MessageSquare,
  X,
  CalendarCheck,
  LogIn,
  LogOut,
  Clock,
  CheckCircle,
  Flag,
  PlayCircle,
} from 'lucide-react'
import ReactPlayer from 'react-player' // keep for non-YouTube
import { dummyEventsData, dummyGroupsData } from '../assets/assets'
import EventCard from '@/components/EventCard'
import toast, { Toaster } from 'react-hot-toast'
import useGroupMemberships from '@/hooks/UseGroupMemberships'

// --- HostedBy helpers ---
const slugify = (s = '') =>
  s.toString().trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

const getInitials = (s = '') => {
  const parts = s.trim().split(/\s+/)
  const a = parts[0]?.[0] || ''
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : ''
  return (a + b).toUpperCase()
}

// Find the host group from assets using the event fields you have.
// Priority: event.groupId -> name/category match -> null
const findHostGroup = (ev) => {
  if (!ev) return null
  if (ev.groupId) {
    const byId = dummyGroupsData.find(g => g._id === ev.groupId)
    if (byId) return byId
  }
  const name = ev.groupName || ev.category
  if (name) {
    const byName = dummyGroupsData.find(g => g.name?.toLowerCase() === name.toLowerCase())
    if (byName) return byName
  }
  return null
}



const EventDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUser()
  const { isMember, join, leave } = useGroupMemberships(user?.id)
  
  const [event, setEvent] = useState(null)
  const [isLiked, setIsLiked] = useState(false)
  const [hasRSVP, setHasRSVP] = useState(false)
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [isCheckedOut, setIsCheckedOut] = useState(false)
  const [checkInTime, setCheckInTime] = useState(null)
  const [hoursLogged, setHoursLogged] = useState(null)
  const [hasSkipped, setHasSkipped] = useState(false)
  const [isMediaOpen, setIsMediaOpen] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [rsvpEvents, setRsvpEvents] = useState([])

  // TODO: env var in prod
  const GOOGLE_MAPS_API_KEY = 'AIzaSyCwj0qLG6HYkmltOOKFz3xl6v4wpT6k-5M'

  useEffect(() => {
    const foundEvent = dummyEventsData.find(e => e._id === id)
    setEvent(foundEvent || null)
    if (!foundEvent) navigate('/events')
  }, [id, navigate])

  const handleLike = () => setIsLiked(!isLiked)

  // ---- YouTube helpers ----
  const isYouTube = (url = '') =>
    /(?:^https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(url)

  const getYouTubeId = (url = '') => {
    if (!url) return null
    const patterns = [
      /[?&]v=([A-Za-z0-9_-]{6,})/i,
      /youtu\.be\/([A-Za-z0-9_-]{6,})/i,
      /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/i,
      /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i
    ]
    for (const p of patterns) {
      const m = url.match(p)
      if (m?.[1]) return m[1]
    }
    return null
  }

  const getVideoThumb = (url = '') => {
    if (!isYouTube(url)) return null
    const id = getYouTubeId(url)
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
  }

  const handleRSVP = () => {
    setHasRSVP(true)
    if (event && !rsvpEvents.includes(event.date)) {
      setRsvpEvents([...rsvpEvents, event.date])
    }
  }
  const handleCancelRSVP = () => { setHasRSVP(false); setRsvpEvents(rsvpEvents.filter(d => d !== event.date)) }
  const handleCheckIn = () => { setIsCheckedIn(true); setCheckInTime(new Date()) }
  const handleCancelCheckIn = () => { setIsCheckedIn(false); setCheckInTime(null) }
  const handleCheckOut = () => {
    const now = new Date()
    const diff = (now - checkInTime) / (1000 * 60 * 60)
    setHoursLogged(diff.toFixed(1))
    setIsCheckedOut(true)
  }
  const handleSkipLogging = () => setHasSkipped(true)
  const handleCancelCheckOut = () => { setIsCheckedOut(false); setHoursLogged(null) }
  const handleCancelSkipped = () => setHasSkipped(false)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!', { duration: 2000 })
    } catch { toast.error('Failed to copy link.') }
  }
  const handleContact = () => console.log('Contact button clicked (future feature)')
  const handleJoinGroup = () => setHasJoinedGroup(!hasJoinedGroup)
  const handleReport = () => toast('Report submitted – thank you!', { icon: '⚠️' })

  const handleMapClick = () => {
    if (event) {
      const address = encodeURIComponent(`${event.address}, ${event.location}`)
      window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank')
    }
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const formatTime = (t) => t || '10:00 AM - 5:00 PM PST'

  const getCurrentMonth = () => {
    const now = new Date()
    return { month: now.toLocaleString('en-US', { month: 'long' }), year: now.getFullYear() }
  }
  const getDaysInMonth = () => {
    const now = new Date(), year = now.getFullYear(), month = now.getMonth()
    return { firstDay: new Date(year, month, 1).getDay(), daysInMonth: new Date(year, month + 1, 0).getDate(), currentDay: now.getDate() }
  }
  const hasEventOnDay = (day) => {
    const now = new Date()
    return rsvpEvents.some(eventDate => {
      const ed = new Date(eventDate)
      return ed.getDate() === day && ed.getMonth() === now.getMonth() && ed.getFullYear() === now.getFullYear()
    })
  }

  // ---- Smarter related events (always shows) ----
  const relatedEvents = useMemo(() => {
    if (!event) return []
    const others = dummyEventsData.filter(e => e._id !== event._id)

    // 1) same category
    let rel = others.filter(e => e.category === event.category)

    // 2) overlapping tags
    if (rel.length < 3) {
      const tags = new Set(event.tags || [])
      const byTags = others.filter(e => (e.tags || []).some(t => tags.has(t)))
                           .filter(e => !rel.includes(e))
      rel = [...rel, ...byTags]
    }

    // 3) closest-by-date fallback
    if (rel.length < 3) {
      const target = new Date(event.date).getTime()
      const byDate = [...others]
        .filter(e => e.date)
        .sort((a, b) => Math.abs(new Date(a.date) - target) - Math.abs(new Date(b.date) - target))
        .filter(e => !rel.includes(e))
      rel = [...rel, ...byDate]
    }
    return rel.slice(0, 3)
  }, [event])

  if (!event) return null

  const mediaGallery = event.media || []
  const latestMedia = mediaGallery[mediaGallery.length - 1]
  const { month, year } = getCurrentMonth()
  const { firstDay, daysInMonth, currentDay } = getDaysInMonth()

  return (
    <>
      <Box pt="80px" pb={16} bg="gray.50" minH="100vh">
        <Box px={{ base: 6, md: 12, lg: 20, xl: 32 }}>
          <Button variant="ghost" color="gray.600" mb={6} onClick={() => navigate(-1)} _hover={{ bg: 'gray.100' }}>
            <X size={18} style={{ marginRight: '8px' }} /> Back
          </Button>

          <Flex gap={8} flexDir={{ base: 'column', lg: 'row' }}>
            {/* LEFT CONTENT */}
            <Box flex={1}>
              <Box bg="white" borderRadius="2xl" overflow="hidden" boxShadow="sm">
                <Box position="relative">
                  <Text
                    position="absolute"
                    top={4}
                    left={4}
                    bg="white"
                    px={3}
                    py={1}
                    borderRadius="md"
                    fontSize="xs"
                    fontWeight="medium"
                    color="gray.700"
                    zIndex={1}
                  >
                    {event.category}
                  </Text>

                  <Box as="img" src={event.image} alt={event.title} w="100%" h={{ base: '250px', md: '400px' }} objectFit="cover" />
                </Box>

                <Box p={{ base: 6, md: 8 }}>
                  <Flex justify="space-between" align="start" mb={4}>
                    <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold">{event.title}</Text>
                    <IconButton variant="ghost" colorScheme="pink" aria-label="Report" onClick={handleReport}>
                      <Flag size={18} />
                    </IconButton>
                  </Flex>

                  {/* LIKE / RSVP / CHECK-IN SECTION */}
                  <Flex gap={3} mb={6} flexWrap="wrap">
                    {!hasRSVP && !isCheckedIn && (
                      <>
                        <Button variant={isLiked ? 'solid' : 'outline'} bg={isLiked ? '#EC4899' : 'white'} color={isLiked ? 'white' : '#EC4899'}
                          borderColor="#EC4899" borderWidth="2px" onClick={handleLike} _hover={{ bg: isLiked ? '#C7327C' : 'pink.50' }}>
                          <Heart size={18} fill={isLiked ? 'white' : 'none'} style={{ marginRight: '8px' }} /> Like
                        </Button>
                        <Button bg="#EC4899" color="white" borderColor="#C7327C" borderWidth="2px" onClick={handleRSVP} _hover={{ bg: '#C7327C' }}>
                          <CalendarCheck size={18} style={{ marginRight: '8px' }} /> RSVP
                        </Button>
                      </>
                    )}

                    {hasRSVP && !isCheckedIn && (
                      <>
                        <Button variant="outline" color="#EC4899" borderColor="#EC4899" borderWidth="2px" onClick={handleCancelRSVP} _hover={{ bg: 'pink.50' }}>
                          <CalendarCheck size={18} style={{ marginRight: '8px' }} /> Cancel RSVP
                        </Button>
                        <Button bg="#10B981" color="white" borderColor="#059669" borderWidth="2px" onClick={handleCheckIn} _hover={{ bg: '#059669' }}>
                          <LogIn size={18} style={{ marginRight: '8px' }} /> Check In
                        </Button>
                      </>
                    )}

                    {isCheckedIn && !isCheckedOut && !hasSkipped && (
                      <>
                        <Button bg="#F59E0B" color="white" borderColor="#D97706" onClick={handleCheckOut} _hover={{ bg: '#D97706' }}>
                          <LogOut size={18} style={{ marginRight: '8px' }} /> Check Out
                        </Button>
                        <Button variant="outline" color="#EC4899" borderColor="#EC4899" onClick={handleSkipLogging} _hover={{ bg: 'pink.50' }}>
                          <CalendarCheck size={18} style={{ marginRight: '8px' }} /> Skip Logging
                        </Button>
                        <IconButton bg="#EF4444" color="white" borderColor="#DC2626" onClick={handleCancelCheckIn} _hover={{ bg: '#DC2626' }}>
                          <X size={18} />
                        </IconButton>
                      </>
                    )}

                    {isCheckedOut && hoursLogged && (
                      <>
                        <Button bg="#3B82F6" color="white" borderColor="#2563EB" cursor="default">
                          <Clock size={18} style={{ marginRight: '8px' }} /> {hoursLogged} hours logged
                        </Button>
                        <IconButton bg="#EF4444" color="white" borderColor="#DC2626" onClick={handleCancelCheckOut} _hover={{ bg: '#DC2626' }}>
                          <X size={18} />
                        </IconButton>
                      </>
                    )}

                    {hasSkipped && (
                      <>
                        <Button bg="#3B82F6" color="white" borderColor="#2563EB" cursor="default">
                          <CheckCircle size={18} style={{ marginRight: '8px' }} /> Event attended
                        </Button>
                        <IconButton bg="#EF4444" color="white" borderColor="#DC2626" onClick={handleCancelSkipped} _hover={{ bg: '#DC2626' }}>
                          <X size={18} />
                        </IconButton>
                      </>
                    )}
                  </Flex>

                  {/* EVENT INFO */}
                  <Box mb={6}>
                    <Flex align="center" gap={3} mb={3}>
                      <Calendar size={20} color="#EC4899" />
                      <Box>
                        <Text fontWeight="medium" fontSize="sm">{formatDate(event.date)}</Text>
                        <Text fontSize="xs" color="gray.600">{formatTime(event.time)}</Text>
                      </Box>
                    </Flex>
                    <Flex align="center" gap={3} mb={3}>
                      <MapPin size={20} color="#EC4899" />
                      <Box>
                        <Text fontWeight="medium" fontSize="sm">{event.address}</Text>
                        <Text fontSize="xs" color="gray.600">{event.location}</Text>
                      </Box>
                    </Flex>
                    <Flex align="center" gap={3}>
                      <Users size={20} color="#EC4899" />
                      <Text fontSize="sm" color="gray.600">{event.attendees} users attending</Text>
                    </Flex>
                  </Box>

                  {/* GOOGLE MAPS - INTERACTIVE */}
                  <Box 
                    bg="gray.100" borderRadius="lg" h="250px" mb={8} overflow="hidden"
                    position="relative" cursor="pointer" onClick={handleMapClick}
                    _hover={{ '&::after': { content: '""', position: 'absolute', inset: 0, bg: 'rgba(236, 72, 153, 0.1)' } }}
                    transition="all 0.2s"
                  >
                    <Box 
                      as="iframe"
                      src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(event.address + ', ' + event.location)}`}
                      w="100%" h="100%" border="none" pointerEvents="none"
                    />
                    <Flex position="absolute" bottom={3} right={3} bg="white" px={3} py={1.5}
                          borderRadius="md" boxShadow="md" fontSize="xs" fontWeight="medium"
                          color="gray.700" align="center" gap={1}>
                      <MapPin size={16} color="#EC4899" />
                      Click to open in Google Maps
                    </Flex>
                  </Box>

                  <Box mb={6}>
                    <Text fontSize="lg" fontWeight="semibold" mb={3}>About this event</Text>
                    <Text color="gray.700" lineHeight="1.7">{event.description}</Text>
                  </Box>

                  <Flex gap={2} flexWrap="wrap">
                    {event.tags.map((tag, i) => (
                      <Badge key={i} bg="pink.50" color="#EC4899" fontSize="sm" px={3} py={1} borderRadius="md" fontWeight="medium">{tag}</Badge>
                    ))}
                  </Flex>
                </Box>
              </Box>

              {/* ---------- EVENTS LIKE THIS (table-style UI) ---------- */}
              <Box mt={8} bg="white" borderRadius="2xl" p={6} boxShadow="sm">
                <Flex justify="space-between" align="center" mb={4}>
                  <Text fontSize="xl" fontWeight="semibold">Events like this...</Text>
                  <Button variant="link" color="#EC4899" size="sm" onClick={() => navigate('/events')}>
                    View All
                  </Button>
                </Flex>

                {/* Header */}
                <Grid
                  templateColumns={{ base: '1fr', md: '2fr 1fr 2fr' }}
                  gap={4}
                  px={3}
                  py={2}
                  borderBottom="1px solid"
                  borderColor="gray.100"
                  fontSize="sm"
                  color="gray.500"
                  fontWeight="semibold"
                >
                  <Text>Name</Text>
                  <Text display={{ base: 'none', md: 'block' }}>Location</Text>
                  <Text display={{ base: 'none', md: 'block' }}>Tags</Text>
                </Grid>

                {/* Rows */}
                {relatedEvents.map((e, idx) => (
                  <Grid
                    key={e._id}
                    templateColumns={{ base: '1fr', md: '2fr 1fr 2fr' }}
                    gap={4}
                    px={3}
                    py={4}
                    borderBottom={idx === relatedEvents.length - 1 ? 'none' : '1px solid'}
                    borderColor="gray.100"
                    alignItems="center"
                    cursor="pointer"
                    _hover={{ bg: 'gray.50' }}
                    onClick={() => navigate(`/events/${e._id}`)}
                  >
                    {/* Name */}
                    <Flex direction="column" gap={1}>
                      <Text fontWeight="medium" color="gray.800">{e.title}</Text>
                      <Text fontSize="xs" color="gray.500">{e.category}</Text>
                    </Flex>

                    {/* Location */}
                    <Flex display={{ base: 'none', md: 'flex' }} align="center" gap={2}>
                      <Badge bg="gray.100" color="gray.700" px={2} py={1} borderRadius="full" fontSize="xs">
                        {e.location}
                      </Badge>
                    </Flex>

                    {/* Tags */}
                    <Flex display={{ base: 'none', md: 'flex' }} gap={2} flexWrap="wrap">
                      {(e.tags || []).slice(0, 3).map((t, i) => (
                        <Badge key={i} bg="pink.50" color="#EC4899" px={2} py={1} borderRadius="md" fontSize="xs">
                          {t}
                        </Badge>
                      ))}
                    </Flex>
                  </Grid>
                ))}
              </Box>
            </Box>

            {/* RIGHT SIDEBAR */}
            <Box w={{ base: '100%', lg: '340px' }}>
              {/* Calendar */}
              <Box bg="white" borderRadius="2xl" p={6} mb={6} boxShadow="sm">
                <Text fontSize="sm" fontWeight="semibold" mb={4} color="gray.700">Your Calendar</Text>
                <Box bg="pink.50" p={4} borderRadius="lg">
                  <Text fontSize="xs" color="gray.600" mb={3} textAlign="center">{month} {year}</Text>
                  <Grid templateColumns="repeat(7, 1fr)" gap={1}>
                    {['S','M','T','W','T','F','S'].map((d,i)=><Text key={i} fontSize="xs" textAlign="center" fontWeight="semibold">{d}</Text>)}
                    {[...Array(firstDay)].map((_,i)=><Box key={i}/>)}
                    {[...Array(daysInMonth)].map((_,i)=>{
                      const day=i+1; const isToday=day===currentDay; const hasEvent=hasEventOnDay(day)
                      return(
                        <Box key={day} position="relative" textAlign="center" p={1} borderRadius="md" bg={isToday?'#EC4899':'transparent'} color={isToday?'white':'gray.700'} fontSize="xs">
                          {day}
                          {hasEvent && <Box position="absolute" bottom="2px" left="50%" transform="translateX(-50%)" w="4px" h="4px" borderRadius="full" bg={isToday?'white':'#EC4899'}/>}
                        </Box>
                      )
                    })}
                  </Grid>
                </Box>
              </Box>

              {/* MEDIA PREVIEW BOX */}
              <Box bg="white" borderRadius="2xl" p={4} mb={6} boxShadow="sm">
                <Flex justify="space-between" align="center" mb={3}>
                  <Text fontSize="sm" fontWeight="semibold" color="gray.700">Media</Text>
                  {mediaGallery.length > 0 && (
                    <Button
                      variant="link"
                      color="#EC4899"
                      fontSize="xs"
                      fontWeight="semibold"
                      onClick={() => setIsMediaOpen(true)}
                      _hover={{ textDecoration: 'underline' }}
                    >
                      View All
                    </Button>
                  )}
                </Flex>

                {mediaGallery.length > 0 ? (
                  <Box
                    position="relative"
                    borderRadius="lg"
                    overflow="hidden"
                    cursor="pointer"
                    onClick={() => setIsMediaOpen(true)}
                    _hover={{ transform: 'scale(1.01)', boxShadow: 'md' }}
                    transition="all 0.2s ease"
                  >
                    {latestMedia?.type === 'image' ? (
                      <Box as="img" src={latestMedia.url} alt={latestMedia.title} w="100%" h="180px" objectFit="cover" bg="gray.100" />
                    ) : (
                      <Box position="relative">
                        <Box
                          as="img"
                          src={getVideoThumb(latestMedia.url) || mediaGallery.find(m => m.type === 'image')?.url}
                          alt={latestMedia.title}
                          w="100%"
                          h="180px"
                          objectFit="cover"
                          bg="gray.100"
                        />
                        <Flex position="absolute" inset={0} align="center" justify="center" pointerEvents="none">
                          <Box bg="rgba(236,72,153,0.9)" p={3} borderRadius="full">
                            <PlayCircle size={36} color="white" />
                          </Box>
                        </Flex>
                      </Box>
                    )}

                    <Flex position="absolute" bottom={0} left={0} right={0} bg="rgba(0,0,0,0.55)" color="white" align="center" justify="center" py={2}>
                      <Text fontSize="sm" fontWeight="medium">
                        {latestMedia?.title || 'View Gallery'}
                      </Text>
                    </Flex>
                  </Box>
                ) : (
                  <Box h="100px" display="flex" alignItems="center" justifyContent="center" border="1px dashed" borderColor="gray.200" borderRadius="lg">
                    <Text fontSize="sm" color="gray.400">No media available</Text>
                  </Box>
                )}
              </Box>

              {/* MEDIA GALLERY MODAL */}
              {isMediaOpen && (
                <Box
                  position="fixed" top={0} left={0} w="100vw" h="100vh" bg="rgba(0, 0, 0, 0.7)"
                  backdropFilter="blur(8px)" zIndex={2000} display="flex" alignItems="center" justifyContent="center"
                  p={4} onClick={() => { setIsMediaOpen(false); setSelectedMedia(null) }}
                >
                  <Box
                    bg="white" borderRadius="2xl" maxW="1100px" w="100%" maxH="90vh" overflowY="auto"
                    position="relative" boxShadow="2xl" p={6} onClick={(e) => e.stopPropagation()}
                  >
                    <IconButton aria-label="Close gallery" position="absolute" top={4} right={4}
                      variant="ghost" color="gray.600" onClick={() => { setIsMediaOpen(false); setSelectedMedia(null) }}
                      _hover={{ bg: 'gray.100' }} zIndex={1}>
                      <X size={20} />
                    </IconButton>
                    <Text fontSize="lg" fontWeight="semibold" mb={4}>Media Gallery</Text>

                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                      {mediaGallery.map((media, index) => {
                        const isVideo = media.type === 'video'
                        const thumb = isVideo ? (getVideoThumb(media.url) || mediaGallery.find(m => m.type === 'image')?.url) : media.url
                        return (
                          <Box
                            key={index}
                            position="relative"
                            borderRadius="lg"
                            overflow="hidden"
                            cursor="pointer"
                            bg="white"
                            boxShadow="sm"
                            _hover={{ transform: 'scale(1.02)', boxShadow: 'md' }}
                            transition="all 0.2s"
                            onClick={(e) => { e.stopPropagation(); setSelectedMedia(media) }}
                          >
                            <Box as="img" src={thumb} alt={media.title} w="100%" h="220px" objectFit="cover" bg="gray.100" />
                            {isVideo && (
                              <Flex position="absolute" top={0} left={0} right={0} bottom="60px" align="center" justify="center" pointerEvents="none">
                                <Box bg="rgba(236,72,153,0.9)" p={3} borderRadius="full">
                                  <PlayCircle size={40} color="white" />
                                </Box>
                              </Flex>
                            )}
                            <Box p={3} borderTop="1px solid" borderColor="gray.100">
                              <Text fontSize="sm" fontWeight="medium" mb={1}>{media.title}</Text>
                              <Text fontSize="xs" color="gray.600">By: {media.by}</Text>
                            </Box>
                          </Box>
                        )
                      })}
                    </Grid>
                  </Box>
                </Box>
              )}

              {/* FULLSCREEN MEDIA VIEWER */}
              {selectedMedia && (
                <Box
                  position="fixed" top={0} left={0} w="100vw" h="100vh" bg="rgba(0, 0, 0, 0.95)"
                  zIndex={3000} display="flex" flexDirection="column" alignItems="center" justifyContent="center"
                  p={4} onClick={() => setSelectedMedia(null)}
                >
                  <IconButton
                    aria-label="Close media viewer"
                    position="absolute"
                    top={6}
                    right={6}
                    color="white"
                    bg="rgba(255,255,255,0.1)"
                    onClick={() => setSelectedMedia(null)}
                    _hover={{ bg: 'rgba(255,255,255,0.2)' }}
                    zIndex={1}
                  >
                    <X size={24} />
                  </IconButton>

                  {selectedMedia.type === 'image' ? (
                    <Box
                      w="90vw"
                      maxW="1200px"
                      onClick={(e) => e.stopPropagation()}
                      display="flex"
                      flexDirection="column"
                      gap={3}
                      alignItems="center"
                    >
                      <Box
                        as="img"
                        src={selectedMedia.url}
                        alt={selectedMedia.title || 'Image'}
                        maxH="75vh"
                        maxW="100%"
                        borderRadius="lg"
                        objectFit="contain"
                      />
                      <Box color="white" textAlign="center">
                        <Text fontSize="lg" fontWeight="semibold">
                          {selectedMedia.title || 'Image'}
                        </Text>
                        {selectedMedia.by && (
                          <Text fontSize="sm" color="gray.300">
                            By: {selectedMedia.by}
                          </Text>
                        )}
                      </Box>
                    </Box>
                  ) : (
                    <Box
                      w="90vw"
                      maxW="1200px"
                      onClick={(e) => e.stopPropagation()}
                      display="flex"
                      flexDirection="column"
                      gap={3}
                    >
                      <Box borderRadius="lg" overflow="hidden" bg="black">
                        {isYouTube(selectedMedia.url) ? (
                          <Box
                            as="iframe"
                            width="100%"
                            height="75vh"
                            src={`https://www.youtube.com/embed/${getYouTubeId(selectedMedia.url)}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1`}
                            title={selectedMedia.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            loading="eager"
                            referrerPolicy="strict-origin-when-cross-origin"
                            style={{ display: 'block', border: '0' }}
                            onError={() => toast.error('Unable to load YouTube video.')}
                          />
                        ) : (
                          <ReactPlayer
                            url={selectedMedia.url}
                            width="100%"
                            height="75vh"
                            controls
                            playing
                            playsinline
                            onError={() => toast.error('Unable to load this video.')}
                          />
                        )}
                      </Box>
                      <Box color="white" textAlign="center">
                        <Text fontSize="lg" fontWeight="semibold">{selectedMedia.title}</Text>
                        <Text fontSize="sm" color="gray.300">By: {selectedMedia.by}</Text>
                      </Box>
                    </Box>
                  )}
                </Box>
              )}

              {/* SHARE + CONTACT */}
              <Box bg="white" borderRadius="2xl" p={6} mb={6} boxShadow="sm">
                <Flex gap={3}>
                  <Button flex={1} variant="outline" onClick={handleShare} _hover={{ bg: 'gray.50' }}>
                    <Share2 size={18} style={{ marginRight: '8px' }} /> Share
                  </Button>
                  <Button flex={1} variant="outline" onClick={handleContact} _hover={{ bg: 'gray.50' }}>
                    <MessageSquare size={18} style={{ marginRight: '8px' }} /> Contact
                  </Button>
                </Flex>
              </Box>

              {/* HOST INFO */}
              {/* HOSTED BY (modern, data-backed, clickable) */}
              {(() => {
                const host = findHostGroup(event)
                const title = host?.name || event.groupName || event.category || 'Group'
                const gid = host?._id || event.groupId || slugify(title)
                const thumb = host?.image || event.groupImage || event.groupAvatar || event.groupLogo || null
                const memberCount = host?.members ?? event.groupMembers ?? event.members ?? event.attendees ?? 0
                const groupLocation = host?.location || event.groupLocation
                const joined = isMember(gid)

                return (
                  <Box
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/groups/${gid}`); window.scrollTo(0, 0)
                      }
                    }}
                    onClick={() => { navigate(`/groups/${gid}`); window.scrollTo(0, 0) }}
                    bg="white"
                    borderRadius="2xl"
                    p={0}
                    boxShadow="sm"
                    overflow="hidden"
                    transition="transform 0.2s ease, box-shadow 0.2s ease"
                    _hover={{ transform: 'translateY(-4px)', boxShadow: '0 16px 36px rgba(0,0,0,0.12)' }}
                    _focusVisible={{ outline: '2px solid #EC4899', outlineOffset: '2px' }}
                  >
                    {/* Accent bar */}
                    <Box h="6px" bgGradient="linear(to-r, pink.400, purple.400)" />

                    <Flex p={5} align="center" gap={4}>
                      {/* Avatar */}
                      <Box w="56px" h="56px" borderRadius="lg" overflow="hidden" flexShrink={0} bg="gray.100">
                        {thumb ? (
                          <Box as="img" src={thumb} alt={title} w="100%" h="100%" objectFit="cover" />
                        ) : (
                          <Flex
                            w="100%" h="100%" align="center" justify="center"
                            bgGradient="linear(135deg, pink.100, purple.100)"
                            color="gray.800" fontWeight="bold" fontSize="sm"
                          >
                            {getInitials(title)}
                          </Flex>
                        )}
                      </Box>

                      {/* Textual */}
                      <Box flex="1" minW={0}>
                        <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
                          Hosted by
                        </Text>
                        <Text fontSize="lg" fontWeight="semibold" noOfLines={1}>
                          {title}
                        </Text>

                        <Flex gap={2} mt={1} wrap="wrap">
                          {groupLocation && (
                            <Badge bg="gray.100" color="gray.700" borderRadius="full" px={2} py={0.5} fontSize="10px">
                              <MapPin size={12} style={{ marginRight: 4 }} /> {groupLocation}
                            </Badge>
                          )}
                          <Badge bg="gray.100" color="gray.700" borderRadius="full" px={2} py={0.5} fontSize="10px">
                            <Users size={12} style={{ marginRight: 4 }} />
                            {memberCount.toLocaleString()} members
                          </Badge>
                        </Flex>
                      </Box>

                      {/* Right-side action area: stop propagation so it won't navigate */}
                      <Flex direction="column" align="flex-end" gap={4} pl={2}>
                        <Button
                          size="sm"
                          bg={joined ? 'gray.100' : '#EC4899'}
                          color={joined ? 'gray.700' : 'white'}
                          onClick={(e) => {
                            e.stopPropagation()
                            joined ? leave(gid) : join(gid)
                            toast.success(joined ? 'Left group.' : 'Joined group!')
                          }}
                          _hover={{ bg: joined ? 'gray.200' : '#C7327C' }}
                        >
                          {joined ? 'Leave' : 'Join'}
                        </Button>
                        <Text fontSize="xs" color="gray.400" pr={1} pointerEvents="none">
                          View group →
                        </Text>
                      </Flex>
                    </Flex>
                  </Box>
                )
              })()}



            </Box>
          </Flex>
        </Box>
      </Box>
    </>
  )
}

export default EventDetails
