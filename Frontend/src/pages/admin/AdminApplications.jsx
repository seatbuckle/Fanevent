// src/pages/admin/AdminApplications.jsx
import React from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  HStack,
  VStack,
  Button,
  Badge,
  Input,
  Grid,
  Flex,
  Spinner,
  Separator,
  Textarea,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

/* ======================= Small UI Helpers ======================= */
const Pill = (props) => <Button borderRadius="full" {...props} />;

const Card = ({ children, ...props }) => (
  <Box
    bg="white"
    borderWidth="1px"
    borderColor="gray.200"
    borderRadius="2xl"
    p={6}
    boxShadow="sm"
    {...props}
  >
    {children}
  </Box>
);

const StatusBadge = ({ status }) => {
  const cs =
    status === "approved" ? "green" : status === "rejected" ? "red" : "yellow";
  return (
    <Badge colorScheme={cs} borderRadius="full" px={3} py={1} fontSize="0.8rem">
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </Badge>
  );
};

/* ======================= Page ======================= */
export default function AdminApplications() {
  const [apps, setApps] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState("pending");
  const [q, setQ] = React.useState("");

  // details panel (simple state-driven)
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(null);
  const [notes, setNotes] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(
        `/api/admin/organizer-applications${statusFilter ? `?status=${statusFilter}` : ""}`
      );
      setApps(Array.isArray(res?.apps) ? res.apps : []);
    } catch (e) {
      toast.error(e?.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    load();
  }, [load]);

    const act = async (id, action, actionNotes) => {
    try {
        const res = await api(`/api/admin/organizer-applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: actionNotes }),
        });

        // If your api() throws on !ok, you won't reach here.
        toast.success(`Application ${action}d`);
        await load();
        if (selected && selected._id === id) {
        setSelected((s) =>
            s
            ? {
                ...s,
                status: action === "approve" ? "approved" : "rejected",
                notes: actionNotes ?? s.notes,
                }
            : s
        );
        }
    } catch (e) {
        // Try to surface server message if available
        const msg = e?.message || "Failed to update application";
        toast.error(msg);
        // optional: console output to see the raw payload causing 400s
        console.error("[AdminApplications.act] error:", e);
    }
    };


  const filtered = apps.filter((a) => {
    if (!q) return true;
    const s = `${a.fullName} ${a.email} ${a.group}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  const openDetails = (app) => {
    setSelected(app);
    setNotes(app?.notes || "");
    setPanelOpen(true);
  };

  const closeDetails = () => setPanelOpen(false);

  return (
    <>
      <Container maxW="1200px" pt={24} pb={12}>
        {/* Header */}
        <HStack justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
          <Heading size="lg">Organizer Applications</Heading>
          <HStack gap={3} flexWrap="wrap">
            {/* Search */}
            <Box position="relative" minW="280px">
              <Input
                placeholder="Search name, email, group…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                pl={10}
                borderRadius="full"
              />
              <Box
                position="absolute"
                left="3"
                top="50%"
                transform="translateY(-50%)"
                color="gray.400"
              >
                🔍
              </Box>
            </Box>

            {/* Filter (styled native select to avoid Chakra Select export differences) */}
            <Box
              as="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              borderWidth="1px"
              borderRadius="full"
              px={3}
              py={2}
              minW="200px"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </Box>
          </HStack>
        </HStack>

        {/* List */}
        <Card>
          {loading && (
            <Flex align="center" justify="center" py={10} gap={3}>
              <Spinner /> <Text>Loading applications…</Text>
            </Flex>
          )}

          {!loading && filtered.length === 0 && (
            <Text color="gray.600" textAlign="center" py={8}>
              No applications found.
            </Text>
          )}

          <VStack spacing={4} align="stretch">
            {filtered.map((a) => (
              <Box
                key={a._id}
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="2xl"
                p={4}
                _hover={{ bg: "gray.50" }}
              >
                <Flex gap={4} align="start" justify="space-between" flexWrap="wrap">
                  {/* Left meta */}
                  <HStack align="start" spacing={4} minW="260px">
                    <Box
                      w="44px"
                      h="44px"
                      borderRadius="full"
                      bg="pink.100"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      fontWeight="bold"
                      color="pink.700"
                      flexShrink={0}
                    >
                      {a.fullName?.charAt(0) || "U"}
                    </Box>
                    <Box>
                      <Text fontWeight="semibold" fontSize="lg">
                        {a.fullName}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {a.email}
                      </Text>
                      <HStack mt={1} spacing={2} flexWrap="wrap">
                        <Badge colorScheme="purple" variant="subtle" borderRadius="full" px={2}>
                          {a.group}
                        </Badge>
                        <StatusBadge status={a.status} />
                      </HStack>
                    </Box>
                  </HStack>

                  {/* Right actions */}
                  <Flex direction="column" gap={2} minW="220px" align="end">
                    <Text fontSize="sm" color="gray.600">
                      Submitted • {new Date(a.createdAt).toLocaleDateString()}
                    </Text>
                    <HStack>
                      <Pill
                        variant="outline"
                        colorScheme="pink"
                        onClick={() => openDetails(a)}
                        size="sm"
                      >
                        View
                      </Pill>
                      {a.status === "pending" ? (
                        <>
                          <Pill colorScheme="green" onClick={() => act(a._id, "approve")} size="sm">
                            Approve
                          </Pill>
                          <Pill
                            colorScheme="red"
                            variant="outline"
                            onClick={() => act(a._id, "reject")}
                            size="sm"
                          >
                            Reject
                          </Pill>
                        </>
                      ) : (
                        <Pill variant="ghost" size="sm" onClick={() => openDetails(a)}>
                          Details
                        </Pill>
                      )}
                    </HStack>
                  </Flex>
                </Flex>
              </Box>
            ))}
          </VStack>
        </Card>
      </Container>

      {/* ======================= Details Panel (fixed position) ======================= */}
      {panelOpen && (
        <>
          {/* Overlay */}
          <Box
            position="fixed"
            inset="0"
            bg="blackAlpha.600"
            zIndex={1300}
            onClick={closeDetails}
          />

          {/* Right panel */}
          <Box
            position="fixed"
            top="0"
            right="0"
            w={{ base: "100%", md: "560px" }}
            h="100vh"
            bg="white"
            borderLeftWidth="1px"
            borderColor="gray.200"
            boxShadow="xl"
            display="flex"
            flexDirection="column"
            zIndex={1400}
          >
            {/* Header */}
            <Box px={6} py={4} borderBottomWidth="1px">
              <HStack justify="space-between" align="center">
                <Box>
                  <Text fontSize="lg" fontWeight="semibold">
                    Organizer Application
                  </Text>
                  {selected && (
                    <Text fontSize="sm" color="gray.600">
                      {selected.fullName} • {selected.email}
                    </Text>
                  )}
                </Box>
                {selected && <StatusBadge status={selected.status} />}
              </HStack>
            </Box>

            {/* Body */}
            <Box flex="1" overflowY="auto" px={6} py={5}>
              {selected ? (
                <VStack align="stretch" spacing={5}>
                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={1}>
                      Group
                    </Text>
                    <Badge colorScheme="purple" variant="subtle" borderRadius="full" px={3} py={1}>
                      {selected.group}
                    </Badge>
                  </Box>

                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={1}>
                      Experience
                    </Text>
                    <Card p={4}>
                      <Text whiteSpace="pre-wrap">{selected.experience}</Text>
                    </Card>
                  </Box>

                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={1}>
                      Reason
                    </Text>
                    <Card p={4}>
                      <Text whiteSpace="pre-wrap">{selected.reason}</Text>
                    </Card>
                  </Box>

                  {selected.links && (
                    <Box>
                      <Text fontSize="sm" color="gray.600" mb={1}>
                        Links
                      </Text>
                      <a
                        href={selected.links}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#3182ce", wordBreak: "break-word" }}
                      >
                        {selected.links}
                      </a>
                    </Box>
                  )}

                  <Separator />

                  <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                    <Box>
                      <Text fontSize="sm" color="gray.600">
                        Submitted
                      </Text>
                      <Text>{new Date(selected.createdAt).toLocaleString()}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600">
                        Last Updated
                      </Text>
                      <Text>{new Date(selected.updatedAt).toLocaleString()}</Text>
                    </Box>
                    {selected.reviewedBy && (
                      <Box>
                        <Text fontSize="sm" color="gray.600">
                          Reviewed By
                        </Text>
                        <Text>{selected.reviewedBy}</Text>
                      </Box>
                    )}
                  </Grid>

                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      Admin Notes
                    </Text>
                    <Textarea
                      placeholder="Add private notes (optional)…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </Box>
                </VStack>
              ) : (
                <Text color="gray.600">No application selected.</Text>
              )}
            </Box>

            {/* Footer */}
            <Box px={6} py={4} borderTopWidth="1px">
              <HStack w="full" justify="space-between">
                <Pill variant="ghost" onClick={closeDetails}>
                  Close
                </Pill>
                <HStack>
                  {selected?.status === "pending" ? (
                    <>
                      <Pill
                        colorScheme="green"
                        onClick={() => act(selected._id, "approve", notes)}
                      >
                        Approve
                      </Pill>
                      <Pill
                        colorScheme="red"
                        variant="outline"
                        onClick={() => act(selected._id, "reject", notes)}
                      >
                        Reject
                      </Pill>
                    </>
                  ) : (
                    <Pill
                      colorScheme="blue"
                      variant="outline"
                      onClick={() =>
                        act(
                          selected._id,
                          selected.status === "approved" ? "reject" : "approve",
                          notes
                        )
                      }
                    >
                      {selected?.status === "approved" ? "Mark Rejected" : "Mark Approved"}
                    </Pill>
                  )}
                </HStack>
              </HStack>
            </Box>
          </Box>
        </>
      )}
    </>
  );
}
