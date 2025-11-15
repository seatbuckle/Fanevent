// src/pages/MyDashboard.jsx
import React from "react";
import * as Chakra from "@chakra-ui/react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import CreateGroupModal from "@/components/CreateGroupModal";
import { api } from "@/lib/api";

const {
  Box,
  Container,
  Heading,
  Text,
  HStack,
  VStack,
  Button,
  Badge,
  SimpleGrid,
  Grid,
  Input,
  Textarea,
  Image,
  Flex,
  IconButton,
} = Chakra;

/* ======================= Helpers ======================= */
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const getMonthAbbr = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short" });
};

// Normalize API list shapes: [], {items:[]}, {data:[]}, {rsvps:[]}, etc.
const toList = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  const keys = ["items", "data", "rsvps", "likes", "history", "groups", "results"];
  for (const k of keys) {
    const v = payload?.[k];
    if (Array.isArray(v)) return v;
  }
  // Some APIs nest under {page: {items:[]}}
  if (Array.isArray(payload?.page?.items)) return payload.page.items;
  return [];
};

// Unwrap RSVP/Like rows into an event-ish object
const unwrapEvent = (row) => {
  if (!row) return {};
  // populated doc
  if (row.eventId && typeof row.eventId === "object" && row.eventId._id) return row.eventId;
  if (row.event && row.event._id) return row.event;
  // string id only — synthesize minimal event so UI still works
  if (typeof row.eventId === "string") {
    return {
      _id: row.eventId,
      title: row.title || row.eventTitle || "Event",
      startAt: row.startAt || row.date || row.eventDate || null,
      image: row.image || row.eventImage || "",
      category: row.category || row.group || "",
    };
  }
  // already an event
  if (row._id && (row.title || row.startAt || row.date)) return row;
  return row;
};

const formatMembers = (n) => {
  try {
    return Number(n ?? 0).toLocaleString();
  } catch {
    return String(n ?? 0);
  }
};

/* ======================= Card ======================= */
const Card = ({ children, ...props }) => (
  <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={6} {...props}>
    {children}
  </Box>
);

/* ======================= Calendar (UI only) ======================= */
const Calendar = () => {
  const [currentMonth] = React.useState("May 2023");
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const dates = [
    [30, 1, 2, 3, 4, 5, 6],
    [7, 8, 9, 10, 11, 12, 13],
    [14, 15, 16, 17, 18, 19, 20],
    [21, 22, 23, 24, 25, 26, 27],
    [28, 29, 30, 31, null, null, null],
  ];

  return (
    <Card>
      <HStack justify="space-between" mb={4}>
        <HStack>
          <Box color="pink.500" fontSize="xl">📅</Box>
          <Heading size="md">Your Calendar</Heading>
        </HStack>
        <HStack>
          <IconButton size="sm" variant="ghost" aria-label="Prev month" icon={<span>←</span>} />
          <Text fontWeight="medium">{currentMonth}</Text>
          <IconButton size="sm" variant="ghost" aria-label="Next month" icon={<span>→</span>} />
        </HStack>
      </HStack>

      <Grid templateColumns="repeat(7, 1fr)" gap={2} mb={4}>
        {days.map((day, i) => (
          <Flex key={i} justify="center" align="center" fontSize="sm" fontWeight="medium" color="gray.600">
            {day}
          </Flex>
        ))}
      </Grid>

      <Grid templateColumns="repeat(7, 1fr)" gap={2}>
        {dates.flat().map((date, i) => (
          <Flex
            key={i}
            justify="center"
            align="center"
            h="40px"
            borderRadius="lg"
            bg={date === 6 ? "pink.500" : "transparent"}
            color={date === 6 ? "white" : date === 30 ? "gray.400" : "gray.800"}
            fontWeight={date === 6 ? "bold" : "normal"}
            cursor="pointer"
            _hover={{ bg: date === 6 ? "pink.600" : "gray.50" }}
          >
            {date}
          </Flex>
        ))}
      </Grid>
    </Card>
  );
};

