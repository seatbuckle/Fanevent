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
      >
        <Box maxW={{ md: '384px' }}>
          <Image src={assets.logo} alt="logo" w="100px" h="auto" />
          <Text mt={6} fontSize="sm">
            Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.
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
        >
          <VStack align="start" spacing={5}>
            <Text fontWeight="semibold">Company</Text>
            <VStack align="start" fontSize="sm" spacing={2}>
              <Link href="#">Home</Link>
              <Link href="#">About us</Link>
              <Link href="#">Contact us</Link>
              <Link href="#">Privacy policy</Link>
            </VStack>
          </VStack>

          <VStack align="start" spacing={5}>
            <Text fontWeight="semibold">Get in touch</Text>
            <VStack align="start" fontSize="sm" spacing={2}>
              <Text>+1-234-567-890</Text>
              <Text>contact@example.com</Text>
            </VStack>
          </VStack>
        </Flex>
      </Flex>

      <Text pt={4} textAlign="center" fontSize="sm" pb={5}>
        Copyright {new Date().getFullYear()} Â© GreatStack. All Right Reserved.
      </Text>
    </Box>
  )
}

export default Footer