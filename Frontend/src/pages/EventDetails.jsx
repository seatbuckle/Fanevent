import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Flex, Text, Button, Badge, IconButton, Grid } from '@chakra-ui/react'
import {
  DialogRoot,
  DialogContent,
  DialogBody,
  DialogCloseTrigger,
  DialogBackdrop,
} from '@chakra-ui/react'
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
import ReactPlayer from 'react-player'
import { dummyEventsData } from '../assets/assets'
import EventCard from '@/components/EventCard'
import toast, { Toaster } from 'react-hot-toast'

const EventDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [event, setEvent] = useState(null)
  const [isLiked, setIsLiked] = useState(false)
  const [hasRSVP, setHasRSVP] = useState(false)
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [isCheckedOut, setIsCheckedOut] = useState(false)
  const [checkInTime, setCheckInTime] = useState(null)
  const [hoursLogged, setHoursLogged] = useState(null)
  const [hasSkipped, setHasSkipped] = useState(false)
  const [hasJoinedGroup, setHasJoinedGroup] = useState(false)
  const [isMediaOpen, setIsMediaOpen] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [rsvpEvents, setRsvpEvents] = useState([])

  useEffect(() => {
    const foundEvent = dummyEventsData.find(e => e._id === id)
    setEvent(foundEvent)
    if (!foundEvent) navigate('/events')
  }, [id, navigate])

  const handleLike = () => setIsLiked(!isLiked)

  // --- helpers for video thumbnails ---
  const isYouTube = (url = '') =>
    /(?:youtube\.com\/.*v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/i.test(url)

  const getYouTubeId = (url = '') => {
    const m = url.match(/(?:youtube\.com\/.*[?&]v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/i)
    return m ? m[1] : null
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

  const handleCancelRSVP = () => {
    setHasRSVP(false)
    setRsvpEvents(rsvpEvents.filter(d => d !== event.date))
  }

  const handleCheckIn = () => {
    setIsCheckedIn(true)
    setCheckInTime(new Date())
  }

  const handleCancelCheckIn = () => {
    setIsCheckedIn(false)
    setCheckInTime(null)
  }

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
    } catch (err) {
      toast.error('Failed to copy link.')
    }
  }

  const handleContact = () => console.log('Contact button clicked (future feature)')
  const handleJoinGroup = () => setHasJoinedGroup(!hasJoinedGroup)
  const handleReport = () => toast('Report submitted — thank you!', { icon: '⚠️' })

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

  if (!event) return null
  const mediaGallery = event.media || []
  const latestMedia = mediaGallery[mediaGallery.length - 1]

  const relatedEvents = dummyEventsData.filter(e => e._id !== id && e.category === event?.category).slice(0, 3)
  const { month, year } = getCurrentMonth()
  const { firstDay, daysInMonth, currentDay } = getDaysInMonth()

  return (
    <>
      <Toaster />
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

                  {/* MAP + ABOUT */}
                  <Box bg="gray.100" borderRadius="lg" h="200px" mb={6} overflow="hidden">
                    <Box as="img" src="https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/-122.4699,37.7699,12,0/600x300@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw"
                      alt="Map" w="100%" h="100%" objectFit="cover" />
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

              {/* RELATED EVENTS */}
              {relatedEvents.length > 0 && (
                <Box mt={8}>
                  <Flex justify="space-between" align="center" mb={4}>
                    <Text fontSize="xl" fontWeight="semibold">Events like this...</Text>
                    <Button variant="plain" color="#EC4899" size="sm" onClick={() => navigate('/events')}>View All</Button>
                  </Flex>
                  <Flex gap={5} flexWrap="wrap">
                    {relatedEvents.map((e) => <EventCard key={e._id} event={e} />)}
                  </Flex>
                </Box>
              )}
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
                        <Box key={day} textAlign="center" p={1} borderRadius="md" bg={isToday?'#EC4899':'transparent'} color={isToday?'white':'gray.700'} fontSize="xs">
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
                        <Flex
                          position="absolute"
                          inset={0}
                          align="center"
                          justify="center"
                          pointerEvents="none"
                        >
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

              {/* MEDIA GALLERY MODAL (FULL SCREEN) */}
              {isMediaOpen && (
                <Box
                  position="fixed"
                  top={0}
                  left={0}
                  w="100vw"
                  h="100vh"
                  bg="rgba(0, 0, 0, 0.7)"
                  backdropFilter="blur(8px)"
                  zIndex={2000}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  p={4}
                  onClick={() => setIsMediaOpen(false)}
                >
                  <Box
                    bg="white"
                    borderRadius="2xl"
                    maxW="1100px"
                    w="100%"
                    maxH="90vh"
                    overflowY="auto"
                    position="relative"
                    boxShadow="2xl"
                    p={6}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconButton
                      aria-label="Close gallery"
                      position="absolute"
                      top={4}
                      right={4}
                      variant="ghost"
                      color="gray.600"
                      onClick={() => setIsMediaOpen(false)}
                      _hover={{ bg: 'gray.100' }}
                      zIndex={1}
                    >
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
                            onClick={() => setSelectedMedia(media)}
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

              {/* FULLSCREEN SINGLE MEDIA VIEWER */}
              {selectedMedia && (
                <Box
                  position="fixed"
                  top={0}
                  left={0}
                  w="100vw"
                  h="100vh"
                  bg="rgba(0, 0, 0, 0.95)"
                  zIndex={3000}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  onClick={() => setSelectedMedia(null)}
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
                      as="img" 
                      src={selectedMedia.url} 
                      maxH="90vh" 
                      maxW="90vw" 
                      onClick={(e) => e.stopPropagation()}
                      borderRadius="lg"
                    />
                  ) : (
                    <Box w="90vw" maxW="1200px" onClick={(e) => e.stopPropagation()}>
                      <ReactPlayer url={selectedMedia.url} width="100%" height="80vh" controls playing />
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
              <Box bg="white" borderRadius="2xl" p={6} boxShadow="sm">
                <Text fontSize="sm" fontWeight="semibold" mb={4}>
                  Hosted by
                </Text>
                <Text fontSize="lg" fontWeight="semibold" mb={3}>
                  {event.category}
                </Text>
                <Button
                  w="100%"
                  bg={hasJoinedGroup ? 'gray.100' : '#EC4899'}
                  color={hasJoinedGroup ? 'gray.700' : 'white'}
                  onClick={handleJoinGroup}
                  _hover={{ bg: hasJoinedGroup ? 'gray.200' : '#C7327C' }}
                  transition="all 0.3s ease"
                >
                  {hasJoinedGroup ? (
                    'Leave Group'
                  ) : (
                    <>
                      <Heart size={18} style={{ marginRight: '8px' }} />
                      Join Group
                    </>
                  )}
                </Button>
              </Box>
            </Box>
          </Flex>
        </Box>
      </Box>
    </>
  )
}

export default EventDetails