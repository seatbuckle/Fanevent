// src/pages/EventDetails.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import {
  Box,
  Flex,
  Text,
  Button,
  Badge,
  IconButton,
  Grid,
  Image as ChakraImage,
} from "@chakra-ui/react";
import {
  Calendar,
  MapPin,
  Users,
  Heart,
  Share2,
  MessageSquare,
  X,
  CalendarCheck,
  LogIn,
  LogOut,
  Clock,
  Flag,
  PlayCircle,
} from "lucide-react";
import ReactPlayer from "react-player";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import ReportModal from "@/components/ui/ReportModal";
import EventReminderControls from "@/components/EventReminderControls";

const isMongoId = (s = "") => /^[a-fA-F0-9]{24}$/.test(s);

// ---------- helpers ----------
const normalizeEvent = (raw = {}) => {
  const startAt = raw.startAt || raw.date || raw.startsAt || raw.startDate;
  const media = Array.isArray(raw.media) ? raw.media : [];
  const firstImage = media.find((m) => m?.type === "image")?.url || "";

  return {
    _id: raw._id || "",
    title: raw.title || "Untitled Event",
    description: raw.description || "",
    image: raw.image || firstImage || "",
    media,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    category: raw.category || raw.group || "",
    // location
    locationName: raw.locationName || "",
    address: raw.address || "",
    city: raw.city || "",
    state: raw.state || "",
    zipCode: raw.zipCode || "",
    // time
    startAt,
    endAt: raw.endAt || null,
    // group
    groupId: raw.groupId || null,
    groupName: raw.groupName || raw.group || "",
    // counts/status
    attendeesCount:
      typeof raw.attendeesCount === "number"
        ? raw.attendeesCount
        : typeof raw.rsvpCount === "number"
          ? raw.rsvpCount
          : 0,
    status: raw.status || "approved",
    createdBy: raw.createdBy,
  };
};

const isYouTube = (url = "") =>
  /(?:^https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(url);

const getYouTubeId = (url = "") => {
  if (!url) return null;
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{6,})/i,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
};

const getVideoThumb = (url = "") => {
  if (!isYouTube(url)) return null;
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};

const GOOGLE_MAPS_API_KEY = "AIzaSyCwj0qLG6HYkmltOOKFz3xl6v4wpT6k-5M";

// --- shared date helpers for RSVP calendar ---
const toDateKey = (input) => {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d)) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// pull an event out of an RSVP row (works with several shapes)
const unwrapEvent = (row = {}) => {
  // your data uses `eventId` to store the actual event
  return row.event || row.ev || row.eventId || row;
};



// ---- calendar helpers (mark the event day in current month) ----
const getCurrentMonthInfo = () => {
  const now = new Date();
  return {
    monthLabel: now.toLocaleString("en-US", { month: "long" }),
    year: now.getFullYear(),
    firstDay: new Date(now.getFullYear(), now.getMonth(), 1).getDay(),
    daysInMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    currentDay: now.getDate(),
    monthIndex: now.getMonth(),
  };
};
function RSVPCalendarMini({ rsvps, loading }) {
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const days = ["S", "M", "T", "W", "T", "F", "S"];

  const monthLabel = React.useMemo(
    () =>
      currentMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [currentMonth]
  );

  const today = React.useMemo(() => new Date(), []);
  const todayKey = React.useMemo(() => toDateKey(today), [today]);

  const parsedEvents = React.useMemo(() => {
    if (!Array.isArray(rsvps)) return [];

    const parsed = rsvps
      .map((row) => {
        // Try to unwrap a nested event, but keep the row handy too
        const ev = unwrapEvent(row);

        // Try a bunch of common field names on BOTH row and ev
        const when =
          row.startAt ||
          row.date ||
          row.startsAt ||
          row.startDate ||
          row.eventDate ||
          row.when ||
          ev?.startAt ||
          ev?.date ||
          ev?.startsAt ||
          ev?.startDate ||
          ev?.eventDate ||
          ev?.when;

        if (!when) return null;

        const d = new Date(when);
        if (Number.isNaN(d.getTime())) return null;

        return {
          row,
          ev,
          date: d,
          key: toDateKey(d),
        };
      })
      .filter((x) => x && x.key);

    // DEBUG: see what the calendar thinks your events are
    console.log("Mini calendar parsedEvents:", parsed);

    return parsed;
  }, [rsvps]);


  // map YYYY-MM-DD -> count
  const eventsByDay = React.useMemo(() => {
    const map = {};
    parsedEvents.forEach((e) => {
      if (!e.key) return;
      map[e.key] = (map[e.key] || 0) + 1;
    });
    return map;
  }, [parsedEvents]);

  // build the grid for the current month
  const { weeks } = React.useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const firstDay = firstOfMonth.getDay(); // 0-6
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      const date = new Date(year, month, i - firstDay + 1);
      cells.push(date);
    }

    const result = [];
    for (let i = 0; i < cells.length; i += 7) {
      result.push(cells.slice(i, i + 7));
    }
    return { weeks: result };
  }, [currentMonth]);

  const goMonth = (delta) => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );
  };

  return (
    <>
      <Flex justify="space-between" align="center" mb={3}>
        <Box>
          <Text fontSize="sm" fontWeight="semibold" color="gray.700">
            Your Calendar
          </Text>
          <Text fontSize="xs" color="gray.500">
            Pink dots show days you&apos;ve RSVP&apos;d
          </Text>
        </Box>
        <Flex align="center" gap={1}>
          <IconButton
            aria-label="Previous month"
            size="xs"
            variant="ghost"
            onClick={() => goMonth(-1)}
          >
            ←
          </IconButton>
          <Text fontSize="xs" fontWeight="medium" color="gray.700" mx={1}>
            {monthLabel}
          </Text>
          <IconButton
            aria-label="Next month"
            size="xs"
            variant="ghost"
            onClick={() => goMonth(1)}
          >
            →
          </IconButton>
        </Flex>
      </Flex>

      {loading ? (
        <Text fontSize="xs" color="gray.500">
          Loading your RSVPs…
        </Text>
      ) : (
        <>
          {/* day labels */}
          <Grid templateColumns="repeat(7, 1fr)" gap={1} mb={1}>
            {days.map((d, idx) => (
              <Text
                key={`${d}-${idx}`}   // or just key={idx}
                fontSize="xs"
                textAlign="center"
                fontWeight="semibold"
                color="gray.500"
              >
                {d}
              </Text>
            ))}
          </Grid>

          {/* dates – keep height similar to the old calendar */}
          <Box maxH="210px" overflow="hidden">
            {weeks.map((week, wi) => (
              <Grid key={wi} templateColumns="repeat(7, 1fr)" gap={1}>
                {week.map((date) => {
                  const key = toDateKey(date);
                  const isCurrentMonth =
                    date.getMonth() === currentMonth.getMonth();
                  const hasEvents = !!eventsByDay[key];
                  const isToday = key === todayKey;

                  const baseColor = isCurrentMonth ? "gray.800" : "gray.400";

                  return (
                    <Box
                      key={key || date.getTime()}
                      textAlign="center"
                      borderRadius="md"
                      py={1}
                      px={0.5}
                      bg={isToday ? "pink.50" : "transparent"}
                      borderWidth={isToday ? "1px" : "0px"}
                      borderColor={isToday ? "pink.400" : "transparent"}
                    >
                      <Text
                        fontSize="xs"
                        fontWeight={isToday ? "bold" : "medium"}
                        color={baseColor}
                      >
                        {date.getDate()}
                      </Text>
                      {hasEvents && (
                        <Flex justify="center" mt={0.5} align="center" gap={0.5}>
                          <Box
                            w="6px"
                            h="6px"
                            borderRadius="full"
                            bg="pink.400"
                          />
                          {eventsByDay[key] > 1 && (
                            <Text fontSize="0.6rem" color="gray.500">
                              {eventsByDay[key]}
                            </Text>
                          )}
                        </Flex>
                      )}
                    </Box>
                  );
                })}
              </Grid>
            ))}
          </Box>

          {!parsedEvents.length && (
            <Text fontSize="xs" color="gray.500" mt={2}>
              No upcoming RSVPs yet.
            </Text>
          )}
        </>
      )}
    </>
  );
}

