// src/pages/Groups.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, Flex } from "@chakra-ui/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import GroupCard from "@/components/GroupCard";
import AdvancedSearchSheet from "@/components/AdvancedSearchModal";
import BlurCircle from "@/components/BlurCircle";


const normalize = (s) => (s || "").toString().toLowerCase();
const cleanText = (s = "") => s.replace(/\s+/g, " ").trim();
const truncate = (s = "", n = 48) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

async function fetchJson(url, opts = {}, signal) {
  const res = await fetch(url, { ...opts, signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const Groups = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const q = normalize(params.get("q") || "");
  const type = params.get("type") || "";
  const tags = (params.get("tags") || "").split(",").filter(Boolean);

  const [groups, setGroups] = useState([]);
  const [events, setEvents] = useState([]); // for modal’s cross-refs
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
        // Try server-side filtered groups
        const qp = new URLSearchParams();
        if (q) qp.set("query", q);
        if (tags.length) qp.set("tags", tags.join(","));
        const url = `/api/groups?${qp.toString()}`;

        let glist = [];
        try {
          const g = await fetchJson(url, {}, ctrl.signal);
          glist = Array.isArray(g) ? g : g?.items || [];
        } catch {
          const g2 = await fetchJson("/api/groups", {}, ctrl.signal);
          glist = Array.isArray(g2) ? g2 : g2?.items || [];
        }

        // Load some events so the modal has context
        let elist = [];
        try {
          const e = await fetchJson("/api/events?limit=100", {}, ctrl.signal);
          elist = Array.isArray(e) ? e : e?.items || [];
        } catch {
          // ignore
        }

        if (mounted) {
          setGroups(glist);
          setEvents(elist);
        }
      } catch {
        if (mounted) setGroups([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
      ctrl.abort();
    };
  }, [q, tags.join(",")]);

  const handleApplySearch = (filters) => {
    const qp = new URLSearchParams();
    if (filters.query) qp.set("q", filters.query);
    if (filters.tags?.length) qp.set("tags", filters.tags.join(","));
    qp.set("type", "groups");
    navigate(`/groups?${qp.toString()}`);
  };

  const filtered = useMemo(() => {
    return (groups || []).filter((grp) => {
      const hay = [grp.name, grp.description, grp.location, ...(grp.tags || [])]
        .map(normalize)
        .join(" | ");
      const textOK = q ? hay.includes(q) || hay.indexOf(q) !== -1 : true;

      const tg = (grp.tags || []).map(normalize);
      const tagsOK = tags.length ? tags.every((t) => tg.includes(normalize(t))) : true;

      const typeOK = type ? type === "groups" : true;
      return textOK && tagsOK && typeOK;
    });
  }, [groups, q, type, tags]);

  return (
    <Box pt="120px" pb={16} bg="gray.50" minH="100vh">
      <Box px={{ base: 6, md: 12, lg: 20, xl: 62 }} maxW="1400px" mx="auto">
        <BlurCircle top="20px" right="-80px" />
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
            _hover={{ borderColor: "pink.300", boxShadow: "md" }}
          >
            <Flex align="center" gap={3} color="gray.500">
              <Box>🔍</Box>
              <Text fontSize="sm" flex="1" noOfLines={1}>
                {q ? `Search groups… (${cleanText(params.get("q") || "")})` : "Search groups…"}
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
            filtered.map((group) => <GroupCard key={group._id || group.id} group={group} />)
          ) : (
            <Text color="gray.500" mt={20}>
              No groups match your filters.
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
        initialKind="Groups"
      />
    </Box>
  );
};

export default Groups;