/* ======================= Apply Organizer Modal (with Autosuggest) ======================= */
function ApplyOrganizerModal({ isOpen, onClose, onSubmitted }) {
  const { getToken } = useAuth();

  const [form, setForm] = React.useState({
    fullName: "",
    email: "",
    group: "",
    experience: "",
    reason: "",
    links: "",
  });
  const [loading, setLoading] = React.useState(false);

  // Autosuggest
  const [suggestions, setSuggestions] = React.useState([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(0);
  const listRef = React.useRef(null);
  const debounceRef = React.useRef(null);
  const abortRef = React.useRef(null);

  const change = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  // Authenticated fetch helper
  const fetchJSON = React.useCallback(
    async (url, init = {}) => {
      const token = await getToken().catch(() => null);
      const res = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init.headers || {}),
        },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.message || `Request failed (${res.status})`;
        throw new Error(msg);
      }
      return data;
    },
    [getToken]
  );

  const updateGroupSuggestions = React.useCallback(
    (val) => {
      const q = (val || "").trim();
      if (!q) {
        setSuggestions([]);
        setShowSuggestions(false);
        setHighlighted(0);
        if (abortRef.current) abortRef.current.abort();
        return;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          if (abortRef.current) abortRef.current.abort();
          abortRef.current = new AbortController();

          // Primary: server supports ?query=
          let items = [];
          try {
            const data = await fetchJSON(`/api/groups?query=${encodeURIComponent(q)}&limit=8`, {
              signal: abortRef.current.signal,
            });
            items = toList(data);
          } catch {
            // Fallback: fetch all and client-filter
            const allData = await fetchJSON(`/api/groups`, { signal: abortRef.current.signal });
            const all = toList(allData);
            const lc = q.toLowerCase();
            items = all.filter((g) => (g?.name || "").toLowerCase().includes(lc)).slice(0, 8);
          }

          setSuggestions(items);
          setShowSuggestions(items.length > 0);
          setHighlighted(0);
        } catch {
          // ignore for UX
        }
      }, 200);
    },
    [fetchJSON]
  );

  const onGroupChange = (e) => {
    change(e);
    updateGroupSuggestions(e.target.value);
  };

  const selectGroup = (groupObj) => {
    const name = typeof groupObj === "string" ? groupObj : groupObj?.name;
    setForm((s) => ({ ...s, group: name || "" }));
    setShowSuggestions(false);
  };

  const onGroupKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectGroup(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const submit = async () => {
    setLoading(true);
    try {
      await fetchJSON("/api/organizer-applications", {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast.success("Application submitted");
      onSubmitted("pending");
      onClose();
    } catch (e) {
      toast.error(e?.message || "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      setShowSuggestions(false);
      setSuggestions([]);
      setHighlighted(0);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <Box position="fixed" top="0" left="0" right="0" bottom="0" bg="blackAlpha.600" zIndex="1400" onClick={onClose} />
      <Flex position="fixed" top="0" left="0" right="0" bottom="0" align="center" justify="center" zIndex="1401" p={4} onClick={onClose}>
        <Box bg="white" borderRadius="xl" maxW="600px" w="full" maxH="90vh" overflowY="auto" onClick={(e) => e.stopPropagation()}>
          <Flex justify="space-between" align="center" p={6} borderBottomWidth="1px">
            <Heading size="lg">Apply to be an Organizer</Heading>
            <IconButton size="sm" variant="ghost" onClick={onClose} aria-label="Close" icon={<span>✕</span>} />
          </Flex>

          <Box p={6}>
            <Text fontSize="sm" color="gray.600" mb={6}>
              Please fill out this form to apply for organizer privileges. Our admin team will review your application.
            </Text>

            <VStack spacing={4} align="stretch">
              {[
                { name: "fullName", label: "Full Name", required: true },
                { name: "email", label: "Email Address", required: true, type: "email" },
              ].map((field) => (
                <Box key={field.name}>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    {field.label} {field.required && <Text as="span" color="red.500">*</Text>}
                  </Text>
                  <Input type={field.type || "text"} name={field.name} onChange={change} placeholder={field.label} />
                </Box>
              ))}

              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Group of Desired Organizer Role <Text as="span" color="red.500">*</Text>
                </Text>

                <Box position="relative">
                  <Input
                    name="group"
                    value={form.group}
                    onChange={onGroupChange}
                    onKeyDown={onGroupKeyDown}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                    placeholder="Search and select a group"
                    aria-autocomplete="list"
                    aria-expanded={showSuggestions}
                    aria-controls="group-suggest-list"
                  />

                  {showSuggestions && suggestions.length > 0 && (
                    <Box
                      id="group-suggest-list"
                      ref={listRef}
                      position="absolute"
                      top="100%"
                      left="0"
                      right="0"
                      mt={1}
                      bg="white"
                      borderWidth="1px"
                      borderColor="gray.200"
                      borderRadius="md"
                      shadow="md"
                      zIndex={20}
                      maxH="240px"
                      overflowY="auto"
                    >
                      {suggestions.map((g, idx) => {
                        const isActive = idx === highlighted;
                        return (
                          <Flex
                            key={g._id || g.id || g.name}
                            align="center"
                            justify="space-between"
                            px={3}
                            py={2}
                            cursor="pointer"
                            bg={isActive ? "pink.50" : "white"}
                            _hover={{ bg: "pink.50" }}
                            onMouseEnter={() => setHighlighted(idx)}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectGroup(g)}
                          >
                            <Box>
                              <Text fontWeight="medium">{g.name}</Text>
                              <Text fontSize="xs" color="gray.600">
                                {(g.category || "General")} • {formatMembers(g.members?.length ?? g.members ?? 0)} members
                              </Text>
                            </Box>
                            <Badge colorScheme="gray" variant="subtle">Select</Badge>
                          </Flex>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Event Organization Experience <Text as="span" color="red.500">*</Text>
                </Text>
                <Textarea name="experience" onChange={change} placeholder="Describe your experience organizing events or managing communities." rows={4} />
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Why do you want to be an organizer? <Text as="span" color="red.500">*</Text>
                </Text>
                <Textarea name="reason" onChange={change} placeholder="Tell us why you want to organize events on our platform, and/or what kind of events you plan on hosting." rows={4} />
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Relevant Links (Optional)
                </Text>
                <Input name="links" onChange={change} placeholder="Social media profiles, websites, portfolios, etc." />
              </Box>
            </VStack>
          </Box>

          <Flex justify="flex-end" gap={3} p={6} borderTopWidth="1px">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button colorScheme="pink" isLoading={loading} loadingText="Submitting..." onClick={submit}>Submit Application</Button>
          </Flex>
        </Box>
      </Flex>
    </>
  );
}

/* ======================= Main Dashboard ======================= */
export default function MyDashboard() {
  const { user, isLoaded } = useUser();
  const { getToken, isLoaded: authLoaded } = useAuth();
  const role = user?.publicMetadata?.role || "user";
  const navigate = useNavigate();

  const [orgModalOpen, setOrgModalOpen] = React.useState(false);
  const [createGroupOpen, setCreateGroupOpen] = React.useState(false);

  const [status, setStatus] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState("calendar");
  const [rsvps, setRsvps] = React.useState([]);
  const [likes, setLikes] = React.useState([]);
  const [history, setHistory] = React.useState([]);
  const [groups, setGroups] = React.useState([]);

  const [cancelingIds, setCancelingIds] = React.useState(new Set());
  const [unlikingIds, setUnlikingIds] = React.useState(new Set());

  // Authenticated fetch helper for this component
  const fetchJSON = React.useCallback(
    async (url, init = {}) => {
      const token = await getToken().catch(() => null);
      const res = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init.headers || {}),
        },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.message || `Request failed (${res.status})`;
        throw new Error(msg);
      }
      return data;
    },
    [getToken]
  );

  // load dashboard data (with multiple fallbacks + shape normalization)
  // load dashboard data
React.useEffect(() => {
  let mounted = true;

  const toList = (data) =>
    Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];

  const run = async () => {
    if (!authLoaded) return;

    try {
      // Always try the “/api/me/...“ endpoints first
      const [
        app,
        myRsvpsPrim,
        myLikesPrim,
        myHistoryPrim,
        myGroupsPrim,
      ] = await Promise.all([
        api("/api/organizer-applications/me").catch(() => null),
        api("/api/me/rsvps").catch(() => null),
        api("/api/me/likes").catch(() => null),
        api("/api/me/history").catch(() => null),
        api("/api/groups/me/mine").catch(() => null), // if you expose this
      ]);

      // If primaries are missing, try alternates
      const myRsvps =
        myRsvpsPrim ?? (await api("/api/rsvps/me").catch(() => []));
      const myLikes =
        myLikesPrim ?? (await api("/api/likes/me").catch(() => []));
      const myHistory =
        myHistoryPrim ?? (await api("/api/history/me").catch(() => []));
      const myGroups =
        myGroupsPrim ??
        (await api("/api/me/groups").catch(() => [])) ??
        [];

      if (!mounted) return;

      setStatus(app?.status || null);
      setRsvps(toList(myRsvps).filter(Boolean));
      setLikes(toList(myLikes).filter(Boolean));
      setHistory(toList(myHistory).filter(Boolean));
      setGroups(toList(myGroups).filter(Boolean));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load dashboard");
    }
  };

  run();
  return () => {
    mounted = false;
  };
}, [authLoaded]);


  // auto-refresh Clerk session if role was upgraded
  React.useEffect(() => {
    if (status === "approved" && user?.publicMetadata?.role !== "organizer") {
      window.Clerk?.session?.reload?.();
    }
  }, [status, user]);

  // actions
  async function cancelRsvp(eventId) {
    if (!eventId) return;
    setCancelingIds((prev) => new Set(prev).add(eventId));
    try {
      await fetchJSON(`/api/events/${eventId}/rsvp`, { method: "DELETE" });
      setRsvps((rows) => rows.filter((x) => (unwrapEvent(x)?._id) !== eventId));
      toast.success("RSVP canceled");
    } catch (e) {
      toast.error(e?.message || "Failed to cancel RSVP");
    } finally {
      setCancelingIds((prev) => {
        const n = new Set(prev);
        n.delete(eventId);
        return n;
      });
    }
  }

  async function removeLike(eventId) {
    if (!eventId) return;
    setUnlikingIds((prev) => new Set(prev).add(eventId));
    try {
      await fetchJSON(`/api/events/${eventId}/like`, { method: "DELETE" });
      setLikes((rows) => rows.filter((x) => (unwrapEvent(x)?._id) !== eventId));
      toast.success("Removed from Likes");
    } catch (e) {
      toast.error(e?.message || "Failed to remove Like");
    } finally {
      setUnlikingIds((prev) => {
        const n = new Set(prev);
        n.delete(eventId);
        return n;
      });
    }
  }

  if (!isLoaded) return null;

  return (
    <Container maxW="1200px" py={8} pt={24}>
      {/* Header */}
      <Flex justify="space-between" align="start" mb={8} flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="xl" mb={2}>Your Dashboard</Heading>
          <Text color="gray.600">Manage your events, groups, and RSVPs</Text>
        </Box>

        {role === "user" && !status && (
          <Button variant="outline" colorScheme="pink" onClick={() => setOrgModalOpen(true)} size="lg" borderWidth="2px">
            ✓ Apply to be an Event Organizer
          </Button>
        )}
        {role === "user" && status && (
          <Badge colorScheme={status === "pending" ? "yellow" : status === "approved" ? "green" : "red"} fontSize="md" px={4} py={2} borderRadius="full">
            Application: {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )}
      </Flex>

      {/* Tabs */}
      <HStack spacing={6} mb={6} borderBottomWidth="2px" borderColor="gray.200" overflowX="auto">
        {["Calendar", "My RSVPs", "History", "My Groups"].map((tab) => {
          const tabValue = tab.toLowerCase().replace(" ", "-");
          const isActive = activeTab === tabValue;
          return (
            <Button
              key={tab}
              variant="unstyled"
              onClick={() => setActiveTab(tabValue)}
              pb={3}
              borderBottomWidth="2px"
              borderBottomColor={isActive ? "pink.500" : "transparent"}
              color={isActive ? "pink.500" : "gray.600"}
              fontWeight={isActive ? "semibold" : "normal"}
              borderRadius="0"
              _hover={{ color: "pink.500" }}
              flexShrink={0}
            >
              {tab}
            </Button>
          );
        })}
      </HStack>

      {/* Tab Content */}
      {activeTab === "calendar" && (
        <VStack spacing={6} align="stretch">
          <Calendar />
          <Card>
            <Heading size="md" mb={4}>Upcoming Events</Heading>
            <VStack spacing={4} align="stretch">
              {rsvps.map((row) => {
                const ev = unwrapEvent(row);
                return (
                  <Flex key={ev._id || Math.random()} align="center" gap={4} p={4} borderWidth="1px" borderRadius="lg" flexWrap="wrap">
                    <Box bg="pink.50" px={3} py={2} borderRadius="lg" textAlign="center" minW="50px">
                      <Text fontSize="xs" color="pink.500" fontWeight="bold">
                        {getMonthAbbr(ev.startAt || ev.date)}
                      </Text>
                    </Box>
                    <Box flex="1" minW="200px">
                      <Text fontWeight="semibold">{ev.title || "Event"}</Text>
                      <Text fontSize="sm" color="gray.600">{formatDate(ev.startAt || ev.date)}</Text>
                    </Box>
                    {ev._id && (
                      <Button variant="outline" colorScheme="pink" size="sm" onClick={() => navigate(`/events/${ev._id}`)}>
                        Details
                      </Button>
                    )}
                  </Flex>
                );
              })}
              {!rsvps.length && <Text color="gray.500" fontSize="sm">No upcoming RSVPs yet.</Text>}
            </VStack>
          </Card>
        </VStack>
      )}

      {activeTab === "my-rsvps" && (
        <Card>
          <HStack mb={6}>
            <Text fontSize="xl">✓</Text>
            <Heading size="md">My RSVPs</Heading>
          </HStack>
          <VStack spacing={4} align="stretch">
            {rsvps.map((row) => {
              const ev = unwrapEvent(row);
              const isCanceling = ev?._id ? cancelingIds.has(ev._id) : false;
              return (
                <Box key={ev._id || Math.random()}>
                  <Flex align="center" gap={4} py={4} flexWrap="wrap">
                    <Image src={ev.image || "/placeholder.png"} w="80px" h="80px" borderRadius="lg" objectFit="cover" flexShrink={0} />
                    <Box flex="1" minW="200px">
                      <Text fontWeight="semibold" fontSize="lg">{ev.title || "Event"}</Text>
                      <Text fontSize="sm" color="gray.600">{formatDate(ev.startAt || ev.date)}</Text>
                      <Text fontSize="sm" color="gray.500">{ev.category || ev.group}</Text>
                    </Box>
                    <HStack flexShrink={0}>
                      {ev._id && (
                        <Button variant="outline" size="sm" isLoading={isCanceling} onClick={() => cancelRsvp(ev._id)}>
                          Cancel
                        </Button>
                      )}
                      {ev._id && (
                        <Button variant="outline" colorScheme="pink" size="sm" onClick={() => navigate(`/events/${ev._id}`)}>
                          Details
                        </Button>
                      )}
                    </HStack>
                  </Flex>
                  <Box borderTopWidth="1px" borderColor="gray.200" />
                </Box>
              );
            })}
            {!rsvps.length && <Text color="gray.500" fontSize="sm">You haven’t RSVPed to any events yet.</Text>}
          </VStack>

          <Box mt={8}>
            <HStack mb={4}>
              <Text fontSize="xl">❤️</Text>
              <Heading size="md">My Likes</Heading>
            </HStack>
            {likes.map((row) => {
              const ev = unwrapEvent(row);
              const isUnliking = ev?._id ? unlikingIds.has(ev._id) : false;
              return (
                <Flex key={ev._id || Math.random()} align="center" gap={4} py={4} flexWrap="wrap">
                  <Image src={ev.image || "/placeholder.png"} w="80px" h="80px" borderRadius="lg" objectFit="cover" flexShrink={0} />
                  <Box flex="1" minW="200px">
                    <Text fontWeight="semibold" fontSize="lg">{ev.title || "Event"}</Text>
                    <Text fontSize="sm" color="gray.600">{formatDate(ev.startAt || ev.date)}</Text>
                    <Text fontSize="sm" color="gray.500">{ev.category || ev.group}</Text>
                  </Box>
                  <HStack flexShrink={0}>
                    {ev._id && (
                      <Button variant="outline" size="sm" isLoading={isUnliking} onClick={() => removeLike(ev._id)}>
                        Remove
                      </Button>
                    )}
                    {ev._id && (
                      <Button variant="outline" colorScheme="pink" size="sm" onClick={() => navigate(`/events/${ev._id}`)}>
                        Details
                      </Button>
                    )}
                  </HStack>
                </Flex>
              );
            })}
            {!likes.length && <Text color="gray.500" fontSize="sm">You haven’t liked any events yet.</Text>}
          </Box>
        </Card>
      )}

      {activeTab === "history" && (
        <Card>
          <HStack mb={6}>
            <Text fontSize="xl">🕐</Text>
            <Heading size="md">Participation History</Heading>
          </HStack>
        <VStack spacing={6} align="stretch">
          {history.map((row) => {
            const ev = unwrapEvent(row);
            const hours = typeof row.attendedHours === "number" ? row.attendedHours : Number(row.attendedHours || 0);
            return (
              <Flex key={`${ev._id || "ev"}-${row._id || row.checkOutAt || Math.random()}`} align="center" gap={4} flexWrap="wrap">
                <Image src={ev.image || "/placeholder.png"} w="80px" h="80px" borderRadius="lg" objectFit="cover" flexShrink={0} />
                <Box flex="1" minW="200px">
                  <Text fontWeight="semibold" fontSize="lg">{ev.title || "Event"}</Text>
                  <Text fontSize="sm" color="gray.600">{formatDate(row.checkOutAt || ev.startAt || ev.date)}</Text>
                  <Text fontSize="sm" color="gray.500">{ev.category || ev.group}</Text>
                </Box>
                <VStack align="end" spacing={2} flexShrink={0}>
                  <Text fontSize="sm" color="gray.600">{hours.toFixed ? hours.toFixed(1) : hours} hours</Text>
                  <Badge colorScheme="green" fontSize="sm">Attended</Badge>
                </VStack>
              </Flex>
            );
          })}
          {!history.length && <Text color="gray.500" fontSize="sm">No attendance yet.</Text>}
        </VStack>
        </Card>
      )}

      {activeTab === "my-groups" && (
        <Card>
          <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
            <HStack>
              <Text fontSize="xl">👥</Text>
              <Heading size="md">My Groups</Heading>
            </HStack>

            <HStack>
              {role === "organizer" && (
                <Button variant="outline" onClick={() => setCreateGroupOpen(true)}>
                  + Create Group
                </Button>
              )}
              <Button colorScheme="pink" onClick={() => navigate("/groups")}>
                Explore More Groups
              </Button>
            </HStack>
          </Flex>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {groups.map((group) => (
              <Box key={group._id || group.name} p={5} borderWidth="1px" borderRadius="xl">
                <HStack mb={4}>
                  <Image src={group.image || "/placeholder.png"} w="60px" h="60px" borderRadius="full" objectFit="cover" />
                  <Box>
                    <Text fontWeight="semibold" fontSize="lg">{group.name}</Text>
                    <Text fontSize="sm" color="gray.600">
                      {formatMembers(group.members?.length ?? group.members ?? group.membersCount ?? 0)} members
                    </Text>
                  </Box>
                </HStack>
                <Badge colorScheme="gray" variant="subtle" mb={4}>{group.category || "General"}</Badge>
                <Button variant="link" colorScheme="pink" size="sm" onClick={() => navigate(`/groups/${group._id}`)}>
                  View
                </Button>
              </Box>
            ))}
            {!groups.length && <Text color="gray.500" fontSize="sm">You’re not in any groups yet.</Text>}
          </SimpleGrid>
        </Card>
      )}

      {/* Modals */}
      <ApplyOrganizerModal
        isOpen={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        onSubmitted={(s) => setStatus(s?.toLowerCase?.() || s)}
      />

      <CreateGroupModal
        isOpen={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onCreated={(g) => {
          const newGroup = {
            _id: g?._id,
            name: g?.name,
            description: g?.description || "",
            image: g?.image || "",
            category: g?.category || "General",
            members:
              typeof g?.membersCount === "number"
                ? g.membersCount
                : (g?.members?.length || 0),
            status: g?.status || "pending",
          };
          setGroups((arr) => [newGroup, ...arr]);
          toast.success("Group created (pending approval)");
        }}
      />
    </Container>
  );
}
