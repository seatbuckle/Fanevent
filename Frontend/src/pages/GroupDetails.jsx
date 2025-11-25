// src/pages/GroupDetails.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import useGroupMemberships from '@/hooks/useGroupMemberships';
import ReportModal from '@/components/ui/ReportModal';
import {
  Box,
  Flex,
  Text,
  Button,
  IconButton,
  Badge,
  Grid,
} from '@chakra-ui/react';
import {
  ChevronLeft,
  Users,
  Flag,
  Calendar,
  MapPin,
  Tag as TagIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { dummyGroupsData, dummyEventsData } from '../assets/assets';

/** simple inline separator to replace <Divider /> */
const Separator = (props) => <Box h="1px" bg="gray.100" my={4} {...props} />;

// ---- helpers for varied API shapes ----
const getMembersCount = (g) => {
  if (!g) return 0;
  if (typeof g.membersCount === 'number') return g.membersCount;
  if (Array.isArray(g.members)) return g.members.length;
  if (Array.isArray(g.memberIds)) return g.memberIds.length;
  return Number(g.members || 0);
};

const hasUserJoined = (g, clerkUserId) => {
  if (!g || !clerkUserId) return false;
  if (g.isMember === true) return true;
  const ids =
    (Array.isArray(g.memberIds) && g.memberIds) ||
    (Array.isArray(g.members) &&
      g.members.map((m) =>
        typeof m === 'string'
          ? m
          : m?.clerkId || m?.externalId || m?._id || m?.id
      )) ||
    [];
  return ids.includes(clerkUserId);
};

const extractEventsFromResponse = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.events)) return res.events;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.results)) return res.results;
  return [];
};

const normalizeEventsResponse = (res) => {
  if (!res) return [];
  // plain array
  if (Array.isArray(res)) return res;
  // common API wrappers
  if (Array.isArray(res.events)) return res.events;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.results)) return res.results;
  return [];
};

const eventMatchesGroup = (event, group) => {
  if (!event || !group) return false;

  const groupId = group._id || group.id;
  const groupName = (group.name || '').toLowerCase();
  const groupKey = (normalizeEventGroupMatch(group) || '').toLowerCase();

  // Try to derive event's group id in various shapes
  let evGroupId =
    event.groupId ||
    event.group_id ||
    (typeof event.group === 'string' ? event.group : null);

  if (!evGroupId && event.group && typeof event.group === 'object') {
    evGroupId = event.group._id || event.group.id;
  }

  const evGroupName = (
    event.groupName ||
    event.group_name ||
    (event.group && event.group.name) ||
    ''
  ).toLowerCase();

  const evCategory = (
    event.category ||
    event.groupCategory ||
    ''
  ).toLowerCase();

  // 1. Prefer strict ID match
  if (groupId && evGroupId && String(evGroupId) === String(groupId)) return true;

  // 2. Fallback: group name match
  if (groupName && evGroupName && evGroupName === groupName) return true;

  // 3. Last resort: category / key match
  if (groupKey && evCategory && evCategory === groupKey) return true;

  return false;
};



const getEventDate = (evt) => {
  return new Date(
    evt.startAt ||
    evt.date ||
    evt.startDate ||
    evt.start_time ||
    evt.start_time_utc ||
    evt.createdAt ||
    evt.created_at ||
    Date.now()
  );
};

const filterAndSortUpcoming = (events) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return events
    .filter((e) => {
      const d = getEventDate(e);
      if (Number.isNaN(d.getTime())) return true; // keep if no valid date
      return d >= today;
    })
    .sort((a, b) => getEventDate(a) - getEventDate(b));
};


const normalizeEventGroupMatch = (g) => g?.name || g?.title || g?.category || '';

const GroupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const clerkId = user?.id || null;

  // Report modal state (group-level)
  const [isGroupReportOpen, setGroupReportOpen] = useState(false);

  const { isMember: isMemberLocal, join: joinLocal, leave: leaveLocal } =
    useGroupMemberships(clerkId);

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState([]);

  // ----- Load group from backend (fallback: dummy) -----
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const g = await api(`/api/groups/${id}`).catch(() => null);
        if (!mounted) return;

        if (g && g._id) {
          setGroup(g);
        } else {
          const d = dummyGroupsData.find((x) => x._id === id);
          setGroup(d || null);
          if (!d) navigate('/groups');
        }
      } catch {
        const d = dummyGroupsData.find((x) => x._id === id);
        setGroup(d || null);
        if (!d) navigate('/groups');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id, navigate]);

