// Navbar.jsx
import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { assets, dummyEventsData, dummyGroupsData } from '../assets/assets'
import { Menu, Search, X, Bell, LayoutDashboard, MessageSquare } from 'lucide-react'
import {
  Box,
  Flex,
  Button,
  IconButton,
  HStack,
  Link as ChakraLink,
  Text,
  Grid,
} from '@chakra-ui/react'
import {
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
  useClerk,
} from '@clerk/clerk-react'
import AdvancedSearchSheet from './AdvancedSearchModal'
import NotificationOverlay from './NotificationOverlay'

function useRole() {
  const { user } = useUser()
  // null when signed-out, otherwise "user" | "organizer" | "admin"
  return user ? (user.publicMetadata?.role || 'user') : null
}
  
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [aura, setAura] = useState({ x: 0, y: 0, visible: false })
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)

  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useUser()
  const role = useRole();
  const { openSignIn } = useClerk()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleAuraMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setAura({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      visible: true,
    })
  }

  const linkColor = (path) =>
    (path === '/' ? pathname === '/' : pathname.startsWith(path))
      ? '#EC4899'
      : 'gray.700'

  // Default Clerk avatar size for navbar
  const clerkAppearance = {
    elements: {
      userButtonAvatarBox: { width: 36, height: 36 },
      rootBox: { width: 36, height: 36 },
      userButtonPopoverActionButton: {
        transition: 'background-color 0.2s ease',
        '&:hover': { backgroundColor: '#FCE7F3' },
      },
    },
  }

  // Larger Clerk avatar for the mobile menu
  const largeClerkAppearance = {
    elements: {
      userButtonAvatarBox: { width: 84, height: 84 },
      rootBox: { width: 84, height: 84 },
      userButtonPopoverActionButton: {
        transition: 'background-color 0.2s ease',
        '&:hover': { backgroundColor: '#FCE7F3' },
      },
    },
  }


  // Navigate based on AdvancedSearchSheet filters
  const handleApplySearch = (filters) => {
    const qp = new URLSearchParams()
    if (filters.query) qp.set('q', filters.query)
    if (filters.tags?.length) qp.set('tags', filters.tags.join(','))
    if (filters.dates?.length) qp.set('dates', filters.dates.join(','))

    const kind = (filters.kind || 'All Results').toLowerCase()

    if (kind === 'events') {
      qp.set('type', 'events')
      navigate(`/events?${qp.toString()}`)
    } else if (kind === 'groups') {
      qp.set('type', 'groups')
      navigate(`/groups?${qp.toString()}`)
    } else {
      qp.set('type', 'all')
      navigate(`/all-results?${qp.toString()}`)
    }
  }

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      zIndex={50}
      width="100%"
      px={{ base: 4, md: 12, lg: 28 }}
      bg={isScrolled ? 'transparent' : '#FFFFFF'}
      transition="background-color 0.3s ease"
    >
      {/* TOP BAR: grid keeps everything vertically centered */}
      <Grid
        templateColumns={{ base: 'auto 1fr auto auto', md: 'auto 1fr auto auto' }}
        alignItems="center"
        gap={{ base: 2, md: 3 }}
        h={{ base: '60px', md: '72px' }}
      >
        {/* 1) Logo */}
        <Link to="/" style={{ outline: 'none' }}>
          <Flex align="center" gap={2}>
            <Box as="img" src={assets.logo} alt="Logo" w="50px" h="auto" mt={-1.5} />
            <Text
              fontFamily="'Inter', sans-serif"
              fontWeight="700"
              fontSize={{ base: 'md', md: 'lg' }}
              color="#EC4899"
              letterSpacing="-0.5px"
              mt={-0.5}
            >
              Fanevent
            </Text>
          </Flex>
        </Link>

        {/* 2) Center (nav pill shows on md+, hidden on base) */}
        <Box justifySelf="center" w="auto">
          <HStack
            display={{ base: 'none', md: 'flex' }}
            gap={8}
            px={10}
            py={2.5}
            borderRadius="full"
            position="relative"
            overflow="hidden"
            bg="whiteAlpha.150"
            backdropFilter="blur(20px) saturate(160%)"
            border="1px solid"
            borderColor="whiteAlpha.300"
            boxShadow="0 6px 24px rgba(0,0,0,0.18)"
            onMouseMove={handleAuraMove}
            onMouseEnter={() => setAura((a) => ({ ...a, visible: true }))}
            onMouseLeave={() => setAura((a) => ({ ...a, visible: false }))}
          >
            <Box
              pointerEvents="none"
              position="absolute"
              inset={0}
              opacity={aura.visible ? 1 : 0}
              transition="opacity 180ms ease"
              style={{
                background: `radial-gradient(140px 140px at ${aura.x}px ${aura.y}px, rgba(236,72,153,0.28), transparent 60%)`,
              }}
            />

            {[
              { label: 'Discover', path: '/' },
              { label: 'Events', path: '/events' },
              { label: 'Groups', path: '/groups' },
            ].map(({ label, path }) => (
              <ChakraLink
                key={label}
                as={Link}
                to={path}
                onClick={() => scrollTo(0, 0)}
                color={linkColor(path)}
                _hover={{ textDecoration: 'none', color: '#EC4899' }}
                _focus={{ boxShadow: 'none', outline: 'none' }}
                _active={{ boxShadow: 'none', outline: 'none' }}
              >
                {label}
              </ChakraLink>
            ))}
          </HStack>
        </Box>

        {/* 3) Right icons — ALWAYS visible & centered */}
        <Flex align="center" justify="flex-end" gap={{ base: 3, md: 5 }}>
          <IconButton
            variant="ghost"
            color="#99A0A8"
            aria-label="Search"
            _hover={{ bg: 'gray.100' }}
            _focus={{ boxShadow: 'none' }}
            _active={{ boxShadow: 'none' }}
            onClick={() => setIsSearchOpen(true)}
          >
            <Search size={20} />
          </IconButton>

          <IconButton
            variant="ghost"
            color="#99A0A8"
            aria-label="Notifications"
            _hover={{ bg: 'gray.100' }}
            _focus={{ boxShadow: 'none' }}
            _active={{ boxShadow: 'none' }}
            onClick={() => { if (user) setIsNotifOpen(true); }}
          >
            <Bell size={20} />
          </IconButton>
  <NotificationOverlay isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />

          <SignedOut>
            <Button
              px={{ base: 3, sm: 6 }}
              py={{ base: 1, sm: 1.5 }}
              bg="#EC4899"
              color="white"
              borderRadius="full"
              fontWeight="medium"
              _hover={{ bg: '#C7327C' }}
              onClick={() => openSignIn()}
              _focus={{ boxShadow: 'none' }}
              _active={{ boxShadow: 'none' }}
            >
              Login
            </Button>
          </SignedOut>

          <SignedIn>
            <UserButton
              appearance={{
                ...clerkAppearance,
                elements: { ...(clerkAppearance.elements || {}), rootBox: { alignSelf: 'center' } },
              }}
            >
              <UserButton.MenuItems>
                {role === "admin" && (
                  <UserButton.Action
                    label="Admin Dashboard"
                    labelIcon={<LayoutDashboard size={15} />}
                    onClick={() => navigate('/admin')}
                  />
                )}
                {role === "organizer" && (
                  <UserButton.Action
                    label="Organizer Dashboard"
                    labelIcon={<LayoutDashboard size={15} />}
                    onClick={() => navigate('/organizer')}
                  />
                )}
                {(role === "user" || !role) && (
                  <UserButton.Action
                    label="My Dashboard"
                    labelIcon={<LayoutDashboard size={15} />}
                    onClick={() => navigate('/my-dashboard')}
                  />
                )}
                <UserButton.Action
                  label="Messages"
                  labelIcon={<MessageSquare size={15} />}
                  onClick={() => navigate('/messages')}
                />
              </UserButton.MenuItems>
            </UserButton>
          </SignedIn>

        </Flex>

        {/* 4) Mobile menu button */}
        <IconButton
          display={{ base: 'inline-flex', md: 'none' }}
          ml={1}
          onClick={() => setIsOpen(!isOpen)}
          variant="ghost"
          color="#99A0A8"
          aria-label="Open menu"
          _hover={{ bg: 'gray.100' }}
          _focus={{ boxShadow: 'none' }}
          _active={{ bg: 'transparent' }}
        >
          <Menu size={22} />
        </IconButton>
      </Grid>

      {/* Mobile Nav Sheet */}

      <Box
        position="fixed"
        inset={0}
        zIndex={60}
        opacity={isOpen ? 1 : 0}
        pointerEvents={isOpen ? 'auto' : 'none'}
        transition="opacity 220ms ease"
        onClick={() => setIsOpen(false)}
        display={{ base: 'block', md: 'none' }}
      >
        {/* Backdrop */}
        <Box position="absolute" inset={0} bg="blackAlpha.300" backdropFilter="blur(6px)" />

        {/* Panel */}
        <Box
          position="absolute"
          right={{ base: 4, sm: 8 }}
          top={{ base: 10, sm: 14 }}
          w={{ base: '92%', sm: '420px' }}
          maxW="94vw"
          bg="white"
          borderRadius="2xl"
          boxShadow="0 28px 80px rgba(0,0,0,0.25)"
          overflow="hidden"
          transform={isOpen ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)'}
          transition="transform 260ms cubic-bezier(0.22,1,0.36,1)"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <Box
            bgGradient="linear(to-r, pink.400, fuchsia.500)"
            color="white"
            px={6}
            pt="68px"
            pb={4}
            position="relative"
            textAlign="center"
          >
            {/* Avatar INSIDE header (no clipping) */}
            <Box
              position="absolute"
              top="25px"             
              left="50%"
              transform="translateX(-50%)"
              borderRadius="full"
              border="3px solid white"
              boxShadow="0 4px 16px rgba(0,0,0,0.2)"
              w="72px"
              h="72px"
              overflow="hidden"
              bg="white"
            >
              <UserButton appearance={largeClerkAppearance} />
            </Box>

            <Text fontWeight="bold" fontSize="lg" mt={1}>
              Menu
            </Text>

            <IconButton
              aria-label="Close menu"
              position="absolute"
              top={2.5}
              right={2.5}
              size="sm"
              variant="ghost"
              color="whiteAlpha.900"
              _hover={{ bg: 'whiteAlpha.300' }}
              onClick={() => setIsOpen(false)}
            >
              <X size={20} />
            </IconButton>
          </Box>

          {/* Content */}
          <Box px={6} pt={4} pb={6}>
            {/* Links (bigger text, tight top spacing) */}
            <Flex direction="column" gap={2}>
              {[
                { label: 'Discover', path: '/' },
                { label: 'Events', path: '/events' },
                { label: 'Groups', path: '/groups' },
              ].map(({ label, path }) => (
                <Button
                  key={label}
                  variant="ghost"
                  justifyContent="flex-start"
                  h="56px"
                  borderRadius="lg"
                  fontSize="xl"
                  color="gray.700"
                  transition="all 0.2s ease"
                  _hover={{ bg: 'pink.50', color: '#EC4899', transform: 'translateX(4px)' }}
                  onClick={() => { navigate(path); scrollTo(0, 0); setIsOpen(false) }}
                >
                  {label}
                </Button>
              ))}
            </Flex>

            <Box h="1px" bg="gray.100" my={4} />

            {/* Actions */}
            <Flex gap={3}>
              <IconButton
                aria-label="Search"
                variant="outline"
                flex="1"
                h="50px"
                _hover={{ bg: 'pink.50', color: '#EC4899', borderColor: '#EC4899' }}
                onClick={() => { setIsOpen(false); setIsSearchOpen(true) }}
              >
                <Search size={20} />
              </IconButton>
              <IconButton
                aria-label="Notifications"
                variant="outline"
                flex="1"
                h="50px"
                _hover={{ bg: 'pink.50', color: '#EC4899', borderColor: '#EC4899' }}
              >
                <Bell size={20} />
              </IconButton>
            </Flex>

            <Box h="1px" bg="gray.100" my={4} />

            {/* Auth */}
            <SignedOut>
              <Button
                w="100%"
                h="52px"
                fontSize="md"
                bg="#EC4899"
                color="white"
                borderRadius="lg"
                fontWeight="medium"
                _hover={{ bg: '#C7327C' }}
                onClick={() => { setIsOpen(false); openSignIn() }}
              >
                Login
              </Button>
            </SignedOut>

            <SignedIn>
              <Flex direction="column" gap={3}>
                {role === "admin" && (
                  <Button
                    leftIcon={<LayoutDashboard size={18} />}
                    variant="outline"
                    fontSize="md"
                    h="48px"
                    onClick={() => { setIsOpen(false); navigate('/admin') }}
                    _hover={{ bg: 'pink.50', color: '#EC4899', borderColor: '#EC4899' }}
                  >
                    Admin Dashboard
                  </Button>
                )}
                {role === "organizer" && (
                  <Button
                    leftIcon={<LayoutDashboard size={18} />}
                    variant="outline"
                    fontSize="md"
                    h="48px"
                    onClick={() => { setIsOpen(false); navigate('/organizer') }}
                    _hover={{ bg: 'pink.50', color: '#EC4899', borderColor: '#EC4899' }}
                  >
                    Organizer Dashboard
                  </Button>
                )}
                {(role === "user" || !role) && (
                  <Button
                    leftIcon={<LayoutDashboard size={18} />}
                    variant="outline"
                    fontSize="md"
                    h="48px"
                    onClick={() => { setIsOpen(false); navigate('/my-dashboard') }}
                    _hover={{ bg: 'pink.50', color: '#EC4899', borderColor: '#EC4899' }}
                  >
                    My Dashboard
                  </Button>
                )}
                <Button
                  leftIcon={<MessageSquare size={18} />}
                  variant="outline"
                  fontSize="md"
                  h="48px"
                  onClick={() => { setIsOpen(false); navigate('/messages') }}
                  _hover={{ bg: 'pink.50', color: '#EC4899', borderColor: '#EC4899' }}
                >
                  Messages
                </Button>
              </Flex>
            </SignedIn>
          </Box>
        </Box>
      </Box>



      {/* Advanced Search Sheet */}
      <AdvancedSearchSheet
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onApply={handleApplySearch}
        events={dummyEventsData || []}
        groups={dummyGroupsData || []}
      />
    </Box>
  )
}

export default Navbar