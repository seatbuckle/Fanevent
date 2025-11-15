import React from 'react'
import { assets } from '../assets/assets'
import { Box, Flex, Text, VStack, HStack, Image, Link } from '@chakra-ui/react'

const Footer = () => {
  return (
    <Box
      as="footer"
      px={{ base: 6, md: 16, lg: 36 }}
      mt={40}
      width="100%"
      color="gray.300"
    >
      <Flex
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        gap={10}
        borderBottom="1px solid"
        borderColor="gray.500"
        pb={14}
        color="pink.400"
      >
        <Box maxW={{ md: '384px' }}>
          <Image src={assets.logo} alt="logo" w="100px" h="auto" />
          <Text mt={6} fontSize="sm">
            Fanevent strives to connect fandoms together by providing a
            platform to discover and create events for fans by fans.
          </Text>
          <HStack mt={4} gap={2}>
            <Image src={assets.googlePlay} alt="google play" h="36px" w="auto" />
            <Image src={assets.appStore} alt="app store" h="36px" w="auto" />
          </HStack>
        </Box>

        <Flex
          flex={1}
          align="start"
          justify={{ md: 'flex-end' }}
          gap={{ base: 20, md: 40 }}
          color="pink.500"
        >
          <VStack align="start" spacing={5}>
            <Text fontWeight="semibold" color="inherit">Company</Text>
            <VStack align="start" fontSize="sm" spacing={2}>
              <Link href="#" color="pink.400">Home</Link>
              <Link href="#" color="pink.400">About us</Link>
              <Link href="#" color="pink.400">Contact us</Link>
              <Link href="#" color="pink.400">Privacy policy</Link>
            </VStack>
          </VStack>

          <VStack align="start" spacing={5}>
            <Text fontWeight="semibold" color="inherit">Get in touch</Text>
            <VStack align="start" fontSize="sm" spacing={2}>
              <Text color="pink.400">+1-234-567-890</Text>
              <Text color="pink.400">contact@example.com</Text>
            </VStack>
          </VStack>
        </Flex>

      </Flex>

      <Text pt={4} textAlign="center" fontSize="sm" color="pink.300" pb={5}>
        Copyright {new Date().getFullYear()} Team 6 All Right Reserved.
      </Text>
    </Box>
  )
}

export default Footer