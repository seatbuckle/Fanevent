// src/pages/AllResults.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, Flex } from "@chakra-ui/react";
import { useSearchParams } from "react-router-dom";
import EventCard from "@/components/EventCard";
import GroupCard from "@/components/GroupCard";

const normalize = (s) => (s || "").toString().toLowerCase();
const cleanText = (s = "") => s.replace(/\s+/g, " ").trim();
const truncate = (s = "", n = 48) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

const inDateWindow = (eventDate, filters) => {
  if (!filters.length) return true;
  const d = new Date(eventDate);
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

  const time = d.getTime();

  const checks = filters
    .map((f) => f.toLowerCase())
    .map((f) => {
      if (f === "today") return time >= startOfDay.getTime() && time < endOfDay.getTime();
      if (f === "this week") return time >= startOfWeek.getTime() && time < endOfWeek.getTime();
      if (f === "this month") return time >= startOfMonth.getTime() && time < endOfMonth.getTime();
      return true;
    });

  return checks.every(Boolean);
};

async function fetchJson(url, opts = {}, signal) {
  const res = await fetch(url, { ...opts, signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const AllResults = () => {
  const [params] = useSearchParams();

  const qRaw = params.get("q") || "";
  const q = normalize(qRaw);
  const type = params.get("type") || ""; // expect 'all'
  const tags = (params.get("tags") || "").split(",").filter(Boolean);
  const dates = (params.get("dates") || "").split(",").filter(Boolean);

  const [events, setEvents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const run = async () => {
      setLoading(true);
      try {
        // Try querying server with filters
        const qp = new URLSearchParams();
        if (q) qp.set("query", q);
        if (tags.length) qp.set("tags", tags.join(","));
        if (dates.length) qp.set("dates", dates.join(","));
        const evUrl = `/api/events?${qp.toString()}`;
        const grUrl = `/api/groups?${q ? `query=${encodeURIComponent(q)}` : ""}${tags.length ? `${q ? "&" : ""}tags=${encodeURIComponent(tags.join(","))}` : ""}`;

        let evs = [];
        let grs = [];

        try {
          const data = await fetchJson(evUrl, {}, ctrl.signal);
          evs = Array.isArray(data) ? data : data?.items || [];
        } catch {
          const data2 = await fetchJson("/api/events", {}, ctrl.signal);
          evs = Array.isArray(data2) ? data2 : data2?.items || [];
        }

        try {
          const g = await fetchJson(grUrl || "/api/groups", {}, ctrl.signal);
          grs = Array.isArray(g) ? g : g?.items || [];
        } catch {
          const g2 = await fetchJson("/api/groups", {}, ctrl.signal);
          grs = Array.isArray(g2) ? g2 : g2?.items || [];
        }

        if (mounted) {
          setEvents(evs);
          setGroups(grs);
        }
      } catch {
        if (mounted) {
          setEvents([]);
          setGroups([]);
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

  const filteredEvents = useMemo(() => {
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

      const typeOK = type ? type === "all" : true;

      return textOK && tagsOK && dateOK && typeOK;
    });
  }, [events, q, type, tags, dates]);

  const filteredGroups = useMemo(() => {
    return (groups || []).filter((grp) => {
      const hay = [grp.name, grp.description, grp.location, ...(grp.tags || [])]
        .map(normalize)
        .join(" | ");
      const textOK = q ? hay.includes(q) || hay.indexOf(q) !== -1 : true;

      const tg = (grp.tags || []).map(normalize);
      const tagsOK = tags.length ? tags.every((t) => tg.includes(normalize(t))) : true;

      const typeOK = type ? type === "all" : true;

      return textOK && tagsOK && typeOK;
    });
  }, [groups, q, type, tags]);

  return (
    <Box pt="120px" pb={16} bg="gray.50" minH="100vh">
      <Box px={{ base: 6, md: 12, lg: 20, xl: 32 }} maxW="1400px" mx="auto">
        <Text fontSize="3xl" fontWeight="bold" mb={2} textAlign="center">
          Search Results
        </Text>

        {qRaw && (
          <Box mb={8} display="flex" justifyContent="center">
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
              {truncate(cleanText(qRaw))}
            </Box>
          </Box>
        )}

        {/* Events */}
        <Box mb={10}>
          <Flex align="center" justify="space-between" mb={4}>
            <Text fontSize="xl" fontWeight="semibold">Events</Text>
            <Text fontSize="sm" color="gray.500">{filteredEvents.length} found</Text>
          </Flex>

          <Flex gap={5} flexWrap="wrap" justify="center" align="center">
            {loading ? (
              <Text color="gray.500" mt={4}>Loading…</Text>
            ) : filteredEvents.length ? (
              filteredEvents.map((ev) => <EventCard key={ev._id} event={ev} />)
            ) : (
              <Text color="gray.500" mt={4}>No matching events.</Text>
            )}
          </Flex>
        </Box>

        {/* Groups */}
        <Box>
          <Flex align="center" justify="space-between" mb={4}>
            <Text fontSize="xl" fontWeight="semibold">Groups</Text>
            <Text fontSize="sm" color="gray.500">{filteredGroups.length} found</Text>
          </Flex>

          <Flex gap={5} flexWrap="wrap" justify="center" align="center">
            {loading ? (
              <Text color="gray.500" mt={4}>Loading…</Text>
            ) : filteredGroups.length ? (
              filteredGroups.map((group) => <GroupCard key={group._id || group.id} group={group} />)
            ) : (
              <Text color="gray.500" mt={4}>No matching groups.</Text>
            )}
          </Flex>
        </Box>
      </Box>
    </Box>
  );
};

export default AllResults;
