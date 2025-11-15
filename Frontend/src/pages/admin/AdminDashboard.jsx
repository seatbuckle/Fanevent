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
  Image,
  Flex,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import { useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

/* ======================= Helpers ======================= */
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const options = { year: "numeric", month: "short", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
};

// Put near other helpers at the top of AdminDashboard.jsx
const statusColor = (s) =>
  s === "approved" ? "green" : s === "pending" ? "yellow" : s === "rejected" ? "red" : "gray";


// Choose a thumbnail for an event
const getEventThumb = (ev) => {
  try {
    if (ev?.image) return ev.image;
    const img = (ev?.media || []).find(
      (m) => m && (m.type === "image" || !m.type) && m.url
    );
    return img?.url || "";
  } catch {
    return "";
  }
};



/* ======================= Card Component ======================= */
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

/* ======================= Stat Card ======================= */
const StatCard = ({ icon, label, value, change, changeLabel, color = "blue" }) => (
  <Card>
    <Flex align="start" gap={4}>
      <Box
        bg={`${color}.50`}
        p={3}
        borderRadius="xl"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize="2xl">{icon}</Text>
      </Box>
      <Box flex="1">
        <Text fontSize="sm" color="gray.600" mb={1}>
          {label}
        </Text>
        <Heading size="xl">{value?.toLocaleString()}</Heading>
        {change && (
          <HStack mt={2} spacing={2}>
            <Text fontSize="sm" color="gray.600">
              {changeLabel}
            </Text>
            <Text fontSize="sm" fontWeight="semibold" color={change > 0 ? "green.600" : "gray.600"}>
              {change > 0 ? "+" : ""}{change}
            </Text>
          </HStack>
        )}
      </Box>
    </Flex>
  </Card>
);

/* ======================= Main Admin Dashboard ======================= */
export default function AdminDashboard() {
  const { isLoaded } = useUser();
  const [activeTab, setActiveTab] = React.useState("overview");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("");

  // Data states
  const [stats, setStats] = React.useState({
    totalUsers: 0,
    fandomGroups: 0,
    activeEvents: 0,
    reports: 0,
  });
  
  const [users, setUsers] = React.useState([]);
  const [groups, setGroups] = React.useState([]);
  const [events, setEvents] = React.useState([]);
  const [applications, setApplications] = React.useState([]);
  const [reports, setReports] = React.useState([]);
  const [reportsTab, setReportsTab] = React.useState("user");

  const [eventStatusFilter, setEventStatusFilter] = React.useState("");
  const [eventSearchQuery, setEventSearchQuery] = React.useState("");

  
  const [loading, setLoading] = React.useState(false);

  // Recent activity (mock)
  const recentActivity = [
    { type: "group", text: "New fandom group created: Taylor Swift Fans", time: "10 minutes ago", icon: "➕", color: "blue" },
    { type: "application", text: "New organizer application approved: John Smith", time: "25 minutes ago", icon: "✓", color: "green" },
    { type: "violation", text: "Content removed for policy violation: Event #2451", time: "1 hour ago", icon: "✕", color: "red" },
    { type: "report", text: "New report submitted: Inappropriate content", time: "2 hours ago", icon: "⚠", color: "yellow" },
  ];

  // Load data
  React.useEffect(() => {
    if (!isLoaded) return;
    loadDashboardData();
    (async () => {
        try {
            const res = await api("/api/admin/stats").catch(() => null);
            if (res?.stats) setStats(res.stats);
        } catch {}
    })();
  }, [isLoaded, activeTab]);

  // RELOAD groups when filterStatus changes and we're on the groups tab
    React.useEffect(() => {
    if (activeTab === "fandom-groups") {
        loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterStatus]);


    // REPLACE loadDashboardData with this version
    const loadDashboardData = async () => {
    setLoading(true);
    try {
        if (activeTab === "users") {
        const data = await api("/api/admin/users").catch(() => []);
        setUsers(Array.isArray(data) ? data : []);
        } else if (activeTab === "fandom-groups") {
        // NOTE: admin list returns { items, total, page, pageSize }
        const qs = new URLSearchParams();
        if (filterStatus) qs.set("status", filterStatus); // "", "pending", "approved", "rejected"
        const res = await api(`/api/admin/groups${qs.toString() ? `?${qs}` : ""}`).catch(() => null);
        setGroups(Array.isArray(res?.items) ? res.items : []);
        // inside loadDashboardData()
        } else if (activeTab === "events") {
        const qs = new URLSearchParams();
        if (eventStatusFilter) qs.set("status", eventStatusFilter);
        // Ask for RSVP counts if you want them:
        qs.set("includeCounts", "1");
        const res = await api(`/api/admin/events${qs.toString() ? `?${qs}` : ""}`).catch(() => null);
        setEvents(Array.isArray(res?.items) ? res.items : []);
        } else if (activeTab === "reports") {
        const data = await api("/api/admin/reports").catch(() => []);
        setReports(Array.isArray(data) ? data : []);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
    };


  // Load organizer applications
  const loadApplications = async () => {
    try {
      const res = await api("/api/admin/organizer-applications").catch(() => ({ apps: [] }));
      const apps = Array.isArray(res?.apps) ? res.apps : [];
      setApplications(apps);
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    if (isLoaded) loadApplications();
  }, [isLoaded]);

  React.useEffect(() => {
  if (activeTab === "events") {
    loadDashboardData();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [eventStatusFilter]);


  // Actions
  const handleApproveApplication = async (id) => {
    try {
      await api(`/api/admin/organizer-applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      toast.success("Application approved");
      loadApplications();
    } catch (e) {
      toast.error(e?.message || "Failed to approve");
    }
  };

  const handleRejectApplication = async (id) => {
    try {
      await api(`/api/admin/organizer-applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      toast.success("Application rejected");
      loadApplications();
    } catch (e) {
      toast.error(e?.message || "Failed to reject");
    }
  };

  const handleWarnUser = async (userId) => {
    if (!confirm("Send warning to this user?")) return;
    try {
      await api(`/api/admin/users/${userId}/warn`, { method: "POST" });
      toast.success("Warning sent");
    } catch (e) {
      toast.error(e?.message || "Failed to warn user");
    }
  };

  const handleBanUser = async (userId) => {
    if (!confirm("Ban this user? This action can be reversed later.")) return;
    try {
      await api(`/api/admin/users/${userId}/ban`, { method: "POST" });
      toast.success("User banned");
      loadDashboardData();
    } catch (e) {
      toast.error(e?.message || "Failed to ban user");
    }
  };

  const handleApproveGroup = async (groupId) => {
    try {
      await api(`/api/admin/groups/${groupId}/approve`, { method: "POST" });
      toast.success("Group approved");
      loadDashboardData();
    } catch (e) {
      toast.error(e?.message || "Failed to approve group");
    }
  };

  const handleRejectGroup = async (groupId) => {
    try {
      await api(`/api/admin/groups/${groupId}/reject`, { method: "POST" });
      toast.success("Group rejected");
      loadDashboardData();
    } catch (e) {
      toast.error(e?.message || "Failed to reject group");
    }
  };

  const handleApproveEvent = async (eventId) => {
    try {
      await api(`/api/admin/events/${eventId}/approve`, { method: "POST" });
      toast.success("Event approved");
      loadDashboardData();
    } catch (e) {
      toast.error(e?.message || "Failed to approve event");
    }
  };

  const handleRejectEvent = async (eventId) => {
    try {
      await api(`/api/admin/events/${eventId}/reject`, { method: "POST" });
      toast.success("Event rejected");
      loadDashboardData();
    } catch (e) {
      toast.error(e?.message || "Failed to reject event");
    }
  };

  if (!isLoaded) {
    return (
      <Container maxW="1400px" pt={24} pb={10}>
        <Text>Loading…</Text>
      </Container>
    );
  }

  const pendingApplications = (applications || []).filter(a => a.status === "pending");

  return (
    <Container maxW="1400px" pt={24} pb={12}>
      {/* Header */}
      <Box mb={8}>
        <Heading size="xl" mb={2}>
          Admin Dashboard
        </Heading>
        <Text color="gray.600">Manage platform operations, users, and content</Text>
      </Box>

      {/* Tabs */}
      <HStack spacing={6} mb={8} borderBottomWidth="2px" borderColor="gray.200" overflowX="auto">
        {["Overview", "Users", "Fandom Groups", "Events", "Reports"].map((tab) => {
          const val = tab.toLowerCase().replace(" ", "-");
          const active = activeTab === val;
          return (
            <Button
              key={tab}
              variant="unstyled"
              onClick={() => setActiveTab(val)}
              pb={3}
              borderBottomWidth="2px"
              borderBottomColor={active ? "blue.500" : "transparent"}
              color={active ? "blue.500" : "gray.600"}
              fontWeight={active ? "semibold" : "normal"}
              borderRadius="0"
              _hover={{ color: "blue.500" }}
              flexShrink={0}
            >
              {tab}
            </Button>
          );
        })}
      </HStack>

      {/* ======================= OVERVIEW TAB ======================= */}
      {activeTab === "overview" && (
        <VStack spacing={6} align="stretch">
          {/* Stats Grid */}
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={6}>
            <StatCard
              icon="👥"
              label="Total Users"
              value={stats.totalUsers}
              change={342}
              changeLabel="This week"
              color="blue"
            />
            <StatCard
              icon="👥"
              label="Fandom Groups"
              value={stats.fandomGroups}
              change={12}
              changeLabel="This week"
              color="pink"
            />
            <StatCard
              icon="📅"
              label="Active Events"
              value={stats.activeEvents}
              change={56}
              changeLabel="This week"
              color="green"
            />
            <StatCard
              icon="⚠"
              label="Reports"
              value={stats.reports}
              changeLabel="Pending review"
              color="yellow"
            />
          </Grid>

          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
            {/* System Status */}
            <Card>
            <Flex justify="space-between" align="center" mb={5}>
                <Heading size="md">System Status</Heading>
            </Flex>

            <VStack spacing={4} align="stretch">
                {[
                { label: "Website", status: "Operational", color: "green" },
                { label: "API", status: "Operational", color: "green" },
                { label: "Database", status: "Operational", color: "green" },
                { label: "Notification Service", status: "Partial Outage", color: "yellow" },
                ].map((item) => (
                <Flex key={item.label} justify="space-between" align="center">
                    <HStack>
                    <Box w="8px" h="8px" borderRadius="full" bg={`${item.color}.500`} />
                    <Text>{item.label}</Text>
                    </HStack>
                    <Text fontSize="sm" fontWeight="semibold" color={`${item.color}.600`}>
                    {item.status}
                    </Text>
                </Flex>
                ))}
            </VStack>
            </Card>


            {/* Recent Activity */}
            <Card>
              <Flex justify="space-between" align="center" mb={5}>
                <Heading size="md">Recent Activity</Heading>
                <Button variant="link" colorScheme="blue" size="sm">
                  See All
                </Button>
              </Flex>
              <VStack spacing={4} align="stretch">
                {recentActivity.map((activity, idx) => (
                  <Flex key={idx} gap={3}>
                    <Box
                      bg={`${activity.color}.50`}
                      w="32px"
                      h="32px"
                      borderRadius="lg"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      {activity.icon}
                    </Box>
                    <Box flex="1">
                      <Text fontSize="sm">{activity.text}</Text>
                      <Text fontSize="xs" color="gray.500">
                        {activity.time}
                      </Text>
                    </Box>
                  </Flex>
                ))}
              </VStack>
            </Card>
          </Grid>

          {/* Organizer Applications CTA */}
          {pendingApplications.length > 0 && (
            <Card textAlign="center" py={10}>
              <Text fontSize="5xl" mb={4}>
                📋
              </Text>
              <Heading size="md" mb={4}>
                Organizer Applications
              </Heading>
              <Text color="gray.600" mb={6}>
                Review pending organizer applications and approve qualified candidates
              </Text>
              <Button
                colorScheme="blue"
                size="lg"
                borderRadius="full"
                onClick={() => {
                  // Navigate to applications view
                  window.location.href = "/admin/organizer-applications";
                }}
              >
                Review Pending Applications ({pendingApplications.length})
              </Button>
            </Card>
          )}
        </VStack>
      )}

      {/* ======================= USERS TAB ======================= */}
      {activeTab === "users" && (
        <Card>
          <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
            <Heading size="md">User Management</Heading>
            <Box position="relative" minW="300px">
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                pl={10}
                borderRadius="full"
              />
              <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color="gray.400">
                🔍
              </Box>
            </Box>
          </Flex>

          {/* Table Header */}
          <Grid templateColumns="2fr 1fr 1fr 1fr 1.5fr" gap={4} pb={3} borderBottomWidth="1px" display={{ base: "none", lg: "grid" }}>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              User
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Role
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Joined
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Status
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Actions
            </Text>
          </Grid>

          {/* Table Rows */}
          <VStack spacing={3} mt={4} align="stretch">
            {loading && <Text color="gray.500">Loading users...</Text>}
            {!loading && users.length === 0 && (
              <Text color="gray.500" textAlign="center" py={8}>
                No users found
              </Text>
            )}
            {!loading &&
              users.slice(0, 8).map((user, idx) => (
                <Grid
                  key={user._id || idx}
                  templateColumns={{ base: "1fr", lg: "2fr 1fr 1fr 1fr 1.5fr" }}
                  gap={4}
                  alignItems="center"
                  p={4}
                  borderWidth="1px"
                  borderRadius="xl"
                  _hover={{ bg: "gray.50" }}
                >
                  <HStack>
                    <Box
                      w="40px"
                      h="40px"
                      borderRadius="full"
                      bg="gray.200"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      👤
                    </Box>
                    <Box>
                      <Text fontWeight="medium">{user.name || `User ${idx + 1}`}</Text>
                      <Text fontSize="sm" color="gray.600">
                        {user.email || `user${idx + 1}@example.com`}
                      </Text>
                    </Box>
                  </HStack>

                  <Text>{user.role || ["Admin", "User", "User", "Organizer", "User"][idx % 5]}</Text>
                  <Text fontSize="sm">{formatDate(user.createdAt) || `May ${idx + 1}, 2023`}</Text>

                  <Badge
                    colorScheme={user.status === "active" || idx % 3 !== 0 ? "green" : "yellow"}
                    borderRadius="full"
                    px={3}
                    py={1}
                    w="fit-content"
                  >
                    {user.status || (idx % 3 === 0 ? "Pending" : "Active")}
                  </Badge>

                  <HStack spacing={2}>
                    <Button variant="link" colorScheme="yellow" size="sm" onClick={() => handleWarnUser(user._id)}>
                      Warn
                    </Button>
                    <Button variant="link" colorScheme="red" size="sm" onClick={() => handleBanUser(user._id)}>
                      Ban
                    </Button>
                  </HStack>
                </Grid>
              ))}
          </VStack>

          <Flex justify="space-between" align="center" mt={6}>
            <Text fontSize="sm" color="gray.600">
              Showing 1-8 of 100 users
            </Text>
            <HStack>
              <Button variant="outline" size="sm" borderRadius="lg">
                Previous
              </Button>
              <Button variant="outline" size="sm" borderRadius="lg">
                Next
              </Button>
            </HStack>
          </Flex>
        </Card>
      )}

      {/* ======================= FANDOM GROUPS TAB ======================= */}
    {activeTab === "fandom-groups" && (
    <Card>
        <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Heading size="md">Fandom Groups Management</Heading>

        <HStack>
            {/* Search input (client-side filter) */}
            <Box position="relative" minW="280px">
            <Input
                placeholder="Search groups…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                borderRadius="full"
                pl={10}
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

            {/* Status filter — drives backend query */}
            <Box
            as="select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
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
        </Flex>

        {/* Table Header */}
        <Grid
        templateColumns="2fr 1.5fr 1fr 1.2fr 1fr 1.6fr"
        gap={4}
        pb={3}
        borderBottomWidth="1px"
        display={{ base: "none", lg: "grid" }}
        >
        <Text fontSize="sm" fontWeight="medium" color="gray.600">Group</Text>
        <Text fontSize="sm" fontWeight="medium" color="gray.600">Category</Text>
        <Text fontSize="sm" fontWeight="medium" color="gray.600">Members</Text>
        <Text fontSize="sm" fontWeight="medium" color="gray.600">Created</Text>
        <Text fontSize="sm" fontWeight="medium" color="gray.600">Status</Text>
        <Text fontSize="sm" fontWeight="medium" color="gray.600">Actions</Text>
        </Grid>

        {/* Rows */}
        <VStack spacing={3} mt={4} align="stretch">
        {loading && <Text color="gray.500">Loading groups…</Text>}

        {!loading && (() => {
            // client-side search across name/desc/category/tags
            const q = (searchQuery || "").toLowerCase().trim();
            const visible = (groups || []).filter((g) => {
            if (!q) return true;
            const hay = [
                g.name,
                g.description,
                g.category,
                ...(Array.isArray(g.tags) ? g.tags : []),
            ]
                .filter(Boolean)
                .join(" | ")
                .toLowerCase();
            return hay.includes(q);
            });

            if (visible.length === 0) {
            return (
                <Text color="gray.500" textAlign="center" py={8}>
                No groups found{filterStatus ? ` for status “${filterStatus}”` : ""}.
                </Text>
            );
            }

            return visible.map((g) => (
            <Grid
                key={g._id}
                templateColumns={{ base: "1fr", lg: "2fr 1.5fr 1fr 1.2fr 1fr 1.6fr" }}
                gap={4}
                alignItems="center"
                p={4}
                borderWidth="1px"
                borderRadius="xl"
                _hover={{ bg: "gray.50" }}
            >
                {/* Group name + image */}
                <HStack>
                <Box
                    w="40px"
                    h="40px"
                    borderRadius="full"
                    bg="gray.100"
                    overflow="hidden"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                >
                    {g.image ? (
                    <Image src={g.image} alt={g.name} w="40px" h="40px" objectFit="cover" />
                    ) : (
                    <Text>👥</Text>
                    )}
                </Box>
                <Box>
                    <Text fontWeight="medium" noOfLines={1}>{g.name}</Text>
                    {g.tags?.length ? (
                    <Text fontSize="xs" color="gray.600" noOfLines={1}>
                        {g.tags.slice(0, 3).join(" • ")}
                        {g.tags.length > 3 ? " +" + (g.tags.length - 3) : ""}
                    </Text>
                    ) : null}
                </Box>
                </HStack>

                {/* Category */}
                <Badge colorScheme="purple" variant="subtle" w="fit-content">
                {g.category || "General"}
                </Badge>

                {/* Members */}
                <Text fontWeight="semibold">
                {(typeof g.membersCount === "number"
                    ? g.membersCount
                    : Array.isArray(g.members)
                    ? g.members.length
                    : 0
                ).toLocaleString()}
                </Text>

                {/* Created */}
                <Text fontSize="sm">{formatDate(g.createdAt)}</Text>

                {/* Status */}
                <Badge colorScheme={statusColor(g.status)} borderRadius="full" px={3} py={1} w="fit-content">
                {g.status?.charAt(0).toUpperCase() + g.status?.slice(1)}
                </Badge>

                {/* Actions */}
                <HStack spacing={2}>
                <Button
                    variant="link"
                    colorScheme="blue"
                    size="sm"
                    onClick={() => window.open(`/groups/${g._id}`, "_blank")}
                >
                    View
                </Button>

                {g.status === "pending" && (
                    <>
                    <Button
                        variant="link"
                        colorScheme="green"
                        size="sm"
                        onClick={() => handleApproveGroup(g._id)}
                    >
                        Approve
                    </Button>
                    <Button
                        variant="link"
                        colorScheme="red"
                        size="sm"
                        onClick={() => handleRejectGroup(g._id)}
                    >
                        Reject
                    </Button>
                    </>
                )}

                {g.status === "approved" && (
                    <Button
                    variant="link"
                    colorScheme="red"
                    size="sm"
                    onClick={() => handleRejectGroup(g._id)}
                    >
                    Mark Rejected
                    </Button>
                )}

                {g.status === "rejected" && (
                    <Button
                    variant="link"
                    colorScheme="green"
                    size="sm"
                    onClick={() => handleApproveGroup(g._id)}
                    >
                    Mark Approved
                    </Button>
                )}
                </HStack>
            </Grid>
            ));
        })()}
        </VStack>

        <Flex justify="space-between" align="center" mt={6}>
        <Text fontSize="sm" color="gray.600">
            {groups?.length ? `Showing ${groups.length} groups` : "No groups"}
        </Text>
        <HStack>
            <Button variant="outline" size="sm" borderRadius="lg" onClick={loadDashboardData}>
            Refresh
            </Button>
        </HStack>
        </Flex>
    </Card>
    )}


      {/* ======================= EVENTS TAB ======================= */}
    {activeTab === "events" && (
    <Card>
        <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Heading size="md">Events Moderation</Heading>

        <HStack>
            {/* Search (client-side) */}
            <Box position="relative" minW="280px">
            <Input
                placeholder="Search events…"
                value={eventSearchQuery}
                onChange={(e) => setEventSearchQuery(e.target.value)}
                borderRadius="full"
                pl={10}
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

            {/* Status filter (server-side) */}
            <Box
            as="select"
            value={eventStatusFilter}
            onChange={(e) => setEventStatusFilter(e.target.value)}
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
        </Flex>

        {/* Table Header */}
        <Grid
        templateColumns="2fr 1.5fr 1.2fr 1fr 1fr 1.6fr"
        gap={4}
        pb={3}
        borderBottomWidth="1px"
        display={{ base: "none", lg: "grid" }}
        >
        <Text fontSize="sm" fontWeight="medium" color="gray.600">Event</Text>
        <Text fontSize="sm" fontWeight="medium" color="gray.600">Organizer</Text>
        <Text fontSize="sm" fontWeight="medium" color="gray.600">Date</Text>
        <Text fontSize="sm" fontWeight="medium" color="gray.600">Attendees</Text>
        <Text fontSize="sm" fontWeight="medium" color="gray.600">Status</Text>
        <Text fontSize="sm" fontWeight="medium" color="gray.600">Actions</Text>
        </Grid>

        {/* Rows */}
        <VStack spacing={3} mt={4} align="stretch">
        {loading && <Text color="gray.500">Loading events…</Text>}

        {!loading && (() => {
            const q = (eventSearchQuery || "").toLowerCase().trim();
            const visible = (events || []).filter((ev) => {
            if (!q) return true;
            const hay = [
                ev.title,
                ev.description,
                ev.category,
                ev.groupName,
                ev.group, // some payloads use group string
                ev.organizer?.name,
            ]
                .filter(Boolean)
                .join(" | ")
                .toLowerCase();
            return hay.includes(q);
            });

            if (visible.length === 0) {
            return (
                <Text color="gray.500" textAlign="center" py={8}>
                No events found{eventStatusFilter ? ` for status “${eventStatusFilter}”` : ""}.
                </Text>
            );
            }

            return visible.map((ev) => {
            const eventDate =
                ev.startAt || ev.date || ev.startsAt || ev.startDate || ev.scheduledAt;
            const organizerName =
                ev.groupName ||
                ev.group ||
                ev.organizer?.name ||
                ev.createdByName ||
                "—";
            const attendees =
                typeof ev.attendeesCount === "number"
                ? ev.attendeesCount
                : Array.isArray(ev.attendees)
                ? ev.attendees.length
                : ev.rsvpCount ?? 0;

            return (
                <Grid
                key={ev._id}
                templateColumns={{ base: "1fr", lg: "2fr 1.5fr 1.2fr 1fr 1fr 1.6fr" }}
                gap={4}
                alignItems="center"
                p={4}
                borderWidth="1px"
                borderRadius="xl"
                _hover={{ bg: "gray.50" }}
                >
                {/* Event (thumbnail + title) */}
                <HStack>
                <Box
                    w="40px"
                    h="40px"
                    borderRadius="12px"
                    bg="gray.100"
                    overflow="hidden"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                >
                    {getEventThumb(ev) ? (
                    <Image
                        src={getEventThumb(ev)}
                        alt={ev.title || "Event"}
                        w="40px"
                        h="40px"
                        objectFit="cover"
                        loading="lazy"
                    />
                    ) : (
                    <Text>📅</Text>
                    )}
                </Box>
                <Box minW={0}>
                    <Text fontWeight="medium" noOfLines={1}>
                    {ev.title || "Untitled Event"}
                    </Text>
                    {/* Optional tiny subtitle line */}
                    {(ev.city || ev.locationName) && (
                    <Text fontSize="xs" color="gray.600" noOfLines={1}>
                        {ev.locationName || ev.city}
                    </Text>
                    )}
                </Box>
                </HStack>


                {/* Organizer */}
                <Text fontSize="sm" noOfLines={1}>{organizerName}</Text>

                {/* Date */}
                <Text fontSize="sm">
                    {eventDate ? new Date(eventDate).toLocaleDateString() : "—"}
                </Text>

                {/* Attendees */}
                <Text fontWeight="semibold">{attendees}</Text>

                {/* Status */}
                <Badge
                    colorScheme={statusColor(ev.status)}
                    borderRadius="full"
                    px={3}
                    py={1}
                    w="fit-content"
                >
                    {(ev.status || "pending").replace(/^./, (c) => c.toUpperCase())}
                </Badge>

                {/* Actions */}
                <HStack spacing={2}>
                    <Button
                    variant="link"
                    colorScheme="blue"
                    size="sm"
                    onClick={() => window.open(`/events/${ev._id}`, "_blank")}
                    >
                    View
                    </Button>

                    {ev.status === "pending" ? (
                    <>
                        <Button
                        variant="link"
                        colorScheme="green"
                        size="sm"
                        onClick={() => handleApproveEvent(ev._id)}
                        >
                        Approve
                        </Button>
                        <Button
                        variant="link"
                        colorScheme="red"
                        size="sm"
                        onClick={() => handleRejectEvent(ev._id)}
                        >
                        Reject
                        </Button>
                    </>
                    ) : ev.status === "approved" ? (
                    <Button
                        variant="link"
                        colorScheme="red"
                        size="sm"
                        onClick={() => handleRejectEvent(ev._id)}
                    >
                        Mark Rejected
                    </Button>
                    ) : (
                    <Button
                        variant="link"
                        colorScheme="green"
                        size="sm"
                        onClick={() => handleApproveEvent(ev._id)}
                    >
                        Mark Approved
                    </Button>
                    )}
                </HStack>
                </Grid>
            );
            });
        })()}
        </VStack>

        <Flex justify="space-between" align="center" mt={6}>
        <Text fontSize="sm" color="gray.600">
            {events?.length ? `Showing ${events.length} events` : "No events"}
        </Text>
        <HStack>
            <Button variant="outline" size="sm" borderRadius="lg" onClick={loadDashboardData}>
            Refresh
            </Button>
        </HStack>
        </Flex>
    </Card>
    )}


      {/* ======================= REPORTS TAB ======================= */}
      {activeTab === "reports" && (
        <Card>
          <Heading size="md" mb={6}>
            Reports Management
          </Heading>

          {/* Sub-tabs */}
          <HStack spacing={4} mb={6} borderBottomWidth="1px" pb={2}>
            {[
              { key: "user", label: "User Reports", count: 2 },
              { key: "group", label: "Group Reports", count: 2 },
              { key: "event", label: "Event Reports", count: 1 },
              { key: "comment", label: "Comment Reports", count: 0 },
            ].map((tab) => (
              <Button
                key={tab.key}
                variant="unstyled"
                onClick={() => setReportsTab(tab.key)}
                color={reportsTab === tab.key ? "yellow.600" : "gray.600"}
                fontWeight={reportsTab === tab.key ? "semibold" : "normal"}
                borderBottomWidth="2px"
                borderBottomColor={reportsTab === tab.key ? "yellow.500" : "transparent"}
                borderRadius="0"
                pb={2}
              >
                {tab.label} ({tab.count})
              </Button>
            ))}
          </HStack>

          {/* Table Header */}
          <Grid
            templateColumns="1.5fr 2fr 1.5fr 1fr 1fr 1.5fr"
            gap={4}
            pb={3}
            borderBottomWidth="1px"
            display={{ base: "none", lg: "grid" }}
          >
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Reported {reportsTab === "user" ? "User" : reportsTab === "group" ? "Group" : reportsTab === "event" ? "Event" : "Comment"}
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Reason
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Reported By
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Date
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Status
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Actions
            </Text>
          </Grid>

          {/* Table Rows */}
          <VStack spacing={3} mt={4} align="stretch">
            {reportsTab === "user" && (
              <>
                {[
                  { reported: "user123", reason: "Spam", reporter: "user456", date: "2023-05-10", status: "pending" },
                  { reported: "user789", reason: "Harassment", reporter: "user234", date: "2023-05-09", status: "pending" },
                  { reported: "user567", reason: "Inappropriate behavior", reporter: "user890", date: "2023-05-08", status: "resolved" },
                ].map((report, idx) => (
                  <Grid
                    key={idx}
                    templateColumns={{ base: "1fr", lg: "1.5fr 2fr 1.5fr 1fr 1fr 1.5fr" }}
                    gap={4}
                    alignItems="center"
                    p={4}
                    borderWidth="1px"
                    borderRadius="xl"
                    _hover={{ bg: "gray.50" }}
                  >
                    <Text fontWeight="medium">{report.reported}</Text>
                    <Text fontSize="sm">{report.reason}</Text>
                    <Text fontSize="sm">{report.reporter}</Text>
                    <Text fontSize="sm">{report.date}</Text>

                    <Badge
                      colorScheme={report.status === "pending" ? "yellow" : "green"}
                      borderRadius="full"
                      px={3}
                      py={1}
                      w="fit-content"
                    >
                      {report.status === "pending" ? "Pending" : "Resolved"}
                    </Badge>

                    <HStack spacing={2}>
                      <Button variant="link" colorScheme="blue" size="sm">
                        View
                      </Button>
                      {report.status === "pending" && (
                        <>
                          <Button variant="link" colorScheme="gray" size="sm">
                            Dismiss
                          </Button>
                          <Button variant="link" colorScheme="red" size="sm">
                            Take Action
                          </Button>
                        </>
                      )}
                    </HStack>
                  </Grid>
                ))}
              </>
            )}

            {reportsTab === "group" && (
              <>
                {[
                  { reported: "Marvel Fans", reason: "Spam", reporter: "user456", date: "2023-05-10", status: "pending" },
                  { reported: "K-Pop Club", reason: "Harassment", reporter: "user234", date: "2023-05-09", status: "pending" },
                ].map((report, idx) => (
                  <Grid
                    key={idx}
                    templateColumns={{ base: "1fr", lg: "1.5fr 2fr 1.5fr 1fr 1fr 1.5fr" }}
                    gap={4}
                    alignItems="center"
                    p={4}
                    borderWidth="1px"
                    borderRadius="xl"
                    _hover={{ bg: "gray.50" }}
                  >
                    <Text fontWeight="medium">{report.reported}</Text>
                    <Text fontSize="sm">{report.reason}</Text>
                    <Text fontSize="sm">{report.reporter}</Text>
                    <Text fontSize="sm">{report.date}</Text>

                    <Badge
                      colorScheme="yellow"
                      borderRadius="full"
                      px={3}
                      py={1}
                      w="fit-content"
                    >
                      Pending
                    </Badge>

                    <HStack spacing={2}>
                      <Button variant="link" colorScheme="blue" size="sm">
                        View
                      </Button>
                      <Button variant="link" colorScheme="gray" size="sm">
                        Dismiss
                      </Button>
                      <Button variant="link" colorScheme="red" size="sm">
                        Take Action
                      </Button>
                    </HStack>
                  </Grid>
                ))}
              </>
            )}

            {reportsTab === "event" && (
              <Grid
                templateColumns={{ base: "1fr", lg: "1.5fr 2fr 1.5fr 1fr 1fr 1.5fr" }}
                gap={4}
                alignItems="center"
                p={4}
                borderWidth="1px"
                borderRadius="xl"
                _hover={{ bg: "gray.50" }}
              >
                <Text fontWeight="medium">Anime Convention</Text>
                <Text fontSize="sm">Inappropriate content</Text>
                <Text fontSize="sm">user890</Text>
                <Text fontSize="sm">2023-05-08</Text>

                <Badge
                  colorScheme="yellow"
                  borderRadius="full"
                  px={3}
                  py={1}
                  w="fit-content"
                >
                  Pending
                </Badge>

                <HStack spacing={2}>
                  <Button variant="link" colorScheme="blue" size="sm">
                    View
                  </Button>
                  <Button variant="link" colorScheme="gray" size="sm">
                    Dismiss
                  </Button>
                  <Button variant="link" colorScheme="red" size="sm">
                    Take Action
                  </Button>
                </HStack>
              </Grid>
            )}

            {reportsTab === "comment" && (
              <Text color="gray.500" textAlign="center" py={8}>
                No comment reports at this time
              </Text>
            )}
          </VStack>

          <Flex justify="space-between" align="center" mt={6}>
            <Text fontSize="sm" color="gray.600">
              Showing all reports
            </Text>
            <Button colorScheme="blue" borderRadius="full">
              Export Reports
            </Button>
          </Flex>
        </Card>
      )}
    </Container>
  );
}