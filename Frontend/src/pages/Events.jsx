// src/pages/Events.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, Flex } from "@chakra-ui/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import EventCard from "@/components/EventCard";
import AdvancedSearchSheet from "@/components/AdvancedSearchModal";
import ReportModal from "@/components/ui/ReportModal";
import { useDisclosure } from '@chakra-ui/react';
import BlurCircle from "@/components/BlurCircle";

const normalize = (s) => (s || "").toString().toLowerCase();
const cleanText = (s = "") => s.replace(/\s+/g, " ").trim();
const truncate = (s = "", n = 48) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

const inDateWindow = (when, filters) => {
  if (!filters?.length) return true;
  const d = new Date(when);
  if (Number.isNaN(d.getTime())) return true;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const day = startOfDay.getDay() || 7;
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - (day - 1));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const t = d.getTime();
  return filters
    .map((f) => f.toLowerCase())
    .every((f) => {
      if (f === "today") return t >= startOfDay.getTime() && t < endOfDay.getTime();
      if (f === "this week") return t >= startOfWeek.getTime() && t < endOfWeek.getTime();
      if (f === "this month") return t >= startOfMonth.getTime() && t < endOfMonth.getTime();
      return true;
    });
};

async function fetchJson(url, opts = {}, signal) {
  const res = await fetch(url, { ...opts, signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const Events = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  
  // Report modal state
  const { isOpen: isReportOpen, onOpen: onReportOpen, onClose: onReportClose } = useDisclosure();
  const [reportingEvent, setReportingEvent] = useState(null);

  const q = normalize(params.get("q") || "");
  const type = params.get("type") || "";
  const tags = (params.get("tags") || "").split(",").filter(Boolean);
  const dates = (params.get("dates") || "").split(",").filter(Boolean);

  // live data
  const [events, setEvents] = useState([]);
  const [groups, setGroups] = useState([]); // for modal suggestions
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  // server fetch (with fallback to client filtering)
  useEffect(() => {
    let mounted = true;
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const run = async () => {
      setLoading(true);
      try {
        // Try server-side filtered first (supports either ?query= or ?q=)
        const qp = new URLSearchParams();
        if (q) qp.set("query", q);
        if (tags.length) qp.set("tags", tags.join(","));
        if (dates.length) qp.set("dates", dates.join(",")); // backend may ignore; we'll filter client-side anyway
        const url = `/api/events?${qp.toString()}`;

        let list = [];
        try {
          const data = await fetchJson(url, {}, ctrl.signal);
          list = Array.isArray(data) ? data : data?.items || [];
        } catch {
          // fallback to unfiltered list and filter locally
          const data = await fetchJson("/api/events", {}, ctrl.signal);
          list = Array.isArray(data) ? data : data?.items || [];
        }

        // Load groups for the modal (best-effort)
        let groupList = [];
        try {
          const g = await fetchJson("/api/groups?limit=100", {}, ctrl.signal);
          groupList = Array.isArray(g) ? g : g?.items || [];
        } catch {
          // ignore
        }

        if (mounted) {
          setEvents(list);
          setGroups(groupList);
        }
      } catch {
        if (mounted) {
          setEvents([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
      ctrl.abort();
    };
  }, [q, tags.join(","), dates.join(",")]);

  const handleApplySearch = (filters) => {
    const qp = new URLSearchParams();
    if (filters.query) qp.set("q", filters.query);
    if (filters.tags?.length) qp.set("tags", filters.tags.join(","));
    if (filters.dates?.length) qp.set("dates", filters.dates.join(","));
    qp.set("type", "events");
    navigate(`/events?${qp.toString()}`);
  };

  // client filter (works whether server filtered or not)
  const filtered = useMemo(() => {
    return (events || []).filter((evt) => {
      const hay = [
        evt.title,
        evt.locationName || evt.location,
        evt.group || evt.groupName || evt.category,
        ...(evt.tags || []),
        evt.category,
        evt.description,
      ]
        .map(normalize)
        .join(" | ");

      const textOK = q ? hay.includes(q) || hay.indexOf(q) !== -1 : true;

      const tg = (evt.tags || []).map(normalize);
      const tagsOK = tags.length ? tags.every((t) => tg.includes(normalize(t))) : true;

      const when = evt.startAt || evt.date;
      const dateOK = inDateWindow(when, dates);

      const typeOK = type ? type === "events" : true;

      return textOK && tagsOK && dateOK && typeOK;
    });
  }, [events, q, type, tags, dates]);

  return (
    <Box pt="120px" pb={16} bg="gray.50" minH="100vh">
      <Box px={{ base: 6, md: 12, lg: 20, xl: 32 }} maxW="1400px" mx="auto">
        <BlurCircle top="20px" right="-80px" />
        <Text fontSize="3xl" fontWeight="bold" mb={4} textAlign="center">
          All Events
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
            _hover={{ borderColor: "pink.300", boxShadow: "md" }}
          >
            <Flex align="center" gap={3} color="gray.500">
              <Box>🔍</Box>
              <Text fontSize="sm" flex="1" noOfLines={1}>
                {q ? `Search events… (${cleanText(params.get("q") || "")})` : "Search events…"}
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
                Events
              </Box>
            </Flex>
          </Box>
        </Box>

        {q && (
          <Box mb={6} display="flex" justifyContent="center">
            <Text fontSize="sm" color="gray.500" mr={2}>
              Showing results for
            </Text>
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
              {truncate(cleanText(params.get("q") || ""))}
            </Box>
          </Box>
        )}

        <Flex gap={5} flexWrap="wrap" justify="center" align="center">
          {loading ? (
            <Text color="gray.500" mt={10}>Loading…</Text>
          ) : filtered.length ? (
            filtered.map((event) => (
              <EventCard 
                key={event._id} 
                event={event}
                onReport={(evt) => {
                  console.log('Report clicked for event:', evt.title);
                  setReportingEvent(evt);
                  onReportOpen();
                }}
              />
            ))
          ) : (
            <Text color="gray.500" mt={20}>
              No events match your filters.
            </Text>
          )}
        </Flex>
      </Box>

      {/* Advanced search with live data */}
      <AdvancedSearchSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        onApply={handleApplySearch}
        events={events}
        groups={groups}
        initialKind="Events"
      />

      {/* Report Modal */}
      {reportingEvent && (
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => {
            console.log('Closing report modal');
            onReportClose();
            setReportingEvent(null);
          }}
          reportType="Event"
          targetId={reportingEvent._id}
          targetName={reportingEvent.title}
        />
      )}
    </Box>
  );
};

export default Events;