// ----- Load events for this group -----
useEffect(() => {
  let ignore = false;

  const loadEvents = async () => {
    if (!group) return;

    try {
      // 1. Try group-specific endpoint
      const res1 = await api(`/api/groups/${group._id}/events`).catch(() => null);
      let eventsFromServer = normalizeEventsResponse(res1);

      // 2. Fallback: generic events endpoint with query params
      if (!eventsFromServer.length) {
        const res2 = await api(
          `/api/events?groupId=${encodeURIComponent(
            group._id
          )}&group=${encodeURIComponent(group.name || '')}`
        ).catch(() => null);

        eventsFromServer = normalizeEventsResponse(res2);
      }

      // 3. Filter to only events belonging to this group
      const filteredServerEvents = (eventsFromServer || []).filter((ev) =>
        eventMatchesGroup(ev, group)
      );

      if (!ignore && filteredServerEvents.length) {
        setEvents(filteredServerEvents);
        return;
      }
    } catch (err) {
      console.error('Failed to load events for group', err);
    }

    // 4. Fallback to dummy events if server gave nothing useful
    if (!ignore) {
      const dummy = (dummyEventsData || [])
        .filter((ev) => eventMatchesGroup(ev, group))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setEvents(dummy);
    }
  };

  loadEvents();

  return () => {
    ignore = true;
  };
}, [group]);



  if (loading) return null;
  if (!group) return null;

  const joined = typeof group?.isMember === 'boolean' ? group.isMember : hasUserJoined(group, clerkId);
  const membersCount = getMembersCount(group);
  const canJoin = group.status ? group.status === 'approved' : true;

  const handleReport = () => {
    if (!clerkId) {
      toast.error('Please sign in to report content');
      return;
    }
    setGroupReportOpen(true);
  };

  const optimisticUpdate = (delta) =>
    setGroup((g) => {
      if (!g) return g;
      if (Array.isArray(g.members)) {
        const exists = hasUserJoined(g, clerkId);
        if (delta > 0 && !exists) {
          return {
            ...g,
            members: [...g.members, clerkId],
            membersCount: getMembersCount(g) + 1,
            isMember: true,
          };
        }
        if (delta < 0 && exists) {
          const ids = g.members.map((m) =>
            typeof m === 'string'
              ? m
              : m?.clerkId || m?.externalId || m?._id || m?.id
          );
          const idx = ids.indexOf(clerkId);
          const nextMembers =
            idx >= 0
              ? g.members.filter((_, i) => i !== idx)
              : g.members.slice();
          return {
            ...g,
            members: nextMembers,
            membersCount: Math.max(0, getMembersCount(g) - 1),
            isMember: false,
          };
        }
        return g;
      }
      return {
        ...g,
        membersCount: Math.max(0, getMembersCount(g) + delta),
        isMember: delta > 0 ? true : false,
      };
    });

  const fetchServerGroup = async (gid) => {
    const fresh = await api(`/api/groups/${gid}`).catch(() => null);
    if (fresh && fresh._id) {
      setGroup((g) => ({ ...(g || {}), ...fresh }));
    }
    return fresh;
  };

  const broadcastGroupsChanged = (action, g) => {
    try {
      window.dispatchEvent(
        new CustomEvent('groups:changed', {
          detail: { action, group: { _id: g._id, name: g.name, category: g.category } },
        })
      );
    } catch {}
  };

  const handleJoinLeave = async () => {
    if (!clerkId) {
      toast.error('Please sign in to join groups.');
      return;
    }
    if (!canJoin) {
      toast('This group is pending approval.', { icon: '⏳' });
      return;
    }

    if (busy) return;
    setBusy(true);

    try {
      if (!joined) {
        optimisticUpdate(+1);
        await api(`/api/groups/${group._id}/join`, { method: 'POST' });
        try { joinLocal(group._id); } catch {}
        const fresh = await fetchServerGroup(group._id);
        if (fresh) broadcastGroupsChanged('join', fresh);
        toast.success('Joined group!');
      } else {
        optimisticUpdate(-1);
        await api(`/api/groups/${group._id}/join`, { method: 'DELETE' });
        try { leaveLocal(group._id); } catch {}
        const fresh = await fetchServerGroup(group._id);
        if (fresh) broadcastGroupsChanged('leave', fresh);
        toast.success('Left group.');
      }
    } catch (e) {
      optimisticUpdate(joined ? +1 : -1);
      try {
        if (!joined) {
          joinLocal(group._id);
          toast.success('Joined group!');
        } else {
          leaveLocal(group._id);
          toast.success('Left group.');
        }
      } catch {
        toast.error(e?.message || 'Action failed');
      }
    } finally {
      setBusy(false);
    }
  };

  const formatLongDate = (d) =>
    new Date(d).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <Box pt="88px" pb={16} bg="gray.50" minH="100vh">
      <Box px={{ base: 6, md: 12, lg: 20, xl: 32 }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          color="gray.700"
          mb={4}
          leftIcon={<ChevronLeft size={16} />}
          _hover={{ bg: 'gray.100' }}
        >
          Back
        </Button>

        <Box
          bg="white"
          borderRadius="2xl"
          overflow="hidden"
          boxShadow="sm"
          mb={6}
        >
          <Box position="relative" h={{ base: '180px', md: '240px' }}>
            <Box
              as="img"
              src={group.image}
              alt={group.name}
              w="100%"
              h="100%"
              objectFit="cover"
              transform="scale(1.02)"
            />
            {/* Make overlay non-intercepting so clicks reach buttons */}
            <Box
              position="absolute"
              inset={0}
              bg="linear-gradient(180deg, rgba(0,0,0,0.35) 10%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.45) 100%)"
              pointerEvents="none"
            />
            <Flex
              position="absolute"
              inset={0}
              zIndex={2}
              px={{ base: 6, md: 8 }}
              py={{ base: 5, md: 6 }}
              align="end"
              justify="space-between"
            >
              <Box color="white">
                <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold">
                  {group.name}
                </Text>
                <Flex mt={1} gap={2} align="center" fontSize="sm" opacity={0.95}>
                  <Flex align="center" gap={1.5}>
                    <Users size={16} />
                    <Text>{membersCount.toLocaleString()} members</Text>
                  </Flex>
                  <Text>•</Text>
                  <Text>{group.category}</Text>
                </Flex>
              </Box>

              <Flex align="center" gap={2} zIndex={3}>
                <IconButton
                  aria-label="Report group"
                  variant="ghost"
                  color="white"
                  onClick={handleReport}
                  _hover={{ bg: 'whiteAlpha.300' }}
                >
                  <Flag size={18} />
                </IconButton>

                {busy
                  ? (joined
                    ? (
                      <Button
                        size="sm"
                        px={5}
                        onClick={handleJoinLeave}
                        isDisabled
                        bg="#EC4899"
                        color="white"
                        _hover={{ bg: '#EC4899' }}
                        transition="all 0.2s ease"
                      >
                        Joining…
                      </Button>
                    )
                    : (
                      <Button
                        size="sm"
                        px={5}
                        onClick={handleJoinLeave}
                        isDisabled
                        bg="gray.300"
                        color="gray.700"
                        _hover={{ bg: 'gray.300' }}
                        transition="all 0.2s ease"
                      >
                        Leaving…
                      </Button>
                    )
                  )
                  : (
                    <Button
                      size="sm"
                      px={5}
                      onClick={handleJoinLeave}
                      isDisabled={!canJoin || busy}
                      _hover={{ bg: joined ? 'gray.200' : '#C7327C' }}
                      transition="all 0.2s ease"
                      {...(joined
                        ? {
                          bg: 'gray.100',
                          color: 'gray.700',
                          _hover: { bg: 'gray.200' },
                        }
                        : {
                          bg: '#EC4899',
                          color: 'white',
                          _hover: { bg: '#C7327C' },
                        })}
                    >
                      {canJoin ? (joined ? 'Leave Group' : 'Join Group') : 'Pending'}
                    </Button>
                  )}
              </Flex>
            </Flex>
          </Box>

          <Flex
            px={{ base: 4, md: 6, lg: 8 }}
            py={3}
            borderTop="1px solid"
            borderColor="gray.100"
            align="center"
            justify="space-between"
          >
            <Flex gap={6}>
              {['events', 'members', 'about'].map((t) => (
                <Button
                  key={t}
                  variant="ghost"
                  onClick={() => setActiveTab(t)}
                  color={activeTab === t ? '#EC4899' : 'gray.700'}
                  fontWeight={activeTab === t ? 'semibold' : 'medium'}
                  size="sm"
                  borderBottom={
                    activeTab === t ? '2px solid #EC4899' : '2px solid transparent'
                  }
                  borderRadius="0"
                  _hover={{ bg: 'transparent', color: '#EC4899' }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Button>
              ))}
            </Flex>

            <Flex align="center" gap={2}>
              {group.status && group.status !== 'approved' && (
                <Badge bg="yellow.50" color="yellow.700" borderRadius="full" px={3} py={1} fontSize="xs">
                  Pending approval
                </Badge>
              )}
              <Link
                key={String(group.category)}
                to={`/groups?tags=${encodeURIComponent(group.category)}&type=groups`}
                style={{ textDecoration: "none" }}
              >
                <Badge
                  bg="pink.50"
                  color="#EC4899"
                  borderRadius="full"
                  px={3}
                  py={1}
                  fontSize="xs"
                  cursor="pointer"
                  _hover={{ bg: "pink.100" }}
                >
                  {group.category}
                </Badge>
              </Link>
            </Flex>
          </Flex>
        </Box>

        {activeTab === 'events' && (
          <EventsSection
            groupEvents={events}
            formatLongDate={formatLongDate}
            navigate={navigate}
          />
        )}

        {activeTab === 'members' && (
          <MembersSection membersCount={membersCount} />
        )}

        {activeTab === 'about' && <AboutSection group={group} />}
      </Box>

      {/* Group Report Modal — always mounted, controlled by boolean */}
      <ReportModal
        isOpen={isGroupReportOpen}
        onClose={() => setGroupReportOpen(false)}
        reportType="Group"
        targetId={group._id}
        targetName={group.name}
      />
    </Box>
  );
};

