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
  useBreakpointValue,
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

const roleBadgeColor = (role) => {
  const r = (role || "").toLowerCase();

  if (r === "admin") return "#FCE7F3"; // pink
  if (r === "organizer" || r === "host") return "#DBEAFE"; // blue
  if (r === "moderator" || r === "mod") return "#FCE7F3"; // pink
  if (r === "user" || r === "member") return "#F3E8FF"; // purple
  if (r === "pending") return "#FEF9C3"; // yellow
  return "#99A0A8"; // gray fallback (no special text color mapping)
};

const statusColor = (status) => {
  const s = (status || "").toLowerCase();

  if (s === "approved") return "#F0FDF4"; // soft green
  if (s === "pending") return "#FEF9C3"; // soft yellow
  if (s === "rejected") return "#FEE2E2"; // soft red

  return "#E5E7EB"; // light gray fallback
};

const reportStatusColor = (status) => {
  const s = (status || "").toLowerCase();

  if (s === "open") return "#FEF9C3"; // soft yellow
  if (s === "under review") return "#FEE2E2"; // soft red/pink-ish
  if (s === "resolved") return "#F0FDF4"; // soft green
  if (s === "dismissed") return "#F3E8FF"; // soft purple

  return "#E5E7EB"; // gray fallback
};

const pastelTextColor = (bg) => {
  if (!bg) return "#111827"; // default slate-ish

  const key = bg.toString().toUpperCase();

  if (key === "#FEE2E2") return "#EF4444"; // red
  if (key === "#DBEAFE") return "#3B82F6"; // blue
  if (key === "#F3E8FF") return "#6B21A8"; // purple/indigo
  if (key === "#FEF9C3") return "#854D0E"; // yellow/brown
  if (key === "#F0FDF4") return "#166534"; // green
  if (key === "#FCE7F3") return "#EC4899"; // pink

  return "#111827"; // fallback dark gray
};

const userStatusGreenBG = "#F0FDF4"; // pastel green (same as Approved)
const userStatusGreenText = "#166534"; // matching text color

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

// --- Date helpers ---
const isWithinDays = (d, n) => {
  if (!d) return false;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return false;
  return t >= Date.now() - n * 24 * 3600 * 1000;
};

// ----- Warning helpers -----
const defaultWarnText = (subject, name, reason) =>
  `Your ${subject}${
    name ? ` (“${name}”)` : ""
  } has received a warning from an admin.${
    reason ? ` Reason: ${reason}.` : ""
  } Please review and follow our Community Guidelines.`;

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
const StatCard = ({
  icon,
  label,
  value,
  change,
  changeLabel = "This week",
  color = "blue",
}) => {
  const isZero = change === 0 || change === "0";
  const showText = isZero ? "None this week" : `${change > 0 ? "+" : ""}${change}`;

  return (
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
          <Heading size="xl">{Number(value || 0).toLocaleString()}</Heading>

          <HStack mt={2} spacing={2}>
            <Text fontSize="sm" color="gray.600">
              {changeLabel}
            </Text>
            <Text
              fontSize="sm"
              fontWeight="semibold"
              color={isZero ? "gray.600" : "green.600"}
            >
              {showText}
            </Text>
          </HStack>
        </Box>
      </Flex>
    </Card>
  );
};

