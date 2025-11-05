import { Box, Text, Flex } from '@chakra-ui/react'
import { dummyGroupsData } from '../assets/assets'
import GroupCard from '@/components/GroupCard'

const Groups = () => {
  return (
    
    <Box pt="120px" pb={16} bg="gray.50" minH="100vh">
      
      <Box
        px={{ base: 6, md: 12, lg: 20, xl: 62 }}
        maxW="1400px"
        mx="auto"
      >
        <Text
          fontSize="3xl"
          fontWeight="bold"
          mb={10}
          textAlign="center"
        >
          All Groups
        </Text>

        <Flex
          gap={5}
          flexWrap="wrap"
          justify="center"
          align="center"
        >
          {dummyGroupsData.map((group) => (
            <GroupCard key={group._id} group={group} />
          ))}
        </Flex>
      </Box>
    </Box>
  )
}

export default Groups