/* ----------------- Sections ----------------- */

const EventsSection = ({ groupEvents, formatLongDate, navigate }) => {
  const [reportingEvent, setReportingEvent] = useState(null);
  const { user } = useUser();

  const truncate = (text = '', maxLen = 80) =>
    text ? (text.length > maxLen ? text.slice(0, maxLen - 3).trim() + '...' : text) : '';

  const handleEventReport = (e, event) => {
    e.stopPropagation();
    if (!user?.id) {
      toast.error('Please sign in to report content');
      return;
    }
    setReportingEvent(event); // this opens the modal
  };

  return (
    <Box>
      <Text fontSize="lg" fontWeight="semibold" mb={4} color="gray.800">
        Upcoming Events
      </Text>

      {groupEvents.length === 0 && (
        <Box bg="white" borderRadius="xl" p={8} boxShadow="sm" color="gray.600" textAlign="center">
          No upcoming events yet. Check back soon!
        </Box>
      )}

      <Flex direction="column" gap={4}>
        {groupEvents.map((e) => (
          <Box
            key={e._id}
            bg="white"
            borderRadius="xl"
            overflow="hidden"
            boxShadow="sm"
            cursor="pointer"
            transition="all 0.25s ease"
            _hover={{ transform: 'translateY(-4px)', boxShadow: '0 12px 28px rgba(0,0,0,0.08)' }}
            onClick={() => {
              navigate(`/events/${e._id}`);
              window.scrollTo(0, 0);
            }}
            role="link"
            tabIndex={0}
            _focusVisible={{ outline: '2px solid #EC4899', outlineOffset: '2px' }}
          >
            <Grid templateColumns={{ base: '1fr', md: '360px 1fr' }} alignItems="stretch">
              <Box position="relative" h={{ base: '100px', md: '250px' }} overflow="hidden">
                <Box
                  as="img"
                  src={e.image}
                  alt={e.title}
                  w="100%"
                  h="100%"
                  objectFit="cover"
                  transition="transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)"
                  _hover={{ transform: 'scale(1.05)' }}
                />
              </Box>

              <Box p={{ base: 4, md: 5 }} display="flex" flexDir="column">
                <Flex justify="space-between" align="start" mb={2}>
                  <Text fontWeight="semibold" color="gray.800" fontSize="lg" noOfLines={1}>
                    {e.title}
                  </Text>
                  <IconButton
                    aria-label="Report event"
                    variant="ghost"
                    size="sm"
                    color="gray.500"
                    onClick={(ev) => handleEventReport(ev, e)}
                    _hover={{ bg: 'gray.100' }}
                  >
                    <Flag size={16} />
                  </IconButton>
                </Flex>

                <Flex direction="column" gap={2} color="gray.600" fontSize="sm" mb={3}>
                  <Flex align="center" gap={2}>
                    <Calendar size={16} color="#EC4899" />
                    <Text>{formatLongDate(e.startAt || e.date)}</Text>
                  </Flex>
                  <Flex align="center" gap={2}>
                    <MapPin size={16} color="#EC4899" />
                    <Text>{e.locationName || e.location}</Text>
                  </Flex>
                </Flex>

                <Text color="gray.700" fontSize="sm" mb={3} lineHeight="1.6" noOfLines={4}>
                  {truncate(e.description, 200)}
                </Text>

                <Flex gap={2} flexWrap="wrap" align="center" mt="auto">
                  <TagIcon size={14} color="#EC4899" />
                  {(e.tags || []).slice(0, 4).map((t, i) => (
                    <Badge
                      key={i}
                      bg="pink.50"
                      color="#EC4899"
                      fontSize="xs"
                      px={2.5}
                      py={1}
                      borderRadius="md"
                      fontWeight="medium"
                    >
                      {t}
                    </Badge>
                  ))}
                </Flex>
              </Box>
            </Grid>
          </Box>
        ))}
      </Flex>

      {/* Event Report Modal — controlled by reportingEvent presence */}
      <ReportModal
        isOpen={!!reportingEvent}
        onClose={() => setReportingEvent(null)}
        reportType="Event"
        targetId={reportingEvent?._id}
        targetName={reportingEvent?.title}
      />
    </Box>
  );
};