/* ======================= Main Admin Dashboard ======================= */
export default function AdminDashboard() {
  const { isLoaded } = useUser();
  const [activeTab, setActiveTab] = React.useState("overview");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("");
  const [usersPage, setUsersPage] = React.useState(1);
  const USERS_PER_PAGE = 8;

  // mobile / desktop breakpoint helper
  const isMobile = useBreakpointValue({ base: true, lg: false });

  // Weekly deltas for "+ this week"
  const [statsDelta, setStatsDelta] = React.useState({
    usersWeek: 0,
    groupsWeek: 0,
    eventsWeek: 0,
    reportsWeek: 0,
  });

  // System status & activity (now dynamic)
  const [systemStatus, setSystemStatus] = React.useState([
    { label: "Website", key: "web", status: "Operational", color: "green" },
    { label: "API", key: "api", status: "Operational", color: "green" },
    { label: "Database", key: "db", status: "Operational", color: "green" },
    {
      label: "Notification Service",
      key: "notify",
      status: "Operational",
      color: "green",
    },
  ]);

  const [activity, setActivity] = React.useState([]);

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
  const [reportTypeFilter, setReportTypeFilter] = React.useState("");
  const [reportCategoryFilter, setReportCategoryFilter] = React.useState("");
  const [reportStatusFilter, setReportStatusFilter] = React.useState("");

  const [eventStatusFilter, setEventStatusFilter] = React.useState("");
  const [eventSearchQuery, setEventSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const loadTopStats = async () => {
    try {
      // USERS — your Users tab treats /api/admin/users as a plain array
      const usersRes = await api("/api/admin/users").catch(() => null);
      let usersTotal = 0;
      if (Array.isArray(usersRes)) {
        usersTotal = usersRes.length;
      } else {
        usersTotal = totalFromPaginated(usersRes);
      }

      // EVENTS (Active = approved)
      const eventsRes = await api("/api/admin/events?includeCounts=1").catch(
        () => null
      );
      let activeEvents = 0;
      const cApproved =
        eventsRes &&
        eventsRes.counts &&
        typeof eventsRes.counts.approved === "number"
          ? eventsRes.counts.approved
          : 0;

      if (cApproved) {
        activeEvents = cApproved;
      } else {
        const eventsApprovedRes = await api(
          "/api/admin/events?status=approved&limit=1000&page=1"
        ).catch(() => null);
        const pagTotal = eventsApprovedRes?.pagination?.total;
        if (typeof pagTotal === "number") {
          activeEvents = pagTotal;
        } else {
          activeEvents = Array.isArray(eventsApprovedRes?.items)
            ? eventsApprovedRes.items.length
            : 0;
        }
      }

      // REPORTS (Open + Under Review)
      const [openRes, underReviewRes] = await Promise.all([
        api("/api/admin/reports?status=Open&limit=1&page=1").catch(() => null),
        api("/api/admin/reports?status=Under%20Review&limit=1&page=1").catch(
          () => null
        ),
      ]);

      const openTotal = totalFromPaginated(openRes, { itemsKey: "reports" });
      const underReviewTotal = totalFromPaginated(underReviewRes, {
        itemsKey: "reports",
      });
      const reportsTotalCombined = openTotal + underReviewTotal;

      // GROUPS
      let fandomGroups = 0;
      const groupsRes = await api("/api/admin/groups?limit=1&page=1").catch(
        () => null
      );

      if (typeof groupsRes?.pagination?.total === "number") {
        fandomGroups = groupsRes.pagination.total;
      } else if (Array.isArray(groupsRes?.items)) {
        fandomGroups = groupsRes.items.length;
      } else if (Array.isArray(groupsRes?.data)) {
        fandomGroups = groupsRes.data.length;
      } else if (Array.isArray(groupsRes)) {
        fandomGroups = groupsRes.length;
      }

      setStats((prev) => ({
        ...prev,
        totalUsers: usersTotal,
        fandomGroups,
        activeEvents,
        reports: reportsTotalCombined,
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const loadWeeklyDeltas = async () => {
    try {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const cutoff = Date.now() - sevenDaysMs;
      const within7 = (d) => {
        if (!d) return false;
        const t = new Date(d).getTime();
        return Number.isFinite(t) && t >= cutoff;
      };

      // USERS
      let usersWeek = 0;
      const usersRes = await api("/api/admin/users").catch(() => []);
      const userItems = Array.isArray(usersRes) ? usersRes : [];
      usersWeek = userItems.filter(
        (u) => within7(u?.createdAt) || within7(u?.joinedAt)
      ).length;

      // GROUPS
      let groupsWeek = 0;
      const groupsRes = await api(
        "/api/admin/groups?limit=1000&page=1"
      ).catch(() => null);
      const groupsItems = Array.isArray(groupsRes)
        ? groupsRes
        : Array.isArray(groupsRes?.items)
        ? groupsRes.items
        : Array.isArray(groupsRes?.data)
        ? groupsRes.data
        : [];
      groupsWeek = groupsItems.filter((g) => within7(g?.createdAt)).length;

      // EVENTS
      let eventsWeek = 0;
      const eventsApprovedRes = await api(
        "/api/admin/events?status=approved&limit=1000&page=1"
      ).catch(() => null);
      const evItems = Array.isArray(eventsApprovedRes)
        ? eventsApprovedRes
        : Array.isArray(eventsApprovedRes?.items)
        ? eventsApprovedRes.items
        : [];
      eventsWeek = evItems.filter((ev) =>
        within7(ev?.approvedAt ?? ev?.updatedAt)
      ).length;

      // REPORTS
      let reportsWeek = 0;
      const [openRes, urRes] = await Promise.all([
        api("/api/admin/reports?status=Open&limit=1000&page=1").catch(
          () => null
        ),
        api(
          "/api/admin/reports?status=Under%20Review&limit=1000&page=1"
        ).catch(() => null),
      ]);
      const openItems = Array.isArray(openRes?.reports)
        ? openRes.reports
        : Array.isArray(openRes)
        ? openRes
        : [];
      const urItems = Array.isArray(urRes?.reports)
        ? urRes.reports
        : Array.isArray(urRes)
        ? urRes
        : [];
      reportsWeek = [...openItems, ...urItems].filter((r) =>
        within7(r?.createdAt)
      ).length;

      setStatsDelta({ usersWeek, groupsWeek, eventsWeek, reportsWeek });
    } catch (e) {
      console.error(e);
      setStatsDelta({
        usersWeek: 0,
        groupsWeek: 0,
        eventsWeek: 0,
        reportsWeek: 0,
      });
    }
  };

  // Load data
  React.useEffect(() => {
    if (!isLoaded) return;
    loadDashboardData();
    loadTopStats();
    loadWeeklyDeltas();
    loadSystemStatus();
    loadRecentActivity();
  }, [isLoaded, activeTab]);

  // ---- System Status ----
  const loadSystemStatus = async () => {
    const HAS_CONSOLIDATED_ENDPOINT = false;

    const setDefault = () =>
      setSystemStatus([
        { label: "Website", key: "web", status: "Operational", color: "green" },
        { label: "API", key: "api", status: "Unknown", color: "gray" },
        { label: "Database", key: "db", status: "Unknown", color: "gray" },
        {
          label: "Notification Service",
          key: "notify",
          status: "Unknown",
          color: "gray",
        },
      ]);

    try {
      if (!HAS_CONSOLIDATED_ENDPOINT) {
        setDefault();
        return;
      }

      const res = await api("/api/admin/system-status").catch(() => null);
      if (res && Array.isArray(res.services)) {
        const toColor = (s = "") => {
          const v = String(s).toLowerCase();
          if (v.includes("operational")) return "green";
          if (v.includes("outage") || v.includes("degraded")) return "yellow";
          if (v.includes("down") || v.includes("error")) return "red";
          return "gray";
        };
        setSystemStatus(
          res.services.map((s) => ({
            label: s.label || s.key,
            key: s.key,
            status: s.status || "Unknown",
            color: toColor(s.status),
          }))
        );
      } else {
        setDefault();
      }
    } catch (e) {
      console.error(e);
      setDefault();
    }
  };

  // ---- Recent Activity ----
  const loadRecentActivity = async () => {
    try {
      const [groupsRes, eventsRes, reportsRes, appsRes] = await Promise.all([
        api("/api/admin/groups?limit=5&page=1&sort=-createdAt").catch(
          () => null
        ),
        api(
          "/api/admin/events?limit=5&page=1&sort=-approvedAt&status=approved"
        ).catch(() => null),
        api("/api/admin/reports?limit=5&page=1&sort=-createdAt").catch(
          () => null
        ),
        api(
          "/api/admin/organizer-applications?limit=5&page=1&sort=-createdAt"
        ).catch(() => null),
      ]);

      const groupsItems = Array.isArray(groupsRes?.items)
        ? groupsRes.items
        : Array.isArray(groupsRes?.data)
        ? groupsRes.data
        : Array.isArray(groupsRes)
        ? groupsRes
        : [];

      const eventsItems = Array.isArray(eventsRes?.items)
        ? eventsRes.items
        : Array.isArray(eventsRes)
        ? eventsRes
        : [];

      const reportsItems = Array.isArray(reportsRes?.reports)
        ? reportsRes.reports
        : Array.isArray(reportsRes)
        ? reportsRes
        : [];

      const appsItems = Array.isArray(appsRes?.apps)
        ? appsRes.apps
        : Array.isArray(appsRes)
        ? appsRes
        : [];

      const built = [
        ...groupsItems.map((g) =>
          act("group", {
            text: `New fandom group created: ${g.name || "Untitled Group"}`,
            when: g.createdAt || Date.now(),
            icon: "➕",
            color: "blue",
          })
        ),
        ...eventsItems.map((e) => {
          const t = e.approvedAt || e.updatedAt || e.createdAt || Date.now();
          return act("event", {
            text: `Event approved: ${e.title || "Untitled Event"}`,
            when: t,
            icon: "✓",
            color: "green",
          });
        }),
        ...reportsItems.map((r) =>
          act("report", {
            text: `New report: ${
              r.reportCategory || "General"
            } on ${r.reportType || "Item"}`,
            when: r.createdAt || Date.now(),
            icon: "⚠",
            color: "yellow",
          })
        ),
        ...appsItems.map((a) =>
          act("application", {
            text: `Organizer application ${
              a.status || "submitted"
            }: ${a.applicantName || a.email || a._id}`,
            when: a.createdAt || Date.now(),
            icon: a.status === "approved" ? "✓" : "📋",
            color: a.status === "approved" ? "green" : "purple",
          })
        ),
      ];

      built.sort(
        (a, b) =>
          new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );

      if (built.length) {
        setActivity(
          built.slice(0, 8).map(({ createdAt, ...rest }) => rest)
        );
        return;
      }

      // Fallback
      const derived = [];

      (groups || [])
        .slice(0, 5)
        .forEach((g) => {
          derived.push(
            act("group", {
              text: `New fandom group created: ${g.name}`,
              when: g.createdAt,
              icon: "➕",
              color: "blue",
            })
          );
        });

      (reports || [])
        .slice(0, 5)
        .forEach((r) => {
          derived.push(
            act("report", {
              text: `New report: ${
                r.reportCategory || "General"
              } on ${r.reportType || "Item"}`,
              when: r.createdAt,
              icon: "⚠",
              color: "yellow",
            })
          );
        });

      (events || [])
        .filter((e) => e.status === "approved")
        .slice(0, 5)
        .forEach((e) => {
          const t = e.approvedAt || e.updatedAt || e.createdAt;
          derived.push(
            act("event", {
              text: `Event approved: ${e.title || "Untitled Event"}`,
              when: t,
              icon: "✓",
              color: "green",
            })
          );
        });

      derived.sort(
        (a, b) =>
          new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      setActivity(
        derived.slice(0, 8).map(({ createdAt, ...rest }) => rest)
      );
    } catch (e) {
      console.error(e);
      setActivity([]);
    }
  };

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
  }, [
    activeTab,
    reportsPage,
    reportsLimit,
    reportTypeFilter,
    reportCategoryFilter,
    reportStatusFilter,
  ]);

  React.useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil((users?.length || 0) / USERS_PER_PAGE)
    );
    if (usersPage > totalPages) setUsersPage(totalPages);
  }, [users, usersPage]);

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
        const res = await api(
          `/api/admin/groups${qs.toString() ? `?${qs}` : ""}`
        ).catch(() => null);
        const groupsItems = Array.isArray(res)
          ? res
          : Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res?.data)
          ? res.data
          : [];
        setGroups(groupsItems);
      } else if (activeTab === "events") {
        const qs = new URLSearchParams();
        if (eventStatusFilter) qs.set("status", eventStatusFilter);
        qs.set("includeCounts", "1");
        const res = await api(
          `/api/admin/events${qs.toString() ? `?${qs}` : ""}`
        ).catch(() => null);
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

      const res = await api(
        `/api/admin/reports${qs.toString() ? `?${qs}` : ""}`
      ).catch(() => null);

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

  // Try a couple of likely endpoints to send notifications from admin actions
  const notifyAdminSide = async (payload) => {
    const bodies = [
      ["/api/admin/notifications", payload],
      ["/api/notifications/admin", payload],
    ];
    for (const [url, body] of bodies) {
      try {
        const res = await api(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res && (res.success || res.ok !== false)) return true;
      } catch {}
    }
    return false;
  };

  const readPath = (obj, path) =>
    path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

  const totalFromPaginated = (res, { itemsKey = "items" } = {}) => {
    if (!res) return 0;
    const pagTotal = readPath(res, "pagination.total");
    if (typeof pagTotal === "number") return pagTotal;
    const arr = res?.[itemsKey];
    if (Array.isArray(arr)) return arr.length;
    if (typeof res.total === "number") return res.total;
    return 0;
  };

  // Build a neat activity item
  const act = (type, { text, when, icon, color }) => ({
    type,
    text,
    time: formatDate(when),
    icon,
    color,
    createdAt: when,
  });

  // Push into activity immediately (optimistic UI)
  const appendActivity = (setActivityFn, item) => {
    setActivityFn((prev) => {
      const next = [{ ...item }, ...prev.map((x) => ({ ...x }))];
      next.sort(
        (a, b) =>
          new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      return next
        .slice(0, 8)
        .map(({ createdAt, ...rest }) => rest);
    });
  };

  // ------------------------
  // Actions
  // ------------------------
  const handleApproveApplication = async (id) => {
    try {
      await api(`/api/admin/organizer-applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      toast.success("Application approved");

      let app = null;
      try {
        app = await api(`/api/admin/organizer-applications/${id}`).catch(
          () => null
        );
      } catch {}
      const applicantUserId = app?.userId || app?.applicantId;
      const applicantName = app?.applicantName || app?.email || id;

      if (applicantUserId) {
        notifyAdminSide({
          toUserId: applicantUserId,
          type: "Organizer Application Approved",
          data: { applicationId: id, applicantName },
          link: `/organizer/welcome`,
        });
      }

      appendActivity(
        setActivity,
        act("application", {
          text: `Organizer application approved: ${applicantName}`,
          when: Date.now(),
          icon: "✓",
          color: "green",
        })
      );

      loadApplications();
      if (activeTab === "overview") loadRecentActivity();
    } catch (e) {
      toast.error(e?.message || "Failed to approve");
    }
  };

const notifyEventUpdated = async (eventId, title, attendeeIds = []) => {
  if (!attendeeIds || !attendeeIds.length) return;

  await notifyAdminSide({
    toManyUserIds: attendeeIds,
    type: "Event Updated",
    data: {
      eventId,
      eventTitle: title,
      message: `An event you RSVP’d to, “${title}”, has been updated. Please review the latest details.`,
    },
    link: `/events/${eventId}`,
  });
};

  const handleRejectApplication = async (id) => {
    try {
      await api(`/api/admin/organizer-applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      toast.success("Application rejected");

      let app = null;
      try {
        app = await api(`/api/admin/organizer-applications/${id}`).catch(
          () => null
        );
      } catch {}
      const applicantUserId = app?.userId || app?.applicantId;
      const applicantName = app?.applicantName || app?.email || id;

      if (applicantUserId) {
        notifyAdminSide({
          toUserId: applicantUserId,
          type: "Organizer Application Rejected",
          data: { applicationId: id, applicantName },
          link: `/organizer/application/${id}`,
        });
      }

      appendActivity(
        setActivity,
        act("application", {
          text: `Organizer application rejected: ${applicantName}`,
          when: Date.now(),
          icon: "✕",
          color: "red",
        })
      );

      loadApplications();
      if (activeTab === "overview") loadRecentActivity();
    } catch (e) {
      toast.error(e?.message || "Failed to reject");
    }
  };

  const handleWarnUser = async (userId, messageFromCaller) => {
    const msg =
      typeof messageFromCaller === "string"
        ? messageFromCaller
        : promptWarningMessage(
            "Your account has received a warning from an admin."
          );
    if (msg === null) return;

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

      let g = null;
      try {
        g = await api(`/api/admin/groups/${groupId}`).catch(() => null);
      } catch {}
      const ownerId = g?.ownerId || g?.createdBy || g?.createdById;
      const groupName = g?.name || groupId;

      if (ownerId) {
        notifyAdminSide({
          toUserId: ownerId,
          type: "Group Approved",
          data: { groupId, groupName },
          link: `/groups/${groupId}`,
        });
      }

      appendActivity(
        setActivity,
        act("group", {
          text: `Group approved: ${groupName}`,
          when: Date.now(),
          icon: "✓",
          color: "green",
        })
      );

      loadDashboardData();
      if (activeTab === "overview") loadRecentActivity();
    } catch (e) {
      toast.error(e?.message || "Failed to approve group");
    }
  };

  const handleRejectGroup = async (groupId) => {
    try {
      await api(`/api/admin/groups/${groupId}/reject`, { method: "POST" });
      toast.success("Group rejected");

      let g = null;
      try {
        g = await api(`/api/admin/groups/${groupId}`).catch(() => null);
      } catch {}
      const ownerId = g?.ownerId || g?.createdBy || g?.createdById;
      const groupName = g?.name || groupId;

      if (ownerId) {
        notifyAdminSide({
          toUserId: ownerId,
          type: "Group Rejected",
          data: { groupId, groupName },
          link: `/groups/${groupId}`,
        });
      }

      appendActivity(
        setActivity,
        act("group", {
          text: `Group rejected: ${groupName}`,
          when: Date.now(),
          icon: "✕",
          color: "red",
        })
      );

      loadDashboardData();
      if (activeTab === "overview") loadRecentActivity();
    } catch (e) {
      toast.error(e?.message || "Failed to reject group");
    }
  };

  const handleApproveEvent = async (eventId) => {
  try {
    const approveRes = await api(`/api/admin/events/${eventId}/approve`, {
      method: "POST",
    });
    toast.success("Event approved");

    // Try to load event details so we can notify the right people
    let ev = null;
    try {
      ev = await api(
        `/api/admin/events/${eventId}?include=organizer,attendees`
      ).catch(() => null);
    } catch {}

    const title =
      ev?.title ||
      ev?.name ||
      approveRes?.title ||
      approveRes?.eventTitle ||
      eventId;

    const organizerId =
      ev?.organizerId ||
      ev?.organizer?._id ||
      ev?.createdBy ||
      ev?.createdById;

    // Notify organizer that event was approved
    if (organizerId) {
      notifyAdminSide({
        toUserId: organizerId,
        type: "Event Approved",
        data: {
          eventId,
          eventTitle: title,
        },
        link: `/events/${eventId}`,
      });
    }

    // Collect RSVP’d users / attendees / subscribers
    const attendeeIds = (() => {
      if (Array.isArray(ev?.attendees)) {
        return ev.attendees
          .map((a) => a.userId || a._id || a.clerkId)
          .filter(Boolean);
      }
      if (Array.isArray(ev?.subscribers)) {
        return ev.subscribers.filter(Boolean);
      }
      if (Array.isArray(ev?.rsvps)) {
        return ev.rsvps
          .map((r) => r.userId || r._id || r.clerkId || r)
          .filter(Boolean);
      }
      if (Array.isArray(ev?.rsvpUserIds)) {
        return ev.rsvpUserIds.filter(Boolean);
      }
      return [];
    })();

    // Notify RSVP’d users that the event content was updated / approved
    await notifyEventUpdated(eventId, title, attendeeIds);

    // Add to recent activity immediately
    appendActivity(setActivity, act("event", {
      text: `Event approved: ${title}`,
      when: Date.now(),
      icon: "✓",
      color: "green",
    }));

    loadDashboardData();
    if (activeTab === "overview") loadRecentActivity();
  } catch (e) {
    toast.error(e?.message || "Failed to approve event");
  }
};


  const handleRejectEvent = async (eventId) => {
    try {
      await api(`/api/admin/events/${eventId}/reject`, { method: "POST" });
      toast.success("Event rejected");

      let ev = null;
      try {
        ev = await api(
          `/api/admin/events/${eventId}?include=organizer`
        ).catch(() => null);
      } catch {}
      const title = ev?.title || eventId;
      const organizerId =
        ev?.organizerId ||
        ev?.organizer?._id ||
        ev?.createdBy ||
        ev?.createdById;

      if (organizerId) {
        notifyAdminSide({
          toUserId: organizerId,
          type: "Event Rejected",
          data: { eventId, eventTitle: title },
          link: `/events/${eventId}`,
        });
      }

      appendActivity(
        setActivity,
        act("event", {
          text: `Event rejected: ${title}`,
          when: Date.now(),
          icon: "✕",
          color: "red",
        })
      );

      loadDashboardData();
      if (activeTab === "overview") loadRecentActivity();
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
        prev.map((r) =>
          String(r._id) === String(reportId) ? { ...r, status } : r
        )
      );
    } catch (e) {
      toast.error(e?.message || "Failed to update report status");
    }
  };

  const handleReportAction = async (action, report) => {
    const id = report?._id;
    const type = report?.reportType;
    const targetId = report?.targetId;

    try {
      switch (action) {
        case "view-target": {
          if (type === "Event") window.open(`/events/${targetId}`, "_blank");
          else if (type === "Group") window.open(`/groups/${targetId}`, "_blank");
          else if (type === "User") window.open(`/users/${targetId}`, "_blank");
          else window.open(`/`, "_blank");
          return;
        }

        case "warn-user": {
          const msg = promptWarningMessage(
            defaultWarnText(
              "account",
              report.targetName,
              report.reason || report.reportCategory
            )
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
            defaultWarnText(
              "event",
              report.targetName,
              report.reason || report.reportCategory
            )
          );
          if (msg === null) return;
          await api(`/api/admin/events/${targetId}/warn-organizer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg, reportId: id }),
          });
          toast.success("Organizer warned");
          await updateReportStatus(
            id,
            "Under Review",
            `Organizer warned: "${msg}"`
          );
          break;
        }

        // ---- GROUP actions ----
        case "warn-group": {
          const msg = promptWarningMessage(
            defaultWarnText(
              "group",
              report.targetName,
              report.reason || report.reportCategory
            )
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

        // ---- MESSAGE actions ----
        case "warn-sender": {
          const msg = promptWarningMessage(
            defaultWarnText(
              "message",
              null,
              report.reason || report.reportCategory
            )
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
          await updateReportStatus(
            id,
            "Under Review",
            `Sender warned: "${msg}"`
          );
          break;
        }
        case "delete-message": {
          await api(`/api/admin/messages/${targetId}`, {
            method: "DELETE",
          }).catch(() => {
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
      const res = await api("/api/admin/organizer-applications").catch(
        () => ({ apps: [] })
      );
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

  const pendingApplications = (applications || []).filter(
    (a) => a.status === "pending"
  );
  const totalReportPages = Math.max(
    1,
    Math.ceil((reportsTotal || 0) / reportsLimit)
  );

  // ===== Users search + pagination (client-side) =====
  const qUsers = (searchQuery || "").toLowerCase().trim();
  const filteredUsers = Array.isArray(users)
    ? users.filter((u) => {
        if (!qUsers) return true;
        const hay = [u.name, u.email, u.role, u._id]
          .filter(Boolean)
          .join(" | ")
          .toLowerCase();
        return hay.includes(qUsers);
      })
    : [];

  const totalFilteredUsers = filteredUsers.length;
  const totalUserPages = Math.max(
    1,
    Math.ceil(totalFilteredUsers / USERS_PER_PAGE)
  );
  const currentUsersPage = Math.min(usersPage, totalUserPages);
  const usersStartIndex = (currentUsersPage - 1) * USERS_PER_PAGE;
  const usersEndIndex = usersStartIndex + USERS_PER_PAGE;
  const pageUsers = filteredUsers.slice(usersStartIndex, usersEndIndex);

  // Small helper to render actions based on type
  const ReportActions = ({ report }) => {
    const type = report.reportType;
    return (
      <HStack spacing={2} flexWrap="wrap">
        <Button
          variant="link"
          colorScheme="blue"
          size="sm"
          onClick={() => handleReportAction("view-target", report)}
        >
          View
        </Button>

        {type === "User" && (
          <>
            <Button
              variant="link"
              colorScheme="yellow"
              size="sm"
              onClick={() => handleReportAction("warn-user", report)}
            >
              Warn User
            </Button>
            <Button
              variant="link"
              colorScheme="red"
              size="sm"
              onClick={() => handleReportAction("ban-user", report)}
            >
              Ban User
            </Button>
          </>
        )}

        {type === "Event" && (
          <>
            <Button
              variant="link"
              colorScheme="yellow"
              size="sm"
              onClick={() => handleReportAction("warn-organizer", report)}
            >
              Warn Organizer
            </Button>
            <Button
              variant="link"
              colorScheme="red"
              size="sm"
              onClick={() => handleReportAction("remove-event", report)}
            >
              Remove Event
            </Button>
          </>
        )}

        {type === "Group" && (
          <>
            <Button
              variant="link"
              colorScheme="yellow"
              size="sm"
              onClick={() => handleReportAction("warn-group", report)}
            >
              Warn Group
            </Button>
            <Button
              variant="link"
              colorScheme="red"
              size="sm"
              onClick={() => handleReportAction("delete-group", report)}
            >
              Delete Group
            </Button>
          </>
        )}

        {type === "Message" && (
          <>
            <Button
              variant="link"
              colorScheme="yellow"
              size="sm"
              onClick={() => handleReportAction("warn-sender", report)}
            >
              Warn Sender
            </Button>
            <Button
              variant="link"
              colorScheme="red"
              size="sm"
              onClick={() => handleReportAction("delete-message", report)}
            >
              Delete Message
            </Button>
          </>
        )}

        <Button
          variant="link"
          colorScheme="gray"
          size="sm"
          onClick={() => handleReportAction("dismiss-report", report)}
        >
          Dismiss
        </Button>
        <Button
          variant="link"
          colorScheme="green"
          size="sm"
          onClick={() => handleReportAction("resolve-report", report)}
        >
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
        <Text color="gray.600">
          Manage platform operations, users, and content
        </Text>
      </Box>

      {/* Tabs */}
      <HStack
        spacing={6}
        mb={8}
        borderBottomWidth="2px"
        borderColor="gray.200"
        overflowX="auto"
      >
        {["Overview", "Users", "Fandom Groups", "Events", "Reports"].map(
          (tab) => {
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
          }
        )}
      </HStack>

      {/* ======================= OVERVIEW TAB ======================= */}
      {activeTab === "overview" && (
        <VStack spacing={6} align="stretch">
          <Grid
            templateColumns={{
              base: "1fr",
              md: "repeat(2, 1fr)",
              lg: "repeat(4, 1fr)",
            }}
            gap={6}
          >
            <StatCard
              icon="👥"
              label="Total Users"
              value={stats.totalUsers}
              change={statsDelta.usersWeek}
              changeLabel="This week"
              color="blue"
            />
            <StatCard
              icon="👥"
              label="Fandom Groups"
              value={stats.fandomGroups}
              change={statsDelta.groupsWeek}
              changeLabel="This week"
              color="pink"
            />
            <StatCard
              icon="📅"
              label="Active Events"
              value={stats.activeEvents}
              change={statsDelta.eventsWeek}
              changeLabel="This week"
              color="green"
            />
            <StatCard
              icon="⚠"
              label="Reports"
              value={stats.reports}
              change={statsDelta.reportsWeek}
              changeLabel="This week"
              color="yellow"
            />
          </Grid>

          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
            <Card>
              <Flex justify="space-between" align="center" mb={5}>
                <Heading size="md">System Status</Heading>
              </Flex>
              <VStack spacing={4} align="stretch">
                {systemStatus.map((item) => (
                  <Flex key={item.key} justify="space-between" align="center">
                    <HStack>
                      <Box
                        w="8px"
                        h="8px"
                        borderRadius="full"
                        bg={`${item.color}.500`}
                      />
                      <Text>{item.label}</Text>
                    </HStack>
                    <Text
                      fontSize="sm"
                      fontWeight="semibold"
                      color={`${item.color}.600`}
                    >
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
                {activity.map((activityItem, idx) => (
                  <Flex key={idx} gap={3}>
                    <Box
                      bg={`${activityItem.color}.50`}
                      w="32px"
                      h="32px"
                      borderRadius="lg"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      {activityItem.icon}
                    </Box>
                    <Box flex="1">
                      <Text fontSize="sm">{activityItem.text}</Text>
                      <Text fontSize="xs" color="gray.500">
                        {activityItem.time}
                      </Text>
                    </Box>
                  </Flex>
                ))}
                {activity.length === 0 && (
                  <Text fontSize="sm" color="gray.500">
                    No recent activity
                  </Text>
                )}
              </VStack>
            </Card>
          </Grid>

          {pendingApplications.length > 0 && (
            <Card textAlign="center" py={10}>
              <Text fontSize="5xl" mb={4}>
                📋
              </Text>
              <Heading size="md" mb={4}>
                Organizer Applications
              </Heading>
              <Text color="gray.600" mb={6}>
                Review pending organizer applications and approve qualified
                candidates
              </Text>
              <Button
                colorScheme="blue"
                size="lg"
                borderRadius="full"
                onClick={() => {
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
          <Flex
            justify="space-between"
            align="center"
            mb={6}
            flexWrap="wrap"
            gap={4}
          >
            <Heading size="md">User Management</Heading>
            <Box position="relative" minW="300px">
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
          </Flex>

          {/* Desktop headers */}
          <Grid
            templateColumns="2fr 1fr 1fr 1fr 1.5fr"
            gap={4}
            pb={3}
            borderBottomWidth="1px"
            display={{ base: "none", lg: "grid" }}
          >
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

          <VStack spacing={3} mt={4} align="stretch">
            {loading && <Text color="gray.500">Loading users...</Text>}
            {!loading &&
              (() => {
                if (!filteredUsers.length) {
                  return (
                    <Text color="gray.500" textAlign="center" py={8}>
                      {searchQuery ? (
                        <>No users found for “{searchQuery}”.</>
                      ) : (
                        "No users found"
                      )}
                    </Text>
                  );
                }

                return pageUsers.map((user, idx) => {
                  const rawRole = (user.role || "user").toString();
                  const prettyRole =
                    rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
                  const roleBg = roleBadgeColor(rawRole);
                  const roleTextColor = pastelTextColor(roleBg);
                  const statusRaw = user.status || "active";
                  const prettyStatus =
                    statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);

                  if (isMobile) {
                    return (
                      <Box
                        key={user._id || idx}
                        p={4}
                        borderWidth="1px"
                        borderRadius="xl"
                        _hover={{ bg: "gray.50" }}
                      >
                        <Flex justify="space-between" align="flex-start" gap={3}>
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
                              <Text fontWeight="medium">
                                {user.name || `User ${idx + 1}`}
                              </Text>
                              <Text fontSize="sm" color="gray.600">
                                {user.email || `user${idx + 1}@example.com`}
                              </Text>
                            </Box>
                          </HStack>

                          <Badge
                            bg={roleBg}
                            color={roleTextColor}
                            borderRadius="full"
                            px={3}
                            py={1}
                            fontSize="xs"
                            fontWeight="semibold"
                          >
                            {prettyRole}
                          </Badge>
                        </Flex>

                        <Flex mt={3} justify="space-between" align="center">
                          <Box>
                            <Text fontSize="xs" color="gray.500">
                              Joined
                            </Text>
                            <Text fontSize="sm">
                              {formatDate(user.createdAt)}
                            </Text>
                          </Box>
                          <Badge
                            bg={userStatusGreenBG}
                            color={userStatusGreenText}
                            borderRadius="full"
                            px={3}
                            py={1}
                            fontSize="xs"
                            fontWeight="semibold"
                          >
                            {prettyStatus}
                          </Badge>
                        </Flex>

                        <HStack justify="flex-end" mt={3} spacing={3}>
                          <Button
                            variant="link"
                            colorScheme="yellow"
                            size="sm"
                            onClick={() => handleWarnUser(user._id)}
                          >
                            Warn
                          </Button>
                          <Button
                            variant="link"
                            colorScheme="red"
                            size="sm"
                            onClick={() => handleBanUser(user._id)}
                          >
                            Ban
                          </Button>
                        </HStack>
                      </Box>
                    );
                  }

                  // Desktop row
                  return (
                    <Grid
                      key={user._id || idx}
                      templateColumns={{
                        base: "1fr",
                        lg: "2fr 1fr 1fr 1fr 1.5fr",
                      }}
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
                          <Text fontWeight="medium">
                            {user.name || `User ${idx + 1}`}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {user.email || `user${idx + 1}@example.com`}
                          </Text>
                        </Box>
                      </HStack>

                      <Badge
                        bg={roleBg}
                        color={roleTextColor}
                        borderRadius="full"
                        px={3}
                        py={1}
                        fontSize="xs"
                        fontWeight="semibold"
                        w="fit-content"
                      >
                        {prettyRole}
                      </Badge>

                      <Text fontSize="sm">{formatDate(user.createdAt)}</Text>

                      <Badge
                        bg={userStatusGreenBG}
                        color={userStatusGreenText}
                        borderRadius="full"
                        px={3}
                        py={1}
                        fontSize="xs"
                        fontWeight="semibold"
                        w="fit-content"
                      >
                        {prettyStatus}
                      </Badge>

                      <HStack spacing={2}>
                        <Button
                          variant="link"
                          colorScheme="yellow"
                          size="sm"
                          onClick={() => handleWarnUser(user._id)}
                        >
                          Warn
                        </Button>
                        <Button
                          variant="link"
                          colorScheme="red"
                          size="sm"
                          onClick={() => handleBanUser(user._id)}
                        >
                          Ban
                        </Button>
                      </HStack>
                    </Grid>
                  );
                });
              })()}
          </VStack>

          <Flex justify="space-between" align="center" mt={6}>
            <Text fontSize="sm" color="gray.600">
              {totalFilteredUsers > 0
                ? `Showing ${
                    totalFilteredUsers === 0 ? 0 : usersStartIndex + 1
                  }-${Math.min(
                    usersEndIndex,
                    totalFilteredUsers
                  )} of ${totalFilteredUsers} users`
                : "No users"}
            </Text>
            <HStack>
              <Button
                variant="outline"
                size="sm"
                borderRadius="lg"
                onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                isDisabled={currentUsersPage <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                borderRadius="lg"
                onClick={() =>
                  setUsersPage((p) => Math.min(totalUserPages, p + 1))
                }
                isDisabled={currentUsersPage >= totalUserPages}
              >
                Next
              </Button>
            </HStack>
          </Flex>
        </Card>
      )}

      {/* ======================= FANDOM GROUPS TAB ======================= */}
      {activeTab === "fandom-groups" && (
        <Card>
          <Flex
            justify="space-between"
            align="center"
            mb={6}
            flexWrap="wrap"
            gap={4}
          >
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

          {/* Desktop headers */}
          <Grid
            templateColumns="2fr 1.5fr 1fr 1.2fr 1fr 1.6fr"
            gap={4}
            pb={3}
            borderBottomWidth="1px"
            display={{ base: "none", lg: "grid" }}
          >
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Group
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Category
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Members
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Created
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Status
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Actions
            </Text>
          </Grid>

          <VStack spacing={3} mt={4} align="stretch">
            {loading && <Text color="gray.500">Loading groups…</Text>}

            {!loading &&
              (() => {
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
                      No groups found
                      {filterStatus ? ` for status “${filterStatus}”` : ""}.
                    </Text>
                  );
                }

                return visible.map((g) => {
                  const membersCount =
                    typeof g.membersCount === "number"
                      ? g.membersCount
                      : Array.isArray(g.members)
                      ? g.members.length
                      : 0;
                  const bg = statusColor(g.status);
                  const textColor = pastelTextColor(bg);
                  const label = g.status
                    ? g.status.charAt(0).toUpperCase() + g.status.slice(1)
                    : "Unknown";

                  if (isMobile) {
                    return (
                      <Box
                        key={g._id}
                        p={4}
                        borderWidth="1px"
                        borderRadius="xl"
                        _hover={{ bg: "gray.50" }}
                      >
                        <HStack align="flex-start" spacing={3}>
                          <Box
                            w="40px"
                            h="40px"
                            borderRadius="full"
                            bg="gray.100"
                            overflow="hidden"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            flexShrink={0}
                          >
                            {g.image ? (
                              <Image
                                src={g.image}
                                alt={g.name}
                                w="40px"
                                h="40px"
                                objectFit="cover"
                              />
                            ) : (
                              <Text>👥</Text>
                            )}
                          </Box>
                          <Box flex="1" minW={0}>
                            <Text fontWeight="medium" noOfLines={1}>
                              {g.name}
                            </Text>
                            {g.tags?.length ? (
                              <Text fontSize="xs" color="gray.600" noOfLines={1}>
                                {g.tags.slice(0, 3).join(" • ")}
                                {g.tags.length > 3
                                  ? " +" + (g.tags.length - 3)
                                  : ""}
                              </Text>
                            ) : null}
                            <HStack mt={2} spacing={2} flexWrap="wrap">
                              <Badge
                                colorScheme="purple"
                                variant="subtle"
                                w="fit-content"
                                fontSize="xs"
                              >
                                {g.category || "General"}
                              </Badge>
                              <Badge
                                bg={bg}
                                color={textColor}
                                borderRadius="full"
                                px={3}
                                py={1}
                                w="fit-content"
                                fontSize="xs"
                                fontWeight="semibold"
                              >
                                {label}
                              </Badge>
                            </HStack>
                          </Box>
                        </HStack>

                        <Flex mt={3} justify="space-between" align="center">
                          <Box>
                            <Text fontSize="xs" color="gray.500">
                              Members
                            </Text>
                            <Text fontWeight="semibold">
                              {membersCount.toLocaleString()}
                            </Text>
                          </Box>
                          <Box textAlign="right">
                            <Text fontSize="xs" color="gray.500">
                              Created
                            </Text>
                            <Text fontSize="sm">
                              {formatDate(g.createdAt)}
                            </Text>
                          </Box>
                        </Flex>

                        <HStack mt={3} spacing={3} justify="flex-end">
                          <Button
                            variant="link"
                            colorScheme="blue"
                            size="sm"
                            onClick={() =>
                              window.open(`/groups/${g._id}`, "_blank")
                            }
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
                      </Box>
                    );
                  }

                  // Desktop row
                  return (
                    <Grid
                      key={g._id}
                      templateColumns={{
                        base: "1fr",
                        lg: "2fr 1.5fr 1fr 1.2fr 1fr 1.6fr",
                      }}
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
                            <Image
                              src={g.image}
                              alt={g.name}
                              w="40px"
                              h="40px"
                              objectFit="cover"
                            />
                          ) : (
                            <Text>👥</Text>
                          )}
                        </Box>
                        <Box>
                          <Text fontWeight="medium" noOfLines={1}>
                            {g.name}
                          </Text>
                          {g.tags?.length ? (
                            <Text
                              fontSize="xs"
                              color="gray.600"
                              noOfLines={1}
                            >
                              {g.tags.slice(0, 3).join(" • ")}
                              {g.tags.length > 3
                                ? " +" + (g.tags.length - 3)
                                : ""}
                            </Text>
                          ) : null}
                        </Box>
                      </HStack>

                      <Badge
                        colorScheme="purple"
                        variant="subtle"
                        w="fit-content"
                      >
                        {g.category || "General"}
                      </Badge>

                      <Text fontWeight="semibold">
                        {membersCount.toLocaleString()}
                      </Text>

                      <Text fontSize="sm">{formatDate(g.createdAt)}</Text>

                      <Badge
                        bg={bg}
                        color={textColor}
                        borderRadius="full"
                        px={3}
                        py={1}
                        w="fit-content"
                        fontSize="xs"
                        fontWeight="semibold"
                      >
                        {label}
                      </Badge>

                      <HStack spacing={2}>
                        <Button
                          variant="link"
                          colorScheme="blue"
                          size="sm"
                          onClick={() =>
                            window.open(`/groups/${g._id}`, "_blank")
                          }
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
                  );
                });
              })()}
          </VStack>

          <Flex justify="space-between" align="center" mt={6}>
            <Text fontSize="sm" color="gray.600">
              {groups?.length ? `Showing ${groups.length} groups` : "No groups"}
            </Text>
            <HStack>
              <Button
                variant="outline"
                size="sm"
                borderRadius="lg"
                onClick={loadDashboardData}
              >
                Refresh
              </Button>
            </HStack>
          </Flex>
        </Card>
      )}

      {/* ======================= EVENTS TAB ======================= */}
      {activeTab === "events" && (
        <Card>
          <Flex
            justify="space-between"
            align="center"
            mb={6}
            flexWrap="wrap"
            gap={4}
          >
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

          {/* Desktop headers */}
          <Grid
            templateColumns="2fr 1.5fr 1.2fr 1fr 1fr 1.6fr"
            gap={4}
            pb={3}
            borderBottomWidth="1px"
            display={{ base: "none", lg: "grid" }}
          >
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Event
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Organizer
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Date
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Attendees
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Status
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Actions
            </Text>
          </Grid>

          <VStack spacing={3} mt={4} align="stretch">
            {loading && <Text color="gray.500">Loading events…</Text>}

            {!loading &&
              (() => {
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
                      No events found
                      {eventStatusFilter
                        ? ` for status “${eventStatusFilter}”`
                        : ""}.
                    </Text>
                  );
                }

                return visible.map((ev) => {
                  const eventDate =
                    ev.startAt ||
                    ev.date ||
                    ev.startsAt ||
                    ev.startDate ||
                    ev.scheduledAt;
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

                  const bg = statusColor(ev.status);
                  const textColor = pastelTextColor(bg);
                  const label = (ev.status || "pending").replace(
                    /^./,
                    (c) => c.toUpperCase()
                  );

                  if (isMobile) {
                    return (
                      <Box
                        key={ev._id}
                        p={4}
                        borderWidth="1px"
                        borderRadius="xl"
                        _hover={{ bg: "gray.50" }}
                      >
                        <HStack align="flex-start" spacing={3}>
                          <Box
                            w="44px"
                            h="44px"
                            borderRadius="lg"
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
                                w="44px"
                                h="44px"
                                objectFit="cover"
                                loading="lazy"
                              />
                            ) : (
                              <Text>📅</Text>
                            )}
                          </Box>
                          <Box flex="1" minW={0}>
                            <Text fontWeight="medium" noOfLines={1}>
                              {ev.title || "Untitled Event"}
                            </Text>
                            {(ev.city || ev.locationName) && (
                              <Text
                                fontSize="xs"
                                color="gray.600"
                                noOfLines={1}
                              >
                                {ev.locationName || ev.city}
                              </Text>
                            )}
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              {organizerName}
                            </Text>
                          </Box>
                          <Badge
                            bg={bg}
                            color={textColor}
                            borderRadius="full"
                            px={3}
                            py={1}
                            fontSize="xs"
                            fontWeight="semibold"
                          >
                            {label}
                          </Badge>
                        </HStack>

                        <Flex mt={3} justify="space-between" align="center">
                          <Box>
                            <Text fontSize="xs" color="gray.500">
                              Date
                            </Text>
                            <Text fontSize="sm">
                              {eventDate
                                ? new Date(eventDate).toLocaleDateString()
                                : "—"}
                            </Text>
                          </Box>
                          <Box textAlign="right">
                            <Text fontSize="xs" color="gray.500">
                              Attendees
                            </Text>
                            <Text fontWeight="semibold">{attendees}</Text>
                          </Box>
                        </Flex>

                        <HStack mt={3} spacing={3} justify="flex-end">
                          <Button
                            variant="link"
                            colorScheme="blue"
                            size="sm"
                            onClick={() =>
                              window.open(`/events/${ev._id}`, "_blank")
                            }
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
                      </Box>
                    );
                  }

                  // Desktop row
                  return (
                    <Grid
                      key={ev._id}
                      templateColumns={{
                        base: "1fr",
                        lg: "2fr 1.5fr 1.2fr 1fr 1fr 1.6fr",
                      }}
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
                          <Text fontWeight="medium" noOfLines={1}>
                            {ev.title || "Untitled Event"}
                          </Text>
                          {(ev.city || ev.locationName) && (
                            <Text
                              fontSize="xs"
                              color="gray.600"
                              noOfLines={1}
                            >
                              {ev.locationName || ev.city}
                            </Text>
                          )}
                        </Box>
                      </HStack>

                      <Text fontSize="sm" noOfLines={1}>
                        {organizerName}
                      </Text>
                      <Text fontSize="sm">
                        {eventDate
                          ? new Date(eventDate).toLocaleDateString()
                          : "—"}
                      </Text>
                      <Text fontWeight="semibold">{attendees}</Text>

                      <Badge
                        bg={bg}
                        color={textColor}
                        borderRadius="full"
                        px={3}
                        py={1}
                        w="fit-content"
                        fontSize="xs"
                        fontWeight="semibold"
                      >
                        {label}
                      </Badge>

                      <HStack spacing={2}>
                        <Button
                          variant="link"
                          colorScheme="blue"
                          size="sm"
                          onClick={() =>
                            window.open(`/events/${ev._id}`, "_blank")
                          }
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
              <Button
                variant="outline"
                size="sm"
                borderRadius="lg"
                onClick={loadDashboardData}
              >
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

          {/* Filters */}
          <Flex gap={3} wrap="wrap" mb={4}>
            <Box
              as="select"
              value={reportTypeFilter}
              onChange={(e) => {
                setReportTypeFilter(e.target.value);
                setReportsPage(1);
              }}
              borderWidth="1px"
              borderRadius="full"
              px={3}
              py={2}
              minW="180px"
            >
              <option value="">All types</option>
              <option value="User">User</option>
              <option value="Group">Group</option>
              <option value="Event">Event</option>
              <option value="Message">Message</option>
            </Box>

            <Box
              as="select"
              value={reportCategoryFilter}
              onChange={(e) => {
                setReportCategoryFilter(e.target.value);
                setReportsPage(1);
              }}
              borderWidth="1px"
              borderRadius="full"
              px={3}
              py={2}
              minW="200px"
            >
              <option value="">All categories</option>
              <option value="Harassment">Harassment</option>
              <option value="Spam">Spam</option>
              <option value="Misinformation">Misinformation</option>
              <option value="Hate">Hate</option>
              <option value="Scam/Fraud">Scam/Fraud</option>
              <option value="Sexual Content">Sexual Content</option>
              <option value="Violence">Violence</option>
              <option value="Other">Other</option>
            </Box>

            <Box
              as="select"
              value={reportStatusFilter}
              onChange={(e) => {
                setReportStatusFilter(e.target.value);
                setReportsPage(1);
              }}
              borderWidth="1px"
              borderRadius="full"
              px={3}
              py={2}
              minW="200px"
            >
              <option value="">All statuses</option>
              <option value="Open">Open</option>
              <option value="Under Review">Under Review</option>
              <option value="Resolved">Resolved</option>
              <option value="Dismissed">Dismissed</option>
            </Box>

            <Box
              as="select"
              value={reportsLimit}
              onChange={(e) => {
                setReportsLimit(Number(e.target.value) || 20);
                setReportsPage(1);
              }}
              borderWidth="1px"
              borderRadius="full"
              px={3}
              py={2}
              minW="120px"
            >
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
            </Box>

            <Button
              variant="outline"
              onClick={() => {
                setReportTypeFilter("");
                setReportCategoryFilter("");
                setReportStatusFilter("");
                setReportsPage(1);
              }}
            >
              Clear
            </Button>
          </Flex>

          {/* Desktop header */}
          <Grid
            templateColumns="1.2fr 1.2fr 2fr 1.2fr 1fr 1.8fr"
            gap={4}
            pb={3}
            borderBottomWidth="1px"
            display={{ base: "none", lg: "grid" }}
          >
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Target
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Type / Category
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Reason
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Reported By
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Status
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.600">
              Actions
            </Text>
          </Grid>

          {/* Rows */}
          <VStack spacing={3} mt={4} align="stretch">
            {reportsLoading && (
              <Text color="gray.500">Loading reports…</Text>
            )}
            {!reportsLoading && reports.length === 0 && (
              <Text color="gray.500" textAlign="center" py={8}>
                No reports found
              </Text>
            )}
            {!reportsLoading &&
              reports.map((r) => {
                const bg = reportStatusColor(r.status);
                const textColor = pastelTextColor(bg);

                if (isMobile) {
                  return (
                    <Box
                      key={r._id}
                      p={4}
                      borderWidth="1px"
                      borderRadius="xl"
                      _hover={{ bg: "gray.50" }}
                    >
                      <Flex justify="space-between" align="flex-start" gap={3}>
                        <Box flex="1" minW={0}>
                          <Text fontWeight="medium" noOfLines={1}>
                            {r.targetName || r.targetId}
                          </Text>
                          <Text fontSize="xs" color="gray.500" noOfLines={1}>
                            ID: {r.targetId}
                          </Text>
                          <HStack spacing={2} mt={2} flexWrap="wrap">
                            <Badge
                              borderRadius="full"
                              px={3}
                              py={1}
                              fontSize="xs"
                            >
                              {r.reportType}
                            </Badge>
                            {r.reportCategory && (
                              <Badge
                                variant="subtle"
                                colorScheme="purple"
                                borderRadius="full"
                                px={3}
                                py={1}
                                fontSize="xs"
                              >
                                {r.reportCategory}
                              </Badge>
                            )}
                          </HStack>
                        </Box>
                        <Badge
                          bg={bg}
                          color={textColor}
                          borderRadius="full"
                          px={3}
                          py={1}
                          fontSize="xs"
                          fontWeight="semibold"
                        >
                          {r.status}
                        </Badge>
                      </Flex>

                      <Box mt={3}>
                        <Text fontSize="xs" color="gray.500">
                          Reason
                        </Text>
                        <Text fontSize="sm" noOfLines={3}>
                          {r.reason}
                        </Text>
                      </Box>

                      <Flex mt={3} justify="space-between" align="flex-end">
                        <Box>
                          <Text fontSize="xs" color="gray.500">
                            Reported by
                          </Text>
                          <Text fontSize="sm" noOfLines={1}>
                            {r.reporterName || "—"}
                          </Text>
                          <Text
                            fontSize="xs"
                            color="gray.600"
                            noOfLines={1}
                          >
                            {r.reporterEmail || "—"}
                          </Text>
                          <Text fontSize="xs" color="gray.500" mt={1}>
                            {formatDate(r.createdAt)}
                          </Text>
                        </Box>
                      </Flex>

                      <Box mt={3}>
                        <ReportActions report={r} />
                      </Box>
                    </Box>
                  );
                }

                // Desktop row
                return (
                  <Grid
                    key={r._id}
                    templateColumns={{
                      base: "1fr",
                      lg: "1.2fr 1.2fr 2fr 1.2fr 1fr 1.8fr",
                    }}
                    gap={4}
                    alignItems="start"
                    p={4}
                    borderWidth="1px"
                    borderRadius="xl"
                    _hover={{ bg: "gray.50" }}
                  >
                    <Box>
                      <Text fontWeight="medium" noOfLines={1}>
                        {r.targetName || r.targetId}
                      </Text>
                      <Text fontSize="xs" color="gray.500" noOfLines={1}>
                        ID: {r.targetId}
                      </Text>
                    </Box>

                    <Box>
                      <Text fontSize="sm" noOfLines={1}>
                        {r.reportType}
                      </Text>
                      <Text fontSize="xs" color="gray.600" noOfLines={1}>
                        {r.reportCategory || "—"}
                      </Text>
                    </Box>

                    <Text fontSize="sm" noOfLines={3}>
                      {r.reason}
                    </Text>

                    <Box>
                      <Text fontSize="sm" noOfLines={1}>
                        {r.reporterName || "—"}
                      </Text>
                      <Text fontSize="xs" color="gray.600" noOfLines={1}>
                        {r.reporterEmail || "—"}
                      </Text>
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        {formatDate(r.createdAt)}
                      </Text>
                    </Box>

                    <Badge
                      bg={bg}
                      color={textColor}
                      borderRadius="full"
                      px={3}
                      py={1}
                      w="fit-content"
                      fontSize="xs"
                      fontWeight="semibold"
                    >
                      {r.status}
                    </Badge>

                    <ReportActions report={r} />
                  </Grid>
                );
              })}
          </VStack>

          {/* Pagination */}
          <Flex justify="space-between" align="center" mt={6}>
            <Text fontSize="sm" color="gray.600">
              {reportsTotal
                ? `Showing page ${reportsPage} of ${totalReportPages} (${reportsTotal} total)`
                : "No reports"}
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
                onClick={() =>
                  setReportsPage((p) => Math.min(totalReportPages, p + 1))
                }
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
