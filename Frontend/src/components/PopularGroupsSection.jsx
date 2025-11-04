import { Box, Flex, Text, Button } from '@chakra-ui/react'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BlurCircle from './BlurCircle'
import GroupCard from './GroupCard'
import { dummyGroupsData } from '../assets/assets'

const PopularGroupsSection = () => {
  const navigate = useNavigate()

  return (
    <Box px={{ base: 6, md: 12, lg: 20, xl: 32 }} overflow="hidden" py={8}>
      <Flex
        align="center"
        justify="space-between"
        position="relative"
        pt={12}
        pb={6}
      >
        <BlurCircle top="100px" left="-80px" />

        <Text fontWeight="semibold" fontSize="xl" color="gray.800">
          Popular Groups
        </Text>

        <Button
          onClick={() => { navigate('/groups'); scrollTo(0, 0) }}
          variant="link"
          color="#EC4899"
          fontWeight="medium"
          fontSize="sm"
          rightIcon={<ArrowRight size={16} />}
          _hover={{ textDecoration: 'none', color: '#C7327C' }}
        >
          View All
        </Button>
      </Flex>

      <Flex
        gap={5}
        flexWrap="wrap"
        justify="center"
        mt={6}
      >
        {dummyGroupsData.slice(0, 6).map((group) => (
          <GroupCard key={group._id} group={group} />
        ))}
      </Flex>
    </Box>
  )
}

export default PopularGroupsSection
