// Navbar.jsx
import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { Menu, Search, X, Bell, LayoutDashboard, MessageSquare } from 'lucide-react'
import {
  Box,
  Flex,
  Button,
  IconButton,
  HStack,
  Link as ChakraLink,
  Text,
} from '@chakra-ui/react'
import {
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
  useClerk,
} from '@clerk/clerk-react'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [aura, setAura] = useState({ x: 0, y: 0, visible: false })

  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useUser()
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

  // Shared Clerk UserButton appearance for consistent hover styling
  const clerkAppearance = {
    elements: {
      userButtonAvatarBox: { width: 36, height: 36 },
      userButtonPopoverActionButton: {
        transition: 'background-color 0.2s ease',
        '&:hover': {
          backgroundColor: '#FCE7F3', // light pink hover
        },
      },
    },
  }

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      zIndex={50}
      width="100%"
      px={{ base: 6, md: 12, lg: 28 }}
      py={3.5}
      bg={isScrolled ? 'transparent' : '#FFFFFF'}
      transition="background-color 0.3s ease"
    >
      <Flex align="center" justify="space-between">
        {/* Logo */}
        <Link to="/" style={{ outline: 'none' }}> {/* Added outline none here just in case */}
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

        {/* Desktop Nav */}
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
              // FIX: Remove grey box on click/focus
              _focus={{ boxShadow: 'none', outline: 'none' }}
              _active={{ boxShadow: 'none', outline: 'none' }}
            >
              {label}
            </ChakraLink>
          ))}
        </HStack>

        {/* Mobile Nav Overlay */}
        <Box
          display={{ base: isOpen ? 'flex' : 'none', md: 'none' }}
          position="fixed"
          top={0}
          left={0}
          width="100%"
          height="100vh"
          bg="whiteAlpha.900"
          backdropFilter="blur(12px)"
          zIndex={50}
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={8}
          fontSize="lg"
          fontWeight="medium"
        >
          <IconButton
            position="absolute"
            top={6}
            right={6}
            onClick={() => setIsOpen(false)}
            variant="ghost"
            color="#99A0A8"
            aria-label="Close menu"
          >
            <X size={22} />
          </IconButton>

          {[
            { label: 'Discover', path: '/' },
            { label: 'Events', path: '/events' },
            { label: 'Groups', path: '/groups' },
          ].map(({ label, path }) => (
            <ChakraLink
              key={label}
              as={Link}
              to={path}
              onClick={() => {
                scrollTo(0, 0)
                setIsOpen(false)
              }}
              color={linkColor(path)}
              _hover={{ textDecoration: 'none', color: '#EC4899' }}
              // FIX: Remove grey box on click/focus
              _focus={{ boxShadow: 'none', outline: 'none' }}
              _active={{ boxShadow: 'none', outline: 'none' }}
            >
              {label}
            </ChakraLink>
          ))}

          {/* Mobile Auth Area */}
          <SignedOut>
            <Button
              onClick={() => openSignIn()}
              px={{ base: 4, sm: 6 }}
              py={{ base: 1, sm: 1.5 }}
              bg="#EC4899"
              color="white"
              borderRadius="full"
              fontWeight="medium"
              _hover={{ bg: '#C7327C' }}
              // FIX: Remove grey box on click/focus
              _focus={{ boxShadow: 'none' }}
              _active={{ boxShadow: 'none' }}
            >
              Login
            </Button>
          </SignedOut>

          <SignedIn>
            <UserButton appearance={clerkAppearance}>
              <UserButton.MenuItems>
                <UserButton.Action
                  label="My Dashboard"
                  labelIcon={<LayoutDashboard size={15} />}
                  onClick={() => navigate('/dashboard')}
                />
                <UserButton.Action
                  label="Messages"
                  labelIcon={<MessageSquare size={15} />}
                  onClick={() => navigate('/messages')}
                />
              </UserButton.MenuItems>
            </UserButton>
          </SignedIn>
        </Box>

        {/* Right Side Buttons */}
        <Flex align="center" gap={5}>
          <IconButton
            display={{ base: 'none', md: 'inline-flex' }}
            variant="ghost"
            color="#99A0A8"
            aria-label="Search"
            _hover={{ bg: 'gray.100' }}
            // FIX: Remove grey box on click/focus
            _focus={{ boxShadow: 'none' }}
            _active={{ boxShadow: 'none' }}
          >
            <Search size={20} />
          </IconButton>

          <IconButton
            display={{ base: 'none', md: 'inline-flex' }}
            variant="ghost"
            color="#99A0A8"
            aria-label="Notifications"
            _hover={{ bg: 'gray.100' }}
            // FIX: Remove grey box on click/focus
            _focus={{ boxShadow: 'none' }}
            _active={{ boxShadow: 'none' }}
          >
            <Bell size={20} />
          </IconButton>

          <SignedOut>
            <Button
              px={{ base: 4, sm: 6 }}
              py={{ base: 1, sm: 1.5 }}
              bg="#EC4899"
              color="white"
              borderRadius="full"
              fontWeight="medium"
              _hover={{ bg: '#C7327C' }}
              onClick={() => openSignIn()}
              // FIX: Remove grey box on click/focus
              _focus={{ boxShadow: 'none' }}
              _active={{ boxShadow: 'none' }}
            >
              Login
            </Button>
          </SignedOut>

          <SignedIn>
            <UserButton appearance={clerkAppearance}>
              <UserButton.MenuItems>
                <UserButton.Action
                  label="My Dashboard"
                  labelIcon={<LayoutDashboard size={15} />}
                  onClick={() => navigate('/dashboard')}
                />
                <UserButton.Action
                  label="Messages"
                  labelIcon={<MessageSquare size={15} />}
                  onClick={() => navigate('/messages')}
                />
              </UserButton.MenuItems>
            </UserButton>
          </SignedIn>
        </Flex>

        {/* Mobile Menu Button */}
        <IconButton
          display={{ base: 'inline-flex', md: 'none' }}
          ml={3}
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
      </Flex>
    </Box>
  )
}

export default Navbar