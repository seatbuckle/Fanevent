import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { assets } from '../assets/assets'
import { Menu, Search, X, Bell } from 'lucide-react'
import {
  Box,
  Flex,
  Button,
  IconButton,
  HStack,
  Link as ChakraLink,
  Text,
} from '@chakra-ui/react'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [aura, setAura] = useState({ x: 0, y: 0, visible: false })

  const { pathname } = useLocation()

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

  // active color helper
  const linkColor = (path) =>
    (path === '/' ? pathname === '/' : pathname.startsWith(path))
      ? '#EC4899'
      : 'gray.700'

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
        {/* Logo + Brand Name */}
        <Link to="/">
          <Flex align="center" gap={2}>
            <Box
              as="img"
              src={assets.logo}
              alt="Logo"
              w="50px"
              h="auto"
              mt={-1.5}
            />
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

        {/* Desktop Navigation (glass + aura + active pink) */}
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
          {/* Aura layer */}
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
              color={linkColor(path)} // pink when active, gray otherwise
              _hover={{ textDecoration: 'none', color: '#EC4899' }} // stays pink on hover
              _focus={{ boxShadow: 'none', outline: 'none' }}       // remove gray outline
              _focusVisible={{ boxShadow: 'none', outline: 'none' }}// remove gray outline
              _active={{ boxShadow: 'none', outline: 'none' }}      // remove gray outline
              position="relative"
              zIndex={1}
            >
              {label}
            </ChakraLink>
          ))}
        </HStack>

        {/* Mobile Navigation Overlay */}
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
            _focus={{ boxShadow: 'none' }}
            _focusVisible={{ boxShadow: 'none' }}
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
              _focus={{ boxShadow: 'none', outline: 'none' }}
              _focusVisible={{ boxShadow: 'none', outline: 'none' }}
              _active={{ boxShadow: 'none', outline: 'none' }}
            >
              {label}
            </ChakraLink>
          ))}
        </Box>

        {/* Right side actions */}
        <Flex align="center" gap={5}>
          <IconButton
            display={{ base: 'none', md: 'inline-flex' }}
            variant="ghost"
            color="#99A0A8"
            aria-label="Search"
            _hover={{ bg: 'gray.100' }}
            _focus={{ boxShadow: 'none' }}
            _focusVisible={{ boxShadow: 'none' }}
          >
            <Search size={20} />
          </IconButton>

          <IconButton
            display={{ base: 'none', md: 'inline-flex' }}
            variant="ghost"
            color="#99A0A8"
            aria-label="Notifications"
            _hover={{ bg: 'gray.100' }}
            _focus={{ boxShadow: 'none' }}
            _focusVisible={{ boxShadow: 'none' }}
          >
            <Bell size={20} />
          </IconButton>

          <Button
            px={{ base: 4, sm: 6 }}
            py={{ base: 1, sm: 1.5 }}
            bg="#EC4899"
            color="white"
            borderRadius="full"
            fontWeight="medium"
            _hover={{ bg: '#C7327C' }}
            _focus={{ boxShadow: 'none' }}
            _focusVisible={{ boxShadow: 'none' }}
          >
            Login
          </Button>
        </Flex>

        {/* Mobile menu button */}
        <IconButton
          display={{ base: 'inline-flex', md: 'none' }}
          ml={3}
          onClick={() => setIsOpen(!isOpen)}
          variant="ghost"
          color="#99A0A8"
          aria-label="Open menu"
          _hover={{ bg: 'gray.100' }}
          _focus={{ boxShadow: 'none' }}
          _focusVisible={{ boxShadow: 'none' }}
        >
          <Menu size={22} />
        </IconButton>
      </Flex>
    </Box>
  )
}

export default Navbar
