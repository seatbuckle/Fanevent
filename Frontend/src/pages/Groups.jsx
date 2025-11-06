// pages/Groups.jsx
import { useMemo, useState } from 'react'
import { Box, Text, Flex } from '@chakra-ui/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { dummyGroupsData, dummyEventsData } from '../assets/assets'
import GroupCard from '@/components/GroupCard'
import AdvancedSearchSheet from '@/components/AdvancedSearchModal'

const normalize = (s) => (s || '').toString().toLowerCase()
const cleanText = (s = '') => s.replace(/\s+/g, ' ').trim()
const truncate = (s = '', n = 48) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

const Groups = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const q = normalize(params.get('q') || '')
  const type = params.get('type') || ''
  const tags = (params.get('tags') || '').split(',').filter(Boolean)

  const handleApplySearch = (filters) => {
    const qp = new URLSearchParams()
    if (filters.query) qp.set('q', filters.query)
    if (filters.tags?.length) qp.set('tags', filters.tags.join(','))
    // dates ignored for groups
    qp.set('type', 'groups')
    navigate(`/groups?${qp.toString()}`)
  }

  const filtered = useMemo(() => {
    return (dummyGroupsData || []).filter((grp) => {
      const hay = [grp.name, grp.description, grp.location, ...(grp.tags || [])]
        .map(normalize)
        .join(' | ')
      const textOK = q ? hay.includes(q) || hay.indexOf(q) !== -1 : true

      const tg = (grp.tags || []).map(normalize)
      const tagsOK = tags.length ? tags.every((t) => tg.includes(normalize(t))) : true

      const typeOK = type ? type === 'groups' : true
      return textOK && tagsOK && typeOK
    })
  }, [q, type, tags])

  return (
    <Box pt="120px" pb={16} bg="gray.50" minH="100vh">
      <Box px={{ base: 6, md: 12, lg: 20, xl: 62 }} maxW="1400px" mx="auto">
        <Text fontSize="3xl" fontWeight="bold" mb={4} textAlign="center">
          All Groups
        </Text>

        {/* Search pill */}
        <Box display="flex" justifyContent="center" mb={8}>
          <Box
            role="button"
            onClick={() => setOpen(true)}
            px={4}
            py={3}
            borderRadius="9999px"
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            boxShadow="sm"
            maxW="720px"
            w="100%"
            cursor="pointer"
            _hover={{ borderColor: 'pink.300', boxShadow: 'md' }}
          >
            <Flex align="center" gap={3} color="gray.500">
              <Box>🔍</Box>
              <Text fontSize="sm" flex="1" noOfLines={1}>
                {params.get('q') ? `Search groups… (${params.get('q')})` : 'Search groups…'}
              </Text>
              <Box
                px="8px"
                py="2px"
                borderRadius="9999px"
                bg="pink.50"
                color="pink.600"
                fontSize="xs"
                border="1px solid"
                borderColor="pink.200"
              >
                Groups
              </Box>
            </Flex>
          </Box>
        </Box>

        {q && (
          <Box mb={6} display="flex" justifyContent="center">
            <Text fontSize="sm" color="gray.500" mr={2}>Showing results for</Text>
            <Box
              as="span"
              px="10px"
              py="4px"
              borderRadius="9999px"
              bg="pink.50"
              color="pink.600"
              border="1px solid"
              borderColor="pink.200"
              fontSize="sm"
              lineHeight="1"
              whiteSpace="nowrap"
              maxW="70vw"
              textOverflow="ellipsis"
              overflow="hidden"
              display="inline-block"
            >
              {truncate(cleanText(params.get('q') || ''))}
            </Box>
          </Box>
        )}

        <Flex gap={5} flexWrap="wrap" justify="center" align="center">
          {filtered.length ? (
            filtered.map((group) => <GroupCard key={group._id} group={group} />)
          ) : (
            <Text color="gray.500" mt={20}>No groups match your filters.</Text>
          )}
        </Flex>
      </Box>

      {/* Local overlay instance preset to Groups */}
      <AdvancedSearchSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        onApply={handleApplySearch}
        events={dummyEventsData || []}
        groups={dummyGroupsData || []}
        initialKind="Groups"
      />
    </Box>
  )
}

export default Groups