function RecommendedEventsSection({ currentEventId, currentTags = [] }) {
  const navigate = useNavigate();
  const [recommended, setRecommended] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!currentEventId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api(`/api/events/${currentEventId}/recommended`);
        console.log("recommended response", res); // 👀 debug

        let items = Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res)
          ? res
          : [];

        // don’t recommend the event you’re already on
        items = items.filter((ev) => String(ev._id) !== String(currentEventId));

        if (!cancelled) setRecommended(items.slice(0, 3)); // up to 3
      } catch (e) {
        console.error("recommended error", e);
        if (!cancelled) {
          setError("Failed to load recommended events");
          setRecommended([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [currentEventId]);

  if (!currentEventId) return null;

  const getLocationLabel = (ev) => {
    const parts = [ev.city, ev.state, ev.country, ev.locationName].filter(Boolean);
    return parts[0] || "Online";
  };

  const hasItems = recommended && recommended.length > 0;

  return (
    <Box
      mt={10}
      bg="white"
      borderRadius="2xl"
      p={{ base: 4, md: 6 }}
      boxShadow="sm"
    >
      <Flex justify="space-between" align="center" mb={4} gap={3}>
        <Flex align="center" gap={2}>
          <Text fontSize="sm" color="pink.500">
            📈
          </Text>
          <Text fontWeight="semibold" fontSize="sm">
            Events like this…
          </Text>
        </Flex>
        <Button
          variant="link"
          color="#EC4899"
          fontSize="sm"
          onClick={() =>
            navigate(`/events?similarTo=${encodeURIComponent(currentEventId)}`)
          }
        >
          View All
        </Button>
      </Flex>

      {loading && (
        <Text fontSize="sm" color="gray.500">
          Finding similar events…
        </Text>
      )}

      {!loading && error && (
        <Text fontSize="sm" color="red.500">
          {error}
        </Text>
      )}

      {!loading && !error && !hasItems && (
        <Text fontSize="sm" color="gray.500">
          No similar events yet.
        </Text>
      )}

      {!loading && !error && hasItems && (
        <>
          {/* header row */}
          <Grid
            templateColumns={{ base: "1.4fr 1fr", md: "2fr 1.2fr 1.6fr" }}
            gap={4}
            mb={2}
          >
            <Text fontSize="xs" fontWeight="medium" color="gray.500">
              Name
            </Text>
            <Text
              fontSize="xs"
              fontWeight="medium"
              color="gray.500"
              display={{ base: "none", md: "block" }}
            >
              Location
            </Text>
            <Text
              fontSize="xs"
              fontWeight="medium"
              color="gray.500"
              display={{ base: "none", md: "block" }}
            >
              Tags
            </Text>
          </Grid>

          {/* rows */}
          {recommended.map((ev) => (
            <Grid
              key={ev._id}
              templateColumns={{ base: "1.4fr 1fr", md: "2fr 1.2fr 1.6fr" }}
              gap={4}
              py={2}
              borderTopWidth="1px"
              borderColor="gray.100"
              alignItems="center"
            >
              {/* name */}
              <Box>
                <Button
                  variant="link"
                  color="gray.800"
                  fontWeight="medium"
                  fontSize="sm"
                  onClick={() => navigate(`/events/${ev._id}`)}
                >
                  {ev.title || "Untitled event"}
                </Button>
              </Box>

              {/* location */}
              <Box display={{ base: "none", md: "block" }}>
                <Box
                  as="span"
                  px={3}
                  py={1}
                  borderRadius="full"
                  bg="gray.100"
                  fontSize="xs"
                  color="gray.700"
                >
                  {getLocationLabel(ev)}
                </Box>
              </Box>

              {/* tags */}
              <Flex
                display={{ base: "none", md: "flex" }}
                gap={2}
                flexWrap="wrap"
              >
                {(ev.tags || currentTags || [])
                  .slice(0, 3)
                  .map((tag, idx) => (
                    <Badge
                      key={idx}
                      px={3}
                      py={1}
                      borderRadius="full"
                      fontSize="xs"
                      fontWeight="medium"
                      bg={idx === 0 ? "pink.50" : "green.50"}
                      color={idx === 0 ? "#EC4899" : "#16A34A"}
                    >
                      {tag}
                    </Badge>
                  ))}
              </Flex>
            </Grid>
          ))}
        </>
      )}
    </Box>
  );
}




export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [event, setEvent] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [isLiked, setIsLiked] = useState(false);
  const [hasRSVP, setHasRSVP] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [hoursLogged, setHoursLogged] = useState(null);

  const [group, setGroup] = useState(null);
  const [groupLoadError, setGroupLoadError] = useState(null);


  // chooser + modal payload (modal is controlled by payload presence)
  const [isChooserOpen, setIsChooserOpen] = useState(false);
  const [reportPayload, setReportPayload] = useState(null); // { type, id, name }

  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  // server-backed counts
  const [likeCount, setLikeCount] = useState(0);
  const [rsvpCount, setRsvpCount] = useState(0);

  // action loading flags (prevents double clicks)
  const [likeLoading, setLikeLoading] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);

  const [myRsvps, setMyRsvps] = useState([]);
  const [loadingRsvpCalendar, setLoadingRsvpCalendar] = useState(false);


  // --------- load from API only (no dummy fallbacks) ----------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (id == null) return;
      if (!isMongoId(id)) {
        setLoadError("Invalid event id");
        setEvent(null);
        return;
      }

      try {
        const fromServer = await api(`/api/events/${id}`).catch(() => null);
        if (!fromServer) {
          setLoadError("Event not found");
          setEvent(null);
          return;
        }
        if (cancelled) return;

        const norm = normalizeEvent(fromServer);
        setEvent(norm);
        setLoadError(null);

        // counts for everyone
        try {
          const [{ count: lc }, { count: rc }] = await Promise.all([
            api(`/api/events/${id}/likes/count`),
            api(`/api/events/${id}/rsvp/count`),
          ]);
          if (!cancelled) {
            setLikeCount(lc || 0);
            setRsvpCount(rc || 0);
          }
        } catch {
          /* ignore */
        }

        // my status if signed in
        if (user?.id && !cancelled) {
          try {
            const [{ liked }, me] = await Promise.all([
              api(`/api/events/${id}/like/me`),
              api(`/api/events/${id}/rsvp/me`),
            ]);
            if (!cancelled) {
              setIsLiked(!!liked);
              setHasRSVP(!!me?.rsvped);
              if (me?.checkInAt) {
                setIsCheckedIn(true);
                setCheckInTime(new Date(me.checkInAt));
              }
              if (me?.checkOutAt) {
                setIsCheckedOut(true);
                if (typeof me.attendedHours === "number") {
                  setHoursLogged(me.attendedHours.toFixed(1));
                }
              }
            }
          } catch {
            /* ignore */
          }
        }
      } catch {
        setLoadError("Failed to load event");
        setEvent(null);
      }
    };


    // reset on id change
    setEvent(null);
    setLoadError(null);
    setIsLiked(false);
    setHasRSVP(false);
    setIsCheckedIn(false);
    setIsCheckedOut(false);
    setCheckInTime(null);
    setHoursLogged(null);
    setLikeCount(0);
    setRsvpCount(0);

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

    // Load group info for Hosted By section
  useEffect(() => {
    let cancelled = false;

    const loadGroup = async () => {
      if (!event?.groupId) {
        setGroup(null);
        setGroupLoadError(null);
        return;
      }

      try {
        // adjust endpoint if your backend uses a different path
        const g = await api(`/api/groups/${event.groupId}`).catch(() => null);
        if (cancelled) return;

        if (!g) {
          setGroup(null);
          setGroupLoadError("Group not found");
        } else {
          setGroup(g);
          setGroupLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setGroup(null);
          setGroupLoadError("Failed to load group");
        }
      }
    };

    loadGroup();
    return () => {
      cancelled = true;
    };
  }, [event?.groupId]);



  useEffect(() => {
    if (!user?.id) {
      setMyRsvps([]);
      return;
    }

    let cancelled = false;

    const loadRsvps = async () => {
      setLoadingRsvpCalendar(true);
      try {
        const res = await api("/api/me/rsvps");

        let list = [];
        if (Array.isArray(res)) list = res;
        else if (Array.isArray(res?.items)) list = res.items;
        else if (Array.isArray(res?.rsvps)) list = res.rsvps;
        else if (Array.isArray(res?.data)) list = res.data;
        else if (Array.isArray(res?.rows)) list = res.rows;

        if (!cancelled) {
          setMyRsvps(list);
          // temporary debug:
          console.log("RSVP calendar raw:", res);
          console.log("RSVP calendar list:", list);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to load RSVPs", e);
          setMyRsvps([]);
        }
      } finally {
        if (!cancelled) setLoadingRsvpCalendar(false);
      }
    };

    loadRsvps();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);


  // --------- actions (DB-only) ----------
  const requireLogin = () => {
    if (!user?.id) {
      toast.error("Please sign in to do that.");
      return false;
    }
    return true;
  };

  const handleLike = async () => {
    if (!requireLogin() || likeLoading) return;
    setLikeLoading(true);
    const optimistic = !isLiked;
    setIsLiked(optimistic);
    setLikeCount((c) => c + (optimistic ? 1 : -1));
    try {
      if (optimistic) await api(`/api/events/${id}/like`, { method: "POST" });
      else await api(`/api/events/${id}/like`, { method: "DELETE" });
    } catch {
      // rollback
      setIsLiked(!optimistic);
      setLikeCount((c) => c + (optimistic ? -1 : 1));
      toast.error("Failed to update like");
    } finally {
      setLikeLoading(false);
    }
  };

  const handleRSVP = async () => {
    if (!requireLogin() || rsvpLoading) return;
    if (hasRSVP) return;
    setRsvpLoading(true);
    setHasRSVP(true);
    setRsvpCount((c) => c + 1);
    try {
      await api(`/api/events/${id}/rsvp`, { method: "POST" });
    } catch {
      // rollback
      setHasRSVP(false);
      setRsvpCount((c) => Math.max(0, c - 1));
      toast.error("Failed to RSVP");
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleCancelRSVP = async () => {
    if (!requireLogin() || cancelLoading) return;
    if (!hasRSVP) return;
    setCancelLoading(true);
    setHasRSVP(false);
    setRsvpCount((c) => Math.max(0, c - 1));
    try {
      await api(`/api/events/${id}/rsvp`, { method: "DELETE" });
      setIsCheckedIn(false);
      setIsCheckedOut(false);
      setHoursLogged(null);
      setCheckInTime(null);
    } catch {
      // rollback
      setHasRSVP(true);
      setRsvpCount((c) => c + 1);
      toast.error("Failed to cancel RSVP");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!requireLogin() || checkInLoading) return;
    try {
      setCheckInLoading(true);
      await api(`/api/events/${id}/check-in`, { method: "POST" });
      setIsCheckedIn(true);
      setCheckInTime(new Date());
      if (!hasRSVP) {
        setHasRSVP(true);
        setRsvpCount((c) => c + 1);
      }
    } catch {
      toast.error("Failed to check in");
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!requireLogin() || checkOutLoading) return;
    if (!isCheckedIn) return;
    try {
      setCheckOutLoading(true);
      const res = await api(`/api/events/${id}/check-out`, { method: "POST" });
      setIsCheckedOut(true);
      if (typeof res?.attendedHours === "number") {
        setHoursLogged(res.attendedHours.toFixed(1));
      } else if (checkInTime) {
        const now = new Date();
        const diff = (now - checkInTime) / (1000 * 60 * 60);
        setHoursLogged(diff.toFixed(1));
      }
    } catch {
      toast.error("Failed to check out");
    } finally {
      setCheckOutLoading(false);
    }
  };


  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!", { duration: 2000 });
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  // ----- reporting -----
  const openReportChooser = () => {
    if (!requireLogin()) return;
    setIsChooserOpen(true);
  };

  const selectReportOption = (type, targetId, name) => {
    // close chooser, then open modal by setting payload
    setIsChooserOpen(false);
    setReportPayload({ type, id: targetId, name });
  };

  const mapQuery = useMemo(
    () =>
      [event?.locationName, event?.address, event?.city, event?.state, event?.zipCode]
        .filter(Boolean)
        .join(", "),
    [event]
  );

  // ---- calendar dots only for this event date (if in current month) ----
  const { monthLabel, year, firstDay, daysInMonth, currentDay, monthIndex } =
    getCurrentMonthInfo();
  const eventDayInfo = useMemo(() => {
    if (!event?.startAt) return null;
    const d = new Date(event.startAt);
    return {
      day: d.getDate(),
      month: d.getMonth(),
      year: d.getFullYear(),
    };
  }, [event?.startAt]);

  const hasEventOnDay = (day) => {
    if (!eventDayInfo) return false;
    return (
      eventDayInfo.day === day &&
      eventDayInfo.month === monthIndex &&
      eventDayInfo.year === year
    );
  };


  const userHasRSVP = hasRSVP || isCheckedIn;

  if (!event && !loadError) return null;

  if (loadError && !event) {
    return (
      <Box pt="80px" pb={16} bg="gray.50" minH="100vh">
        <Box px={{ base: 6, md: 12, lg: 20, xl: 32 }}>
          <Button
            variant="ghost"
            color="gray.600"
            mb={6}
            onClick={() => navigate("/events")}
            _hover={{ bg: "gray.100" }}
          >
            <X size={18} style={{ marginRight: 8 }} /> Back to Events
          </Button>
          <Box bg="white" borderRadius="2xl" p={8} boxShadow="sm">
            <Text fontSize="2xl" fontWeight="bold" mb={2}>
              Event not available
            </Text>
            <Text color="gray.600">{loadError}</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  const mediaGallery = event.media || [];
  const latestMedia = mediaGallery[mediaGallery.length - 1];
  const hasLocation = Boolean(mapQuery);

  return (
    <>
      <Box pt="80px" pb={16} bg="gray.50" minH="100vh">
        <Box px={{ base: 6, md: 12, lg: 20, xl: 32 }}>
          <Button
            variant="ghost"
            color="gray.600"
            mb={6}
            onClick={() => navigate(-1)}
            _hover={{ bg: "gray.100" }}
          >
            <X size={18} style={{ marginRight: 8 }} /> Back
          </Button>

          <Flex gap={8} flexDir={{ base: "column", lg: "row" }}>
            {/* LEFT CONTENT */}
            <Box flex={1}>
              <Box bg="white" borderRadius="2xl" overflow="hidden" boxShadow="sm">
                <Box position="relative">
                  {event.category && (
                    <Text
                      position="absolute"
                      top={4}
                      left={4}
                      bg="white"
                      px={3}
                      py={1}
                      borderRadius="md"
                      fontSize="xs"
                      fontWeight="medium"
                      color="gray.700"
                      zIndex={1}
                    >
                      {event.category}
                    </Text>
                  )}
                  <ChakraImage
                    src={event.image || "/placeholder.png"}
                    alt={event.title}
                    w="100%"
                    h={{ base: "250px", md: "400px" }}
                    objectFit="cover"
                    fallbackSrc="/placeholder.png"
                  />
                </Box>

                <Box p={{ base: 6, md: 8 }}>
                  <Flex justify="space-between" align="start" mb={4}>
                    <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold">
                      {event.title}
                    </Text>
                    {/* Like Count + Report */}
                    <Flex align="center" gap={2} position="relative" zIndex={20}>
                      <Badge colorScheme="pink" variant="subtle">
                        {likeCount.toLocaleString()} {likeCount === 1 ? "Like" : "Likes"}
                      </Badge>
                      <IconButton
                        variant="ghost"
                        aria-label="Report"
                        onClick={openReportChooser}
                        color="pink.500"
                        _hover={{ bg: "pink.50" }}
                      >
                        <Flag size={18} />
                      </IconButton>

                      {/* Click-away backdrop */}
                      {isChooserOpen && (
                        <Box
                          position="fixed"
                          inset={0}
                          zIndex={19}
                          onClick={() => setIsChooserOpen(false)}
                        />
                      )}

                      {/* Chooser */}
                      {isChooserOpen && (
                        <Box
                          position="absolute"
                          top="36px"
                          right={0}
                          bg="white"
                          border="1px solid"
                          borderColor="gray.200"
                          borderRadius="md"
                          boxShadow="lg"
                          minW="220px"
                          zIndex={21}
                        >
                          <Text
                            px={3}
                            py={2}
                            fontSize="xs"
                            color="gray.500"
                            borderBottom="1px solid"
                            borderColor="gray.100"
                          >
                            What would you like to report?
                          </Text>

                          <Button
                            variant="ghost"
                            justifyContent="flex-start"
                            w="100%"
                            borderRadius={0}
                            px={3}
                            py={2.5}
                            onClick={() => selectReportOption("Event", event._id, event.title)}
                            _hover={{ bg: "gray.50" }}
                          >
                            Report Event
                          </Button>

                          {!!event?.groupId && (event.groupName || event.category) && (
                            <Button
                              variant="ghost"
                              justifyContent="flex-start"
                              w="100%"
                              borderRadius={0}
                              px={3}
                              py={2.5}
                              onClick={() =>
                                selectReportOption("Group", event.groupId, event.groupName || event.category)
                              }
                              _hover={{ bg: "gray.50" }}
                            >
                              Report Host Group
                            </Button>
                          )}
                        </Box>
                      )}
                    </Flex>
                  </Flex>

                  {/* LIKE / RSVP / CHECK-IN SECTION */}
                  <Flex gap={3} mb={6} flexWrap="wrap">
                    {!hasRSVP && !isCheckedIn && (
                      <>
                        <Button
                          isLoading={likeLoading}
                          variant={isLiked ? "solid" : "outline"}
                          bg={isLiked ? "#EC4899" : "white"}
                          color={isLiked ? "white" : "#EC4899"}
                          borderColor="#EC4899"
                          borderWidth="2px"
                          onClick={handleLike}
                          _hover={{ bg: isLiked ? "#C7327C" : "pink.50" }}
                        >
                          <Heart
                            size={18}
                            fill={isLiked ? "white" : "none"}
                            style={{ marginRight: 8 }}
                          />{" "}
                          Like
                        </Button>
                        <Button
                          isLoading={rsvpLoading}
                          bg="#EC4899"
                          color="white"
                          borderColor="#C7327C"
                          borderWidth="2px"
                          onClick={handleRSVP}
                          _hover={{ bg: "#C7327C" }}
                        >
                          <CalendarCheck size={18} style={{ marginRight: 8 }} /> RSVP
                        </Button>
                      </>
                    )}

                    {hasRSVP && !isCheckedIn && (
                      <>
                        <Button
                          isLoading={cancelLoading}
                          variant="outline"
                          color="#EC4899"
                          borderColor="#EC4899"
                          borderWidth="2px"
                          onClick={handleCancelRSVP}
                          _hover={{ bg: "pink.50" }}
                        >
                          <CalendarCheck size={18} style={{ marginRight: 8 }} /> Cancel RSVP
                        </Button>
                        <Button
                          isLoading={checkInLoading}
                          bg="#10B981"
                          color="white"
                          borderColor="#059669"
                          borderWidth="2px"
                          onClick={handleCheckIn}
                          _hover={{ bg: "#059669" }}
                        >
                          <LogIn size={18} style={{ marginRight: 8 }} /> Check In
                        </Button>
                      </>
                    )}

                    {isCheckedIn && !isCheckedOut && (
                      <>
                        <Button
                          isLoading={checkOutLoading}
                          bg="#F59E0B"
                          color="white"
                          borderColor="#D97706"
                          onClick={handleCheckOut}
                          _hover={{ bg: "#D97706" }}
                        >
                          <LogOut size={18} style={{ marginRight: 8 }} /> Check Out
                        </Button>
                        <IconButton
                          bg="#EF4444"
                          color="white"
                          borderColor="#DC2626"
                          onClick={() => {
                            setIsCheckedIn(false);
                            setCheckInTime(null);
                          }}
                          _hover={{ bg: "#DC2626" }}
                        >
                          <X size={18} />
                        </IconButton>
                      </>
                    )}

                    {isCheckedOut && hoursLogged && (
                      <>
                        <Button
                          bg="#3B82F6"
                          color="white"
                          borderColor="#2563EB"
                          cursor="default"
                        >
                          <Clock size={18} style={{ marginRight: 8 }} /> {hoursLogged} hours logged
                        </Button>
                        <IconButton
                          bg="#EF4444"
                          color="white"
                          borderColor="#DC2626"
                          onClick={() => {
                            setIsCheckedOut(false);
                            setHoursLogged(null);
                          }}
                          _hover={{ bg: "#DC2626" }}
                        >
                          <X size={18} />
                        </IconButton>
                      </>
                    )}
                  </Flex>

                  {/* LIKE / RSVP / CHECK-IN SECTION */}
                  <Flex gap={3} mb={6} flexWrap="wrap">
                    {/* ...all your buttons... */}
                  </Flex>

                  <Flex gap={3} mb={6} flexWrap="wrap">
                    {userHasRSVP && (
                      <EventReminderControls eventId={event._id} />
                    )}
                  </Flex>


                  {/* EVENT INFO */}
                  <Box mb={6}>
                    <Flex align="center" gap={3} mb={3}>
                      <Calendar size={20} color="#EC4899" />
                      <Box>
                        <Text fontWeight="medium" fontSize="sm">
                          {event.startAt
                            ? new Date(event.startAt).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })
                            : "TBD"}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          {event.endAt
                            ? `Starts ${new Date(event.startAt).toLocaleTimeString()}  |  `
                            : ""}
                          {event.endAt
                            ? `Ends ${new Date(event.endAt).toLocaleTimeString()}`
                            : ""}
                        </Text>
                      </Box>
                    </Flex>

                    {/* Only render location if present */}
                    {hasLocation && (
                      <Flex align="center" gap={3} mb={3}>
                        <MapPin size={20} color="#EC4899" />
                        <Box>
                          <Text fontWeight="medium" fontSize="sm">
                            {[event.address, event.city, event.state, event.zipCode]
                              .filter(Boolean)
                              .join(", ") || event.locationName}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            {event.locationName}
                          </Text>
                        </Box>
                      </Flex>
                    )}

                    <Flex align="center" gap={3}>
                      <Users size={20} color="#EC4899" />
                      <Text fontSize="sm" color="gray.600">
                        {(typeof rsvpCount === "number" ? rsvpCount : event.attendeesCount) || 0} users attending
                      </Text>
                    </Flex>
                  </Box>

                  {/* GOOGLE MAPS (only if we have a location) */}
                  {hasLocation && (
                    <Box
                      bg="gray.100"
                      borderRadius="lg"
                      h="250px"
                      mb={8}
                      overflow="hidden"
                      position="relative"
                      cursor="pointer"
                      onClick={() => {
                        const q = encodeURIComponent(mapQuery);
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${q}`,
                          "_blank"
                        );
                      }}
                      _hover={{
                        "&::after": {
                          content: '""',
                          position: "absolute",
                          inset: 0,
                          bg: "rgba(236, 72, 153, 0.1)",
                        },
                      }}
                      transition="all 0.2s"
                    >
                      <Box
                        as="iframe"
                        src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(
                          mapQuery
                        )}`}
                        w="100%"
                        h="100%"
                        border="none"
                        pointerEvents="none"
                      />
                      <Flex
                        position="absolute"
                        bottom={3}
                        right={3}
                        bg="white"
                        px={3}
                        py={1.5}
                        borderRadius="md"
                        boxShadow="md"
                        fontSize="xs"
                        fontWeight="medium"
                        color="gray.700"
                        align="center"
                        gap={1}
                      >
                        <MapPin size={16} color="#EC4899" />
                        Click to open in Google Maps
                      </Flex>
                    </Box>
                  )}

                  {/* ABOUT */}
                  <Box mb={6}>
                    <Text fontSize="lg" fontWeight="semibold" mb={3}>
                      About this event
                    </Text>
                    <Text color="gray.700" lineHeight="1.7">
                      {event.description || "No description provided."}
                    </Text>
                  </Box>

                  {/* TAGS */}
                  {!!event.tags?.length && (
                    <Flex gap={2} flexWrap="wrap">
                      {event.tags.map((tag, i) => (
                        <Link
                          key={i}
                          to={`/events?tags=${encodeURIComponent(tag)}&type=events`}
                          style={{ textDecoration: "none" }}
                        >
                          <Badge
                            bg="pink.50"
                            color="#EC4899"
                            fontSize="sm"
                            px={3}
                            py={1}
                            borderRadius="md"
                            fontWeight="medium"
                            cursor="pointer"
                            _hover={{ bg: "pink.100" }}
                          >
                            {tag}
                          </Badge>
                        </Link>
                      ))}
                    </Flex>
                  )}
                </Box>
              </Box>
            </Box>

            {/* RIGHT SIDEBAR — Calendar, Media, Share/Contact, Hosted By */}
            <Box w={{ base: "100%", lg: "340px" }}>
              {/* RSVP-aware Calendar (same footprint) */}
              <Box bg="white" borderRadius="2xl" p={6} mb={6} boxShadow="sm">
                <RSVPCalendarMini rsvps={myRsvps} loading={loadingRsvpCalendar} />
              </Box>


              {/* MEDIA PREVIEW BOX */}
              <Box bg="white" borderRadius="2xl" p={4} mb={6} boxShadow="sm">
                <Flex justify="space-between" align="center" mb={3}>
                  <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                    Media
                  </Text>
                  {mediaGallery.length > 0 && (
                    <Button
                      variant="link"
                      color="#EC4899"
                      fontSize="xs"
                      fontWeight="semibold"
                      onClick={() => setIsMediaOpen(true)}
                      _hover={{ textDecoration: "underline" }}
                    >
                      View All
                    </Button>
                  )}
                </Flex>

                {mediaGallery.length > 0 ? (
                  <Box
                    position="relative"
                    borderRadius="lg"
                    overflow="hidden"
                    cursor="pointer"
                    onClick={() => setIsMediaOpen(true)}
                    _hover={{ transform: "scale(1.01)", boxShadow: "md" }}
                    transition="all 0.2s ease"
                  >
                    {latestMedia?.type === "image" ? (
                      <ChakraImage
                        src={latestMedia.url}
                        alt={latestMedia.title}
                        w="100%"
                        h="180px"
                        objectFit="cover"
                        bg="gray.100"
                        fallbackSrc="/placeholder.png"
                      />
                    ) : (
                      <Box position="relative">
                        <ChakraImage
                          src={
                            getVideoThumb(latestMedia.url) ||
                            mediaGallery.find((m) => m.type === "image")?.url ||
                            "/placeholder.png"
                          }
                          alt={latestMedia.title}
                          w="100%"
                          h="180px"
                          objectFit="cover"
                          bg="gray.100"
                        />
                        <Flex
                          position="absolute"
                          inset={0}
                          align="center"
                          justify="center"
                          pointerEvents="none"
                        >
                          <Box bg="rgba(236,72,153,0.9)" p={3} borderRadius="full">
                            <PlayCircle size={36} color="white" />
                          </Box>
                        </Flex>
                      </Box>
                    )}

                    <Flex
                      position="absolute"
                      bottom={0}
                      left={0}
                      right={0}
                      bg="rgba(0,0,0,0.55)"
                      color="white"
                      align="center"
                      justify="center"
                      py={2}
                    >
                      <Text fontSize="sm" fontWeight="medium">
                        {latestMedia?.title || "View Gallery"}
                      </Text>
                    </Flex>
                  </Box>
                ) : (
                  <Box
                    h="100px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    border="1px dashed"
                    borderColor="gray.200"
                    borderRadius="lg"
                  >
                    <Text fontSize="sm" color="gray.400">
                      No media available
                    </Text>
                  </Box>
                )}
              </Box>

              {/* SHARE + CONTACT */}
              <Box bg="white" borderRadius="2xl" p={6} mb={6} boxShadow="sm">
                <Flex gap={3}>
                  <Button
                    flex={1}
                    variant="outline"
                    onClick={handleShare}
                    _hover={{ bg: "gray.50" }}
                    color="pink.500"
                  >
                    <Share2 size={18} style={{ marginRight: 8 }} /> Share
                  </Button>
                  <Button
                    flex={1}
                    variant="outline"
                    _hover={{ bg: "gray.50" }}
                    color="pink.500"
                    onClick={async () => {
                      if (!user) return openSignIn();

                      try {
                        // POST to create OR get existing convo
                        const res = await api("/api/messages/conversations", {
                          method: "POST",
                          body: { participants: [user.id, event.createdBy],
                                  title: `Chat about ${event.title}`
                           },
                          auth: "required"
                        });

                        const convo =
                          res?.conversation ||
                          res?.data?.conversation ||
                          res?.convo ||
                          res;

                        const id = convo?._id || convo?.id;
                        if (!id) {
                          console.error("Create conversation response:", res);
                          return toast.error("Conversation created, but no ID returned.");
                        }

                        navigate(`/messages`);
                      } catch (e) {
                        console.error(e);
                        toast.error("Could not start a conversation");
                      }
                    }}
                  >
                    <MessageSquare size={18} style={{ marginRight: 8 }} /> Contact
                  </Button>

                </Flex>
              </Box>


              {/* HOSTED BY */}
              <Box bg="white" borderRadius="2xl" p={6} mb={6} boxShadow="sm">
                <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                  Hosted by
                </Text>

                {group && event?.groupId ? (
                  <Flex direction="column" align="center" gap={2} mb={3}>
                  {/* Avatar */}
                  {group.image ? (
                    <ChakraImage
                      src={group.image}
                      alt={group.name}
                      boxSize="56px"
                      borderRadius="full"
                      objectFit="cover"
                      bg="gray.100"
                    />
                  ) : (
                    <Box
                      w="86px"
                      h="86px"
                      borderRadius="full"
                      bg="gray.100"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      fontWeight="bold"
                      color="gray.700"
                    >
                      {initials}
                    </Box>
                  )}

                  {/* Name + link, centered & tight */}
                  <Box textAlign="center">
                    <Text fontWeight="semibold" mb={0}>
                      {group.name ||
                        (event?.group && String(event.group)) ||
                        (event?.groupName && String(event.groupName)) ||
                        (event?.category && String(event.category)) ||
                        "Group"}
                    </Text>

                    {!!event?.groupId && (
                      <Button
                        variant="link"
                        colorScheme="blue"
                        size="sm"
                        mt={0}
                        onClick={() => navigate(`/groups/${event.groupId}`)}
                      >
                        View group →
                      </Button>
                    )}
                  </Box>
                </Flex>

                ) : (
                  // No group attached or group couldn't be found
                  <Box>
                    <Text fontWeight="semibold">No Group</Text>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      This event is not attached to a group.
                    </Text>
                  </Box>
                )}
              </Box>

            </Box>
          </Flex>

          <RecommendedEventsSection
            currentEventId={event._id}
            currentTags={event.tags}
          />

        </Box>
      </Box>

      {/* ---- MEDIA GALLERY MODAL ---- */}
      {isMediaOpen && (
        <Box
          position="fixed"
          top={0}
          left={0}
          w="100vw"
          h="100vh"
          bg="rgba(0, 0, 0, 0.7)"
          backdropFilter="blur(8px)"
          zIndex={2000}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={4}
          onClick={() => {
            setIsMediaOpen(false);
            setSelectedMedia(null);
          }}
        >
          <Box
            bg="white"
            borderRadius="2xl"
            maxW="1100px"
            w="100%"
            maxH="90vh"
            overflowY="auto"
            position="relative"
            boxShadow="2xl"
            p={6}
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton
              aria-label="Close gallery"
              position="absolute"
              top={4}
              right={4}
              variant="ghost"
              color="gray.600"
              onClick={() => {
                setIsMediaOpen(false);
                setSelectedMedia(null);
              }}
              _hover={{ bg: "gray.100" }}
              zIndex={1}
            >
              <X size={20} />
            </IconButton>
            <Text fontSize="lg" fontWeight="semibold" mb={4}>
              Media Gallery
            </Text>

            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
              {mediaGallery.map((media, index) => {
                const isVideo = media.type === "video" || media.type === "youtube";
                const thumb = isVideo
                  ? getVideoThumb(media.url) ||
                  mediaGallery.find((m) => m.type === "image")?.url
                  : media.url;
                return (
                  <Box
                    key={index}
                    position="relative"
                    borderRadius="lg"
                    overflow="hidden"
                    cursor="pointer"
                    bg="white"
                    boxShadow="sm"
                    _hover={{ transform: "scale(1.02)", boxShadow: "md" }}
                    transition="all 0.2s"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMedia(media);
                    }}
                  >
                    <ChakraImage
                      src={thumb || "/placeholder.png"}
                      alt={media.title}
                      w="100%"
                      h="220px"
                      objectFit="cover"
                      bg="gray.100"
                    />
                    {isVideo && (
                      <Flex
                        position="absolute"
                        top={0}
                        left={0}
                        right={0}
                        bottom="60px"
                        align="center"
                        justify="center"
                        pointerEvents="none"
                      >
                        <Box bg="rgba(236,72,153,0.9)" p={3} borderRadius="full">
                          <PlayCircle size={40} color="white" />
                        </Box>
                      </Flex>
                    )}
                    <Box p={3} borderTop="1px solid" borderColor="gray.100">
                      <Text fontSize="sm" fontWeight="medium" mb={1}>
                        {media.title}
                      </Text>
                      {media.by && (
                        <Text fontSize="xs" color="gray.600">
                          By: {media.by}
                        </Text>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Grid>
          </Box>
        </Box>
      )}

      {/* ---- FULLSCREEN MEDIA VIEWER ---- */}
      {selectedMedia && (
        <Box
          position="fixed"
          top={0}
          left={0}
          w="100vw"
          h="100vh"
          bg="rgba(0, 0, 0, 0.95)"
          zIndex={3000}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          p={4}
          onClick={() => setSelectedMedia(null)}
        >
          <IconButton
            aria-label="Close media viewer"
            position="absolute"
            top={6}
            right={6}
            color="white"
            bg="rgba(255,255,255,0.1)"
            onClick={() => setSelectedMedia(null)}
            _hover={{ bg: "rgba(255,255,255,0.2)" }}
            zIndex={1}
          >
            <X size={24} />
          </IconButton>

          {selectedMedia.type === "image" ? (
            <Box
              w="90vw"
              maxW="1200px"
              onClick={(e) => e.stopPropagation()}
              display="flex"
              flexDirection="column"
              gap={3}
              alignItems="center"
            >
              <ChakraImage
                src={selectedMedia.url}
                alt={selectedMedia.title || "Image"}
                maxH="75vh"
                maxW="100%"
                borderRadius="lg"
                objectFit="contain"
              />
              <Box color="white" textAlign="center">
                <Text fontSize="lg" fontWeight="semibold">
                  {selectedMedia.title || "Image"}
                </Text>
                {selectedMedia.by && (
                  <Text fontSize="sm" color="gray.300">
                    By: {selectedMedia.by}
                  </Text>
                )}
              </Box>
            </Box>
          ) : (
            <Box
              w="90vw"
              maxW="1200px"
              onClick={(e) => e.stopPropagation()}
              display="flex"
              flexDirection="column"
              gap={3}
            >
              <Box borderRadius="lg" overflow="hidden" bg="black">
                {isYouTube(selectedMedia.url) ? (
                  <Box
                    as="iframe"
                    width="100%"
                    height="75vh"
                    src={`https://www.youtube.com/embed/${getYouTubeId(
                      selectedMedia.url
                    )}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1`}
                    title={selectedMedia.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="eager"
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={{ display: "block", border: 0 }}
                    onError={() => toast.error("Unable to load YouTube video.")}
                  />
                ) : (
                  <ReactPlayer
                    url={selectedMedia.url}
                    width="100%"
                    height="75vh"
                    controls
                    playing
                    playsinline
                    onError={() => toast.error("Unable to load this video.")}
                  />
                )}
              </Box>
              <Box color="white" textAlign="center">
                <Text fontSize="lg" fontWeight="semibold">
                  {selectedMedia.title}
                </Text>
                {selectedMedia.by && (
                  <Text fontSize="sm" color="gray.300">
                    By: {selectedMedia.by}
                  </Text>
                )}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* ---- REPORT MODAL (controlled by reportPayload presence) ---- */}
      <ReportModal
        isOpen={!!reportPayload}
        onClose={() => setReportPayload(null)}
        reportType={reportPayload?.type}
        targetId={reportPayload?.id}
        targetName={reportPayload?.name}
      />
    </>
  );
}
