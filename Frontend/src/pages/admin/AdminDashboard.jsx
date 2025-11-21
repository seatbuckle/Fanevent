// src/pages/AdminDashboard.jsx
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

const statusColor = (s) =>
  s === "approved" ? "green" :
  s === "pending" ? "yellow" :
  s === "rejected" ? "red" : "gray";

const reportStatusColor = (s) =>
  s === "Open" ? "yellow" :
  s === "Under Review" ? "purple" :
  s === "Resolved" ? "green" :
  s === "Dismissed" ? "gray" : "gray";

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

// ----- Warning helpers (put near other helpers) -----
const defaultWarnText = (subject, name, reason) =>
  `Your ${subject}${name ? ` (“${name}”)` : ""} has received a warning from an admin.${reason ? ` Reason: ${reason}.` : ""} Please review and follow our Community Guidelines.`;

const promptWarningMessage = (prefill) => {
  const v = window.prompt(
    "Add a note to include with the warning (this will be shown to the recipient):",
    prefill || ""
  );
  if (v === null) return null; // cancelled
  const trimmed = v.trim();
  return trimmed || "Please review and follow our Community Guidelines.";
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

  // Reports data + filters/pagination
  const [reports, setReports] = React.useState([]);
  const [reportsLoading, setReportsLoading] = React.useState(false);
  const [reportsPage, setReportsPage] = React.useState(1);
  const [reportsLimit, setReportsLimit] = React.useState(20);
  const [reportsTotal, setReportsTotal] = React.useState(0);
  const [reportTypeFilter, setReportTypeFilter] = React.useState(""); // Event | Group | User | Message
  const [reportCategoryFilter, setReportCategoryFilter] = React.useState(""); // Spam | Harassment | ...
  const [reportStatusFilter, setReportStatusFilter] = React.useState(""); // Open | Under Review | Resolved | Dismissed

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

  // reload events when status filter changes
  React.useEffect(() => {
    if (activeTab === "events") {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventStatusFilter]);

  // reload reports when any report filter/page changes
  React.useEffect(() => {
    if (activeTab === "reports") {
      loadReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, reportsPage, reportsLimit, reportTypeFilter, reportCategoryFilter, reportStatusFilter]);

  // ------------------------
  // Dashboard data loader
  // ------------------------
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (activeTab === "users") {
        const data = await api("/api/admin/users").catch(() => []);
        setUsers(Array.isArray(data) ? data : []);
      } else if (activeTab === "fandom-groups") {
        const qs = new URLSearchParams();
        if (filterStatus) qs.set("status", filterStatus);
        const res = await api(`/api/admin/groups${qs.toString() ? `?${qs}` : ""}`).catch(() => null);
        setGroups(Array.isArray(res?.items) ? res.items : []);
      } else if (activeTab === "events") {
        const qs = new URLSearchParams();
        if (eventStatusFilter) qs.set("status", eventStatusFilter);
        qs.set("includeCounts", "1");
        const res = await api(`/api/admin/events${qs.toString() ? `?${qs}` : ""}`).catch(() => null);
        setEvents(Array.isArray(res?.items) ? res.items : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ------------------------
  // Reports: fetch + helpers
  // ------------------------
  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const qs = new URLSearchParams();
      if (reportStatusFilter) qs.set("status", reportStatusFilter);
      if (reportTypeFilter) qs.set("reportType", reportTypeFilter);
      if (reportCategoryFilter) qs.set("reportCategory", reportCategoryFilter);
      qs.set("page", String(reportsPage));
      qs.set("limit", String(reportsLimit));

      const res = await api(`/api/admin/reports${qs.toString() ? `?${qs}` : ""}`).catch(() => null);

      // Your /api/admin/reports previously returned { success, reports, pagination }
      const items = res?.reports || res || [];
      const total = res?.pagination?.total ?? items.length;

      setReports(Array.isArray(items) ? items : []);
      setReportsTotal(Number(total) || 0);
    } catch (e) {
      console.error(e);
      setReports([]);
      setReportsTotal(0);
    } finally {
      setReportsLoading(false);
    }
  };

  // ------------------------
  // Actions (existing)
  // ------------------------
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

  const handleWarnUser = async (userId, messageFromCaller) => {
    const msg =
      typeof messageFromCaller === "string"
        ? messageFromCaller
        : promptWarningMessage("Your account has received a warning from an admin.");
    if (msg === null) return; // user cancelled

    try {
      await api(`/api/admin/users/${userId}/warn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
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

  // ------------------------
  // Reports: admin actions
  // ------------------------
  const updateReportStatus = async (reportId, status, adminNotes = "") => {
    try {
      await api(`/api/admin/reports/${reportId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes }),
      });
      setReports((prev) =>
        prev.map((r) => (String(r._id) === String(reportId) ? { ...r, status } : r))
      );
    } catch (e) {
      toast.error(e?.message || "Failed to update report status");
    }
  };

  const handleReportAction = async (action, report) => {
    // report fields expected from backend:
    // { _id, reportType, reportCategory?, targetId, targetName, reason, reporterClerkId, reporterName, reporterEmail, status }
    const id = report?._id;
    const type = report?.reportType; // "Event" | "Group" | "User" | "Message"
    const targetId = report?.targetId;

    try {
      switch (action) {
        case "view-target": {
          // Try to open a sensible page by type
          if (type === "Event") window.open(`/events/${targetId}`, "_blank");
          else if (type === "Group") window.open(`/groups/${targetId}`, "_blank");
          else if (type === "User") window.open(`/users/${targetId}`, "_blank");
          else window.open(`/`, "_blank");
          return;
        }

        case "warn-user": {
          const msg = promptWarningMessage(
            defaultWarnText("account", report.targetName, report.reason || report.reportCategory)
          );
          if (msg === null) return;
          await handleWarnUser(targetId, msg);
          await updateReportStatus(id, "Under Review", `Warned the user: "${msg}"`);
          break;
        }

        case "ban-user": {
          await handleBanUser(targetId);
          toast.success("User banned");
          await updateReportStatus(id, "Resolved", "User banned; report resolved.");
          break;
        }

        // ---- EVENT actions ----
        case "remove-event": {
          if (!confirm("Remove this event? This cannot be undone.")) return;
          await api(`/api/admin/events/${targetId}`, { method: "DELETE" });
          toast.success("Event removed");
          await updateReportStatus(id, "Resolved", "Event removed.");
          break;
        }
        case "warn-organizer": {
          const msg = promptWarningMessage(
            defaultWarnText("event", report.targetName, report.reason || report.reportCategory)
          );
          if (msg === null) return;
          await api(`/api/admin/events/${targetId}/warn-organizer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg, reportId: id }),
          });
          toast.success("Organizer warned");
          await updateReportStatus(id, "Under Review", `Organizer warned: "${msg}"`);
          break;
        }

        // ---- GROUP actions ----
        case "warn-group": {
          const msg = promptWarningMessage(
            defaultWarnText("group", report.targetName, report.reason || report.reportCategory)
          );
          if (msg === null) return;
          await api(`/api/admin/groups/${targetId}/warn`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg, reportId: id }),
          });
          toast.success("Group warned");
          await updateReportStatus(id, "Under Review", `Group warned: "${msg}"`);
          break;
        }
        case "delete-group": {
          if (!confirm("Delete/ban this group? This cannot be undone.")) return;
          await api(`/api/admin/groups/${targetId}`, { method: "DELETE" });
          toast.success("Group deleted");
          await updateReportStatus(id, "Resolved", "Group deleted.");
          break;
        }

        // ---- MESSAGE actions (optional endpoints) ----
        case "warn-sender": {
          const msg = promptWarningMessage(
            defaultWarnText("message", null, report.reason || report.reportCategory)
          );
          if (msg === null) return;
          await api(`/api/admin/messages/${targetId}/warn-sender`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg, reportId: id }),
          }).catch(() => {
            throw new Error("Warn sender endpoint missing");
          });
          toast.success("Sender warned");
          await updateReportStatus(id, "Under Review", `Sender warned: "${msg}"`);
          break;
        }
        case "delete-message": {
          await api(`/api/admin/messages/${targetId}`, { method: "DELETE" }).catch(() => {
            throw new Error("Delete message endpoint missing");
          });
          toast.success("Message deleted");
          await updateReportStatus(id, "Resolved", "Message deleted.");
          break;
        }

        // ---- REPORT status only ----
        case "resolve-report": {
          await updateReportStatus(id, "Resolved");
          toast.success("Report resolved");
          break;
        }
        case "dismiss-report": {
          await updateReportStatus(id, "Dismissed");
          toast.success("Report dismissed");
          break;
        }

        default:
          break;
      }
    } catch (e) {
      toast.error(e?.message || "Action failed");
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

  if (!isLoaded) {
    return (
      <Container maxW="1400px" pt={24} pb={10}>
        <Text>Loading…</Text>
      </Container>
    );
  }

  const pendingApplications = (applications || []).filter(a => a.status === "pending");
  const totalReportPages = Math.max(1, Math.ceil((reportsTotal || 0) / reportsLimit));

  // Small helper to render actions based on type
  const ReportActions = ({ report }) => {
    const type = report.reportType;
    return (
      <HStack spacing={2} flexWrap="wrap">
        <Button variant="link" colorScheme="blue" size="sm" onClick={() => handleReportAction("view-target", report)}>
          View
        </Button>

        {type === "User" && (
          <>
            <Button variant="link" colorScheme="yellow" size="sm" onClick={() => handleReportAction("warn-user", report)}>
              Warn User
            </Button>
            <Button variant="link" colorScheme="red" size="sm" onClick={() => handleReportAction("ban-user", report)}>
              Ban User
            </Button>
          </>
        )}

        {type === "Event" && (
          <>
            <Button variant="link" colorScheme="yellow" size="sm" onClick={() => handleReportAction("warn-organizer", report)}>
              Warn Organizer
            </Button>
            <Button variant="link" colorScheme="red" size="sm" onClick={() => handleReportAction("remove-event", report)}>
              Remove Event
            </Button>
          </>
        )}

        {type === "Group" && (
          <>
            <Button variant="link" colorScheme="yellow" size="sm" onClick={() => handleReportAction("warn-group", report)}>
              Warn Group
            </Button>
            <Button variant="link" colorScheme="red" size="sm" onClick={() => handleReportAction("delete-group", report)}>
              Delete Group
            </Button>
          </>
        )}

        {type === "Message" && (
          <>
            <Button variant="link" colorScheme="yellow" size="sm" onClick={() => handleReportAction("warn-sender", report)}>
              Warn Sender
            </Button>
            <Button variant="link" colorScheme="red" size="sm" onClick={() => handleReportAction("delete-message", report)}>
              Delete Message
            </Button>
          </>
        )}

        <Button variant="link" colorScheme="gray" size="sm" onClick={() => handleReportAction("dismiss-report", report)}>
          Dismiss
        </Button>
        <Button variant="link" colorScheme="green" size="sm" onClick={() => handleReportAction("resolve-report", report)}>
          Resolve
        </Button>
      </HStack>
    );
  };

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
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={6}>
            <StatCard icon="👥" label="Total Users" value={stats.totalUsers} change={342} changeLabel="This week" color="blue" />
            <StatCard icon="👥" label="Fandom Groups" value={stats.fandomGroups} change={12} changeLabel="This week" color="pink" />
            <StatCard icon="📅" label="Active Events" value={stats.activeEvents} change={56} changeLabel="This week" color="green" />
            <StatCard icon="⚠" label="Reports" value={stats.reports} changeLabel="Pending review" color="yellow" />
          </Grid>

          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
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

          {pendingApplications.length > 0 && (
            <Card textAlign="center" py={10}>
              <Text fontSize="5xl" mb={4}>📋</Text>
              <Heading size="md" mb={4}>Organizer Applications</Heading>
              <Text color="gray.600" mb={6}>
                Review pending organizer applications and approve qualified candidates
              </Text>
              <Button
                colorScheme="blue"
                size="lg"
                borderRadius="full"
                onClick={() => { window.location.href = "/admin/organizer-applications"; }}
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

          <Grid templateColumns="2fr 1fr 1fr 1fr 1.5fr" gap={4} pb={3} borderBottomWidth="1px" display={{ base: "none", lg: "grid" }}>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">User</Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">Role</Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">Joined</Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">Status</Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">Actions</Text>
          </Grid>

          <VStack spacing={3} mt={4} align="stretch">
            {loading && <Text color="gray.500">Loading users...</Text>}
            {!loading && users.length === 0 && (
              <Text color="gray.500" textAlign="center" py={8}>No users found</Text>
            )}
            {!loading && users.slice(0, 8).map((user, idx) => (
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
                  <Box w="40px" h="40px" borderRadius="full" bg="gray.200" display="flex" alignItems="center" justifyContent="center">👤</Box>
                  <Box>
                    <Text fontWeight="medium">{user.name || `User ${idx + 1}`}</Text>
                    <Text fontSize="sm" color="gray.600">{user.email || `user${idx + 1}@example.com`}</Text>
                  </Box>
                </HStack>

                <Text>{user.role || ["Admin", "User", "User", "Organizer", "User"][idx % 5]}</Text>
                <Text fontSize="sm">{formatDate(user.createdAt) || `May ${idx + 1}, 2023`}</Text>

                <Badge colorScheme={user.status === "active" || idx % 3 !== 0 ? "green" : "yellow"} borderRadius="full" px={3} py={1} w="fit-content">
                  {user.status || (idx % 3 === 0 ? "Pending" : "Active")}
                </Badge>

                <HStack spacing={2}>
                  <Button variant="link" colorScheme="yellow" size="sm" onClick={() => handleWarnUser(user._id)}>Warn</Button>
                  <Button variant="link" colorScheme="red" size="sm" onClick={() => handleBanUser(user._id)}>Ban</Button>
                </HStack>
              </Grid>
            ))}
          </VStack>

          <Flex justify="space-between" align="center" mt={6}>
            <Text fontSize="sm" color="gray.600">Showing 1-8 of 100 users</Text>
            <HStack>
              <Button variant="outline" size="sm" borderRadius="lg">Previous</Button>
              <Button variant="outline" size="sm" borderRadius="lg">Next</Button>
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
              <Box position="relative" minW="280px">
                <Input
                  placeholder="Search groups…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  borderRadius="full"
                  pl={10}
                />
                <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color="gray.400">🔍</Box>
              </Box>

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

          <VStack spacing={3} mt={4} align="stretch">
            {loading && <Text color="gray.500">Loading groups…</Text>}

            {!loading && (() => {
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

                  <Badge colorScheme="purple" variant="subtle" w="fit-content">
                    {g.category || "General"}
                  </Badge>

                  <Text fontWeight="semibold">
                    {(typeof g.membersCount === "number"
                      ? g.membersCount
                      : Array.isArray(g.members)
                        ? g.members.length
                        : 0
                    ).toLocaleString()}
                  </Text>

                  <Text fontSize="sm">{formatDate(g.createdAt)}</Text>

                  <Badge colorScheme={statusColor(g.status)} borderRadius="full" px={3} py={1} w="fit-content">
                    {g.status?.charAt(0).toUpperCase() + g.status?.slice(1)}
                  </Badge>

                  <HStack spacing={2}>
                    <Button variant="link" colorScheme="blue" size="sm" onClick={() => window.open(`/groups/${g._id}`, "_blank")}>
                      View
                    </Button>

                    {g.status === "pending" && (
                      <>
                        <Button variant="link" colorScheme="green" size="sm" onClick={() => handleApproveGroup(g._id)}>Approve</Button>
                        <Button variant="link" colorScheme="red" size="sm" onClick={() => handleRejectGroup(g._id)}>Reject</Button>
                      </>
                    )}

                    {g.status === "approved" && (
                      <Button variant="link" colorScheme="red" size="sm" onClick={() => handleRejectGroup(g._id)}>
                        Mark Rejected
                      </Button>
                    )}

                    {g.status === "rejected" && (
                      <Button variant="link" colorScheme="green" size="sm" onClick={() => handleApproveGroup(g._id)}>
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
              <Box position="relative" minW="280px">
                <Input
                  placeholder="Search events…"
                  value={eventSearchQuery}
                  onChange={(e) => setEventSearchQuery(e.target.value)}
                  borderRadius="full"
                  pl={10}
                />
                <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color="gray.400">🔍</Box>
              </Box>

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
                  ev.group,
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
                        <Text fontWeight="medium" noOfLines={1}>{ev.title || "Untitled Event"}</Text>
                        {(ev.city || ev.locationName) && (
                          <Text fontSize="xs" color="gray.600" noOfLines={1}>
                            {ev.locationName || ev.city}
                          </Text>
                        )}
                      </Box>
                    </HStack>

                    <Text fontSize="sm" noOfLines={1}>{organizerName}</Text>
                    <Text fontSize="sm">{eventDate ? new Date(eventDate).toLocaleDateString() : "—"}</Text>
                    <Text fontWeight="semibold">{attendees}</Text>

                    <Badge colorScheme={statusColor(ev.status)} borderRadius="full" px={3} py={1} w="fit-content">
                      {(ev.status || "pending").replace(/^./, (c) => c.toUpperCase())}
                    </Badge>

                    <HStack spacing={2}>
                      <Button variant="link" colorScheme="blue" size="sm" onClick={() => window.open(`/events/${ev._id}`, "_blank")}>
                        View
                      </Button>

                      {ev.status === "pending" ? (
                        <>
                          <Button variant="link" colorScheme="green" size="sm" onClick={() => handleApproveEvent(ev._id)}>Approve</Button>
                          <Button variant="link" colorScheme="red" size="sm" onClick={() => handleRejectEvent(ev._id)}>Reject</Button>
                        </>
                      ) : ev.status === "approved" ? (
                        <Button variant="link" colorScheme="red" size="sm" onClick={() => handleRejectEvent(ev._id)}>
                          Mark Rejected
                        </Button>
                      ) : (
                        <Button variant="link" colorScheme="green" size="sm" onClick={() => handleApproveEvent(ev._id)}>
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
              <Button variant="outline" size="sm" borderRadius="lg" onClick={loadDashboardData}>Refresh</Button>
            </HStack>
          </Flex>
        </Card>
      )}

      {/* ======================= REPORTS TAB ======================= */}
      {activeTab === "reports" && (
        <Card>
          <Heading size="md" mb={6}>Reports Management</Heading>

          {/* Filters */}
          <Flex gap={3} wrap="wrap" mb={4}>
            <Box as="select" value={reportTypeFilter} onChange={(e)=>{ setReportTypeFilter(e.target.value); setReportsPage(1); }}
              borderWidth="1px" borderRadius="full" px={3} py={2} minW="180px">
              <option value="">All types</option>
              <option value="User">User</option>
              <option value="Group">Group</option>
              <option value="Event">Event</option>
              <option value="Message">Message</option>
            </Box>

            <Box as="select" value={reportCategoryFilter} onChange={(e)=>{ setReportCategoryFilter(e.target.value); setReportsPage(1); }}
              borderWidth="1px" borderRadius="full" px={3} py={2} minW="200px">
              <option value="">All categories</option>
              <option value="Spam">Spam</option>
              <option value="Harassment">Harassment</option>
              <option value="Inappropriate Content">Inappropriate Content</option>
              <option value="Misinformation">Misinformation</option>
              <option value="Other">Other</option>
            </Box>

            <Box as="select" value={reportStatusFilter} onChange={(e)=>{ setReportStatusFilter(e.target.value); setReportsPage(1); }}
              borderWidth="1px" borderRadius="full" px={3} py={2} minW="200px">
              <option value="">All statuses</option>
              <option value="Open">Open</option>
              <option value="Under Review">Under Review</option>
              <option value="Resolved">Resolved</option>
              <option value="Dismissed">Dismissed</option>
            </Box>

            <Box as="select" value={reportsLimit} onChange={(e)=>{ setReportsLimit(Number(e.target.value)||20); setReportsPage(1); }}
              borderWidth="1px" borderRadius="full" px={3} py={2} minW="120px">
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
            </Box>

            <Button variant="outline" onClick={()=>{ setReportTypeFilter(""); setReportCategoryFilter(""); setReportStatusFilter(""); setReportsPage(1); }}>
              Clear
            </Button>
          </Flex>

          {/* Header */}
          <Grid
            templateColumns="1.2fr 1.2fr 2fr 1.2fr 1fr 1.8fr"
            gap={4}
            pb={3}
            borderBottomWidth="1px"
            display={{ base: "none", lg: "grid" }}
          >
            <Text fontSize="sm" fontWeight="medium" color="gray.600">Target</Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">Type / Category</Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">Reason</Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">Reported By</Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">Status</Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">Actions</Text>
          </Grid>

          {/* Rows */}
          <VStack spacing={3} mt={4} align="stretch">
            {reportsLoading && <Text color="gray.500">Loading reports…</Text>}
            {!reportsLoading && reports.length === 0 && (
              <Text color="gray.500" textAlign="center" py={8}>No reports found</Text>
            )}
            {!reportsLoading && reports.map((r) => (
              <Grid
                key={r._id}
                templateColumns={{ base: "1fr", lg: "1.2fr 1.2fr 2fr 1.2fr 1fr 1.8fr" }}
                gap={4}
                alignItems="start"
                p={4}
                borderWidth="1px"
                borderRadius="xl"
                _hover={{ bg: "gray.50" }}
              >
                <Box>
                  <Text fontWeight="medium" noOfLines={1}>{r.targetName || r.targetId}</Text>
                  <Text fontSize="xs" color="gray.500" noOfLines={1}>ID: {r.targetId}</Text>
                </Box>

                <Box>
                  <Text fontSize="sm" noOfLines={1}>{r.reportType}</Text>
                  <Text fontSize="xs" color="gray.600" noOfLines={1}>{r.reportCategory || "—"}</Text>
                </Box>

                <Text fontSize="sm" noOfLines={3}>{r.reason}</Text>

                <Box>
                  <Text fontSize="sm" noOfLines={1}>{r.reporterName || "—"}</Text>
                  <Text fontSize="xs" color="gray.600" noOfLines={1}>{r.reporterEmail || "—"}</Text>
                  <Text fontSize="xs" color="gray.500" mt={1}>{formatDate(r.createdAt)}</Text>
                </Box>

                <Badge colorScheme={reportStatusColor(r.status)} borderRadius="full" px={3} py={1} w="fit-content">
                  {r.status}
                </Badge>

                <ReportActions report={r} />
              </Grid>
            ))}
          </VStack>

          {/* Pagination */}
          <Flex justify="space-between" align="center" mt={6}>
            <Text fontSize="sm" color="gray.600">
              {reportsTotal ? `Showing page ${reportsPage} of ${totalReportPages} (${reportsTotal} total)` : "No reports"}
            </Text>
            <HStack>
              <Button
                variant="outline"
                size="sm"
                borderRadius="lg"
                onClick={() => setReportsPage((p) => Math.max(1, p - 1))}
                isDisabled={reportsPage <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                borderRadius="lg"
                onClick={() => setReportsPage((p) => Math.min(totalReportPages, p + 1))}
                isDisabled={reportsPage >= totalReportPages}
              >
                Next
              </Button>
            </HStack>
          </Flex>
        </Card>
      )}
    </Container>
  );
}