const MembersSection = ({ membersCount }) => {
  return (
    <Box bg="white" borderRadius="2xl" p={{ base: 5, md: 7 }} boxShadow="sm">
      <Text fontSize="lg" fontWeight="semibold" mb={2}>
        Members
      </Text>
      <Separator />
      <Flex align="center" gap={2} color="gray.700">
        <Users size={18} />
        <Text>
          This group has{' '}
          <Text as="span" fontWeight="semibold">
            {Number(membersCount || 0).toLocaleString()}
          </Text>{' '}
          members.
        </Text>
      </Flex>
      <Text mt={4} color="gray.600" fontSize="sm">
        New members are welcome! Join the group to take part in upcoming activities and discussions.
      </Text>
    </Box>
  );
};

const AboutSection = ({ group }) => {
  const count = getMembersCount(group);
  return (
    <Box bg="white" borderRadius="2xl" p={{ base: 5, md: 7 }} boxShadow="sm">
      <Text fontSize="lg" fontWeight="semibold" mb={2}>
        About {group.name}
      </Text>
      <Separator />

      <Box mb={6}>
        <Text fontWeight="semibold" mb={2}>
          Description
        </Text>
        <Text color="gray.700" lineHeight="1.8">
          {group.description}
        </Text>
      </Box>

      <Box mb={6}>
        <Text fontWeight="semibold" mb={2}>
          What to Expect
        </Text>
        <Text color="gray.700" lineHeight="1.8">
          We host regular meetups, special events, and discussions tailored to{' '}
          <Text as="span" fontWeight="semibold">
            {String(group.category || '').toLowerCase()}
          </Text>
          . Whether you're brand new or a seasoned enthusiast, you'll find a friendly community and plenty of ways to get involved.
        </Text>
      </Box>

      <Box>
        <Text fontWeight="semibold" mb={2}>
          Group Guidelines
        </Text>
        <Box as="ul" pl={5} color="gray.700" lineHeight="1.9">
          <Box as="li">Be respectful and inclusive to all members.</Box>
          <Box as="li">No spam or self-promotion without approval.</Box>
          <Box as="li">Keep discussions on topic and constructive.</Box>
        </Box>
      </Box>

      <Flex mt={6} gap={2} align="center">
        <Link
          key={`${String(group.category)}`}
          to={`/groups?tags=${encodeURIComponent(group.category)}&type=groups`}
          style={{ textDecoration: "none" }}
        >
          <Badge
            bg="pink.50"
            color="#EC4899"
            borderRadius="full"
            px={3}
            py={1}
            fontSize="xs"
            cursor="pointer"
            _hover={{ bg: "pink.100" }}
          >
            {group.category}
          </Badge>
        </Link>

        <Badge bg="gray.100" color="gray.700" borderRadius="full" px={3} py={1} fontSize="xs">
          {Number(count || 0).toLocaleString()} members
        </Badge>

        {group.status && group.status !== "approved" && (
          <Badge bg="yellow.50" color="yellow.700" borderRadius="full" px={3} py={1} fontSize="xs">
            Pending approval
          </Badge>
        )}
      </Flex>
    </Box>
  );
};

export default GroupDetails;
