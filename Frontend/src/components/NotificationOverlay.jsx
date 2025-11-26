// src/components/NotificationOverlay.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Text,
  IconButton,
  Button,
  Spinner,
  Flex,
  HStack,
  Badge,
  Icon,
} from "@chakra-ui/react";
import {
  X,
  Bell,
  AlertTriangle,
  Flag,
  CheckCircle2,
  Info,
  Trash2,
  ExternalLink,
  Users,
  Calendar,
} from "lucide-react";
import { api } from "@/lib/api";

/* ---------- Helpers ---------- */
function timeAgo(iso) {
  try {
    const d = new Date(iso);
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const dys = Math.floor(h / 24);
    if (dys < 7) return `${dys}d ago`;
    return d.toLocaleString();
  } catch {
    return "";
  }
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function ColorDot({ color = "gray" }) {
  const map = {
    gray: "gray.400",
    pink: "pink.500",
    yellow: "yellow.500",
    red: "red.500",
    green: "green.500",
    purple: "purple.500",
    blue: "blue.500",
  };
  return <Box w="8px" h="8px" borderRadius="full" bg={map[color] || map.gray} />;
}

/* ---------- Shape a notification into display-friendly data ---------- */
function shapeNotification(n) {
  const typeStr = (n?.type || "").toLowerCase();
  const data = typeof n?.data === "string" ? safeParse(n.data) : n?.data || {};
  const link = n?.link;

  // Common friendly fields
  const eventTitle = data?.eventTitle || data?.title || data?.name;
  const groupName = data?.groupName || data?.name || data?.group;
  const applicantName = data?.applicantName || data?.applicant || data?.name;

  const isWarning =
    typeStr.includes("warning") ||
    (data?.kind && String(data.kind).toLowerCase().includes("warning"));

  // Prefer admin-written message fields over raw JSON
  const messageText =
    data?.adminMessage ??
    data?.warningMessage ??
    data?.note ??
    data?.message ??
    (typeof n?.data === "string" && !safeParse(n.data) ? n.data : null) ??
    "";

  const groupHref = data?.groupId ? `/groups/${data.groupId}` : null;
  const eventHref = data?.eventId ? `/events/${data.eventId}` : null;
  const messageHref =
    data?.messageUrl
      ? data.messageUrl
      : data?.messageId
      ? `/messages/${data.messageId}`
      : data?.threadId
      ? `/messages/thread/${data.threadId}`
      : null;

  const commonBody = messageText || "";

  const common = {
    icon: <Info size={18} />,
    color: "gray",
    title: n?.type || "Notification",
    body: commonBody,
    link,
    isWarning,
    groupHref,
    eventHref,
    messageHref,
    rawData: data,
  };

  /* ---------- Specific types with nice sentences ---------- */

  // Welcome
  if (typeStr.includes("welcome")) {
    return {
      ...common,
      icon: <Bell size={18} />,
      color: "pink",
      title: "Welcome to Fanevent 🎉",
      body:
        common.body ||
        "Welcome to Fanevent! Start exploring events and fandom groups tailored for you.",
    };
  }

    // Event reminders
  if (typeStr.includes("reminder")) {
    return {
      ...common,
      icon: <Calendar size={18} />,
      color: "blue",
      title: `Event Reminder${eventTitle ? ` · ${eventTitle}` : ""}`,
      body:
        common.body ||
        (eventTitle
          ? `Reminder: “${eventTitle}” is starting soon.`
          : "Reminder: An event you’re attending is starting soon."),
    };
  }


  // Group moderation
  if (typeStr.includes("group") && typeStr.includes("warning")) {
    return {
      ...common,
      icon: <AlertTriangle size={18} />,
      color: "yellow",
      title: `Group Warning${groupName ? ` · ${groupName}` : ""}`,
      body:
        common.body ||
        (groupName
          ? `Your group “${groupName}” has received a warning from an admin. Please review the message and our guidelines.`
          : "Your group has received a warning from an admin. Please review the message and our guidelines."),
    };
  }

  if (
    typeStr.includes("group") &&
    (typeStr.includes("removed") || typeStr.includes("deleted"))
  ) {
    return {
      ...common,
      icon: <Trash2 size={18} />,
      color: "red",
      title: `Group Removed${groupName ? ` · ${groupName}` : ""}`,
      body:
        common.body ||
        (groupName
          ? `Your group “${groupName}” has been removed by an admin.`
          : "A group you manage has been removed by an admin."),
    };
  }

  if (typeStr.includes("group") && typeStr.includes("approved")) {
    return {
      ...common,
      icon: <CheckCircle2 size={18} />,
      color: "green",
      title: `Group Approved${groupName ? ` · ${groupName}` : ""}`,
      body:
        common.body ||
        (groupName
          ? `Your group “${groupName}” has been approved and is now visible to other fans.`
          : "Your group has been approved and is now visible to other fans."),
    };
  }

  if (typeStr.includes("group") && typeStr.includes("rejected")) {
    return {
      ...common,
      icon: <AlertTriangle size={18} />,
      color: "red",
      title: `Group Rejected${groupName ? ` · ${groupName}` : ""}`,
      body:
        common.body ||
        (groupName
          ? `Your group “${groupName}” was not approved. Please review the guidelines and update your group.`
          : "Your group was not approved. Please review the guidelines and update your group."),
    };
  }

  // Account / organizer warnings
  if (typeStr.includes("user") && typeStr.includes("warning")) {
    return {
      ...common,
      icon: <Flag size={18} />,
      color: "yellow",
      title: "Account Warning",
      body:
        common.body ||
        "Your account has received a warning from an admin. Please review the message and our Community Guidelines.",
    };
  }

  if (typeStr.includes("organizer") && typeStr.includes("warning")) {
    return {
      ...common,
      icon: <Flag size={18} />,
      color: "yellow",
      title: "Organizer Warning",
      body:
        common.body ||
        "Your organizer account has received a warning from an admin. Please review the message and our Organizer Guidelines.",
    };
  }

  // Event-specific warning
  if (typeStr.includes("event") && typeStr.includes("warning")) {
    return {
      ...common,
      icon: <AlertTriangle size={18} />,
      color: "yellow",
      title: `Event Warning${eventTitle ? ` · ${eventTitle}` : ""}`,
      body:
        common.body ||
        (eventTitle
          ? `Your event “${eventTitle}” has received a warning from an admin. Please review the message and our guidelines.`
          : "Your event has received a warning from an admin. Please review the message and our guidelines."),
    };
  }

    // Announcements (sent to RSVP'd users)
  if (typeStr.includes("announcement")) {
    const organizerName = data?.organizerName;
    const organizerId = data?.organizerId;
    const fromLabel =
      organizerName || (organizerId ? `@${organizerId}` : null);

    return {
      ...common,
      icon: <Info size={18} />,
      color: "blue",
      title: `New Announcement${
        eventTitle
          ? ` · ${eventTitle}`
          : data?.title
          ? ` · ${data.title}`
          : ""
      }`,
      body:
        common.body ||
        data?.message ||
        data?.content ||
        (fromLabel
          ? `You have a new announcement from ${fromLabel}.`
          : "You have a new announcement from an organizer."),
    };
  }


  // Organizer application
  if (
    typeStr.includes("organizer") &&
    typeStr.includes("application") &&
    typeStr.includes("approved")
  ) {
    return {
      ...common,
      icon: <CheckCircle2 size={18} />,
      color: "green",
      title: `Organizer Application Approved${
        applicantName ? ` · ${applicantName}` : ""
      }`,
      body:
        common.body ||
        "Your organizer application was approved. You now have access to organizer tools for creating and managing events.",
    };
  }

  if (
    typeStr.includes("organizer") &&
    typeStr.includes("application") &&
    typeStr.includes("rejected")
  ) {
    return {
      ...common,
      icon: <AlertTriangle size={18} />,
      color: "red",
      title: `Organizer Application Rejected${
        applicantName ? ` · ${applicantName}` : ""
      }`,
      body:
        common.body ||
        "Your organizer application was not approved. Please review the feedback and our guidelines before re-applying.",
    };
  }

  // Events – removed / deleted
  if (
    typeStr.includes("event") &&
    (typeStr.includes("removed") || typeStr.includes("deleted"))
  ) {
    return {
      ...common,
      icon: <Trash2 size={18} />,
      color: "red",
      title: `Event Removed${eventTitle ? ` · ${eventTitle}` : ""}`,
      body:
        common.body ||
        (eventTitle
          ? `Your event “${eventTitle}” has been removed by an admin.`
          : "An event you created has been removed by an admin."),
    };
  }

  // Events – approved (organizer)
  if (typeStr.includes("event") && typeStr.includes("approved")) {
    return {
      ...common,
      icon: <CheckCircle2 size={18} />,
      color: "green",
      title: `Event Approved${eventTitle ? ` · ${eventTitle}` : ""}`,
      body:
        common.body ||
        (eventTitle
          ? `Your event “${eventTitle}” was approved and is now live.`
          : "Your event was approved and is now live."),
    };
  }

  // Events – rejected (organizer)
  if (typeStr.includes("event") && typeStr.includes("rejected")) {
    return {
      ...common,
      icon: <AlertTriangle size={18} />,
      color: "red",
      title: `Event Rejected${eventTitle ? ` · ${eventTitle}` : ""}`,
      body:
        common.body ||
        (eventTitle
          ? `Your event “${eventTitle}” was not approved. Please review the message and update the event.`
          : "Your event was not approved. Please review the message and update the event."),
    };
  }

  // Events – updated (RSVP’d users)
  if (typeStr.includes("event") && typeStr.includes("updated")) {
    return {
      ...common,
      icon: <Calendar size={18} />,
      color: "blue",
      title: `Event Updated${eventTitle ? ` · ${eventTitle}` : ""}`,
      body:
        common.body ||
        (eventTitle
          ? `An event you RSVP’d to, “${eventTitle}”, has been updated. Please review the latest details.`
          : "An event you RSVP’d to has been updated. Please review the latest details."),
    };
  }

  // Reports
  if (typeStr.includes("report")) {
    return {
      ...common,
      icon: <Flag size={18} />,
      color: "purple",
      title: n?.type || "Report Update",
      body:
        common.body ||
        "There has been an update on a report you’re involved with.",
    };
  }

  // Fallback – pretty-print key/value if no body
  if (!common.body && Object.keys(data || {}).length) {
    return {
      ...common,
      body: Object.entries(data)
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join("\n"),
    };
  }

  return common;
}

/* ---------- Component ---------- */
export default function NotificationOverlay({ isOpen, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inline “panel” state
  const [inspected, setInspected] = useState(null); // raw notification
  const [shapedInspected, setShapedInspected] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api("/api/notifications");
        if (mounted) {
          setItems(res.notifications || res.data?.notifications || []);
        }
      } catch {
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const handleClose = async () => {
    try {
      await api("/api/notifications/read", { method: "DELETE" });
    } catch {}
    if (onClose) onClose();
  };

  const unreadCount = useMemo(
    () => items.filter((i) => !i.read).length,
    [items]
  );

  const openInspector = (n) => {
    setInspected(n);
    setShapedInspected(shapeNotification(n));
  };

  const closeInspector = () => {
    setInspected(null);
    setShapedInspected(null);
  };

  const markInspectedRead = async () => {
    if (!inspected?._id) return;
    try {
      await api(`/api/notifications/${inspected._id}/read`, {
        method: "PATCH",
      });
      setItems((prev) =>
        prev.map((i) => (i._id === inspected._id ? { ...i, read: true } : i))
      );
      inspected.read = true;
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={100}
      bg="blackAlpha.300"
      backdropFilter="blur(6px)"
      onClick={handleClose}
    >
      {/* WRAPPER: single anchor, inspector stacked ABOVE list */}
      <Box
        position="absolute"
        top={{ base: "6%", md: "10%" }}
        right={{ base: "4%", md: "8%" }}
        w={{ base: "92%", md: "440px" }}
        maxW="94vw"
        onClick={(e) => e.stopPropagation()}
        zIndex={100}
      >
        {/* INSPECTOR CARD — appears ABOVE list when open */}
        {inspected && (
          <Box bg="white" borderRadius="2xl" boxShadow="xl" mb={3} p={0}>
            <Flex align="center" justify="space-between" px={5} py={4}>
              <HStack>
                <AlertTriangle size={18} />
                <Text fontSize="lg" fontWeight="bold">
                  Warning Details
                </Text>
                <Badge colorScheme="yellow" borderRadius="full">
                  Warning
                </Badge>
              </HStack>
              <HStack>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await markInspectedRead();
                    closeInspector();
                  }}
                >
                  Mark read &amp; close
                </Button>
                <IconButton
                  aria-label="Close inspector"
                  icon={<X size={18} />}
                  size="sm"
                  onClick={closeInspector}
                />
              </HStack>
            </Flex>
            <Box h="1px" bg="gray.100" />
            <Box px={5} py={4}>
              {shapedInspected ? (
                <>
                  <HStack spacing={3} mb={2}>
                    <ColorDot color={shapedInspected.color} />
                    <Text fontSize="sm" color="gray.600">
                      {inspected?.type}
                    </Text>
                    <Text ml="auto" fontSize="xs" color="gray.500">
                      {timeAgo(inspected?.createdAt)}
                    </Text>
                  </HStack>

                  {shapedInspected?.rawData?.groupName && (
                    <HStack fontSize="sm" color="gray.700" mb={1}>
                      <Users size={16} />
                      <Text>
                        Group:{" "}
                        <strong>{shapedInspected.rawData.groupName}</strong>
                      </Text>
                    </HStack>
                  )}

                  {shapedInspected?.rawData?.eventTitle && (
                    <HStack fontSize="sm" color="gray.700" mb={1}>
                      <Calendar size={16} />
                      <Text>
                        Event:{" "}
                        <strong>{shapedInspected.rawData.eventTitle}</strong>
                      </Text>
                    </HStack>
                  )}

                  {shapedInspected?.rawData?.reason && (
                    <Box mt={2}>
                      <Text fontWeight="semibold" mb={1}>
                        Reason
                      </Text>
                      <Text fontSize="sm" color="gray.800">
                        {shapedInspected.rawData.reason}
                      </Text>
                    </Box>
                  )}

                  <Box mt={3}>
                    <Text fontWeight="semibold" mb={1}>
                      Message from Admin
                    </Text>
                    <Box
                      bg="pink.50"
                      border="1px solid"
                      borderColor="pink.100"
                      borderRadius="md"
                      p={3}
                    >
                      <Text whiteSpace="pre-wrap" color="gray.900">
                        {shapedInspected.body || "—"}
                      </Text>
                    </Box>
                  </Box>
                </>
              ) : (
                <Spinner />
              )}
            </Box>

            <Box h="1px" bg="gray.100" />
            <Flex align="center" justify="flex-end" gap={2} px={5} py={3}>
              {shapedInspected?.groupHref && (
                <Button
                  size="sm"
                  leftIcon={<Users size={14} />}
                  variant="outline"
                  onClick={() =>
                    (window.location.href = shapedInspected.groupHref)
                  }
                >
                  Open Group
                </Button>
              )}
              {shapedInspected?.eventHref && (
                <Button
                  size="sm"
                  leftIcon={<Calendar size={14} />}
                  variant="outline"
                  onClick={() =>
                    (window.location.href = shapedInspected.eventHref)
                  }
                >
                  View Event
                </Button>
              )}
              {shapedInspected?.messageHref && (
                <Button
                  size="sm"
                  rightIcon={<ExternalLink size={14} />}
                  colorScheme="pink"
                  bg="pink.500"
                  _hover={{ bg: "pink.600" }}
                  color="white"
                  onClick={() => {
                    const href = shapedInspected.messageHref;
                    if (href.startsWith("http")) {
                      window.open(href, "_blank", "noreferrer");
                    } else {
                      window.location.href = href;
                    }
                  }}
                >
                  View Message Thread
                </Button>
              )}
              <Button size="sm" onClick={closeInspector}>
                Close
              </Button>
            </Flex>
          </Box>
        )}

        {/* LIST CARD */}
        <Flex
          bg="white"
          borderRadius="2xl"
          boxShadow="xl"
          flexDir="column"
          p={0}
        >
          {/* Header */}
          <Flex align="center" justify="space-between" px={5} py={4}>
            <HStack>
              <Bell size={18} />
              <Text fontSize="lg" fontWeight="bold">
                Notifications
              </Text>
              {unreadCount > 0 && (
                <Badge colorScheme="pink" borderRadius="full">
                  {unreadCount} new
                </Badge>
              )}
            </HStack>
            <HStack>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    await api("/api/notifications/mark-all-read", {
                      method: "POST",
                    });
                    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
                  } catch {}
                }}
              >
                Mark all read
              </Button>
<Button
  aria-label="Close"
  size="sm"
  onClick={handleClose}
  bg="pink.500"
  _hover={{ bg: "pink.600" }}
  color="white"
  px={2}
  minW="auto"
>
  <X size={16} />
</Button>


            </HStack>
          </Flex>
          <Box h="1px" bg="gray.100" />

          {/* Body */}
          {loading ? (
            <Box textAlign="center" py={10}>
              <Spinner />
            </Box>
          ) : items.length === 0 ? (
            <Box py={8} textAlign="center" color="gray.500">
              No notifications yet.
            </Box>
          ) : (
            <Box px={4} py={3} maxH="70vh" overflowY="auto">
              {items.map((n, idx) => {
                const shaped = shapeNotification(n);
                const isLast = idx === items.length - 1;

                const hasNav =
                  shaped.link ||
                  shaped.groupHref ||
                  shaped.eventHref ||
                  shaped.messageHref;

                const handlePrimaryClick = () => {
                  if (shaped.isWarning) {
                    openInspector(n);
                  } else if (shaped.messageHref) {
                    window.location.href = shaped.messageHref;
                  } else if (shaped.groupHref) {
                    window.location.href = shaped.groupHref;
                  } else if (shaped.eventHref) {
                    window.location.href = shaped.eventHref;
                  } else if (shaped.link) {
                    if (String(shaped.link).startsWith("http")) {
                      window.open(shaped.link, "_blank", "noreferrer");
                    } else {
                      window.location.href = shaped.link;
                    }
                  }
                };

                return (
                  <Box
                    key={n._id || idx}
                    bg={n.read ? "gray.50" : "pink.50"}
                    border="1px solid"
                    borderColor={n.read ? "gray.100" : "pink.100"}
                    borderRadius="md"
                    p={3.5}
                    mb={isLast ? 0 : 3}
                  >
                    <HStack align="start" spacing={3}>
                      <Box
                        bg={`${shaped.color}.50`}
                        border="1px solid"
                        borderColor={`${shaped.color}.100`}
                        w="34px"
                        h="34px"
                        borderRadius="md"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        flexShrink={0}
                      >
                        {shaped.icon}
                      </Box>

                      <Box flex="1" minW={0}>
                        <HStack spacing={2} mb={0.5}>
                          <Text fontWeight="semibold" noOfLines={1}>
                            {shaped.title}
                          </Text>
                          {!n.read && (
                            <HStack spacing={1}>
                              <Box
                                w="8px"
                                h="8px"
                                borderRadius="full"
                                bg="pink.500"
                              />
                              <Badge
                                size="xs"
                                colorScheme="pink"
                                variant="subtle"
                                borderRadius="full"
                              >
                                New
                              </Badge>
                            </HStack>
                          )}
                        </HStack>

                        {shaped.body && (
                          <Text
                            mt={0.5}
                            fontSize="sm"
                            color="gray.800"
                            whiteSpace="pre-wrap"
                          >
                            {shaped.body}
                          </Text>
                        )}

                        {shaped.rawData?.organizerName && (
                          <Text mt={1} fontSize="xs" color="gray.600">
                            From: {shaped.rawData.organizerName}
                          </Text>
                        )}


                        <HStack mt={2} spacing={2} flexWrap="wrap">
                          {hasNav && (
                            <Button
                              size="xs"
                              rightIcon={<ExternalLink size={14} />}
                              colorScheme="pink"
                              bg="pink.500"
                              _hover={{ bg: "pink.600" }}
                              variant="solid"
                              color="white"
                              onClick={handlePrimaryClick}
                            >
                              {shaped.isWarning ? "View Warning" : "Open"}
                            </Button>
                          )}

                          {!n.read && (
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={async () => {
                                try {
                                  await api(
                                    `/api/notifications/${n._id}/read`,
                                    { method: "PATCH" }
                                  );
                                  setItems((prev) =>
                                    prev.map((i) =>
                                      i._id === n._id
                                        ? { ...i, read: true }
                                        : i
                                    )
                                  );
                                } catch {}
                              }}
                            >
                              Mark read
                            </Button>
                          )}

                          <Button
                            size="xs"
                            variant="ghost"
                            leftIcon={<Trash2 size={14} />}
                            onClick={async () => {
                              try {
                                await api(`/api/notifications/${n._id}`, {
                                  method: "DELETE",
                                });
                                setItems((prev) =>
                                  prev.filter((i) => i._id !== n._id)
                                );
                              } catch {}
                            }}
                          >
                            Dismiss
                          </Button>

                          <Text ml="auto" fontSize="xs" color="gray.500">
                            {timeAgo(n.createdAt)}
                          </Text>
                        </HStack>
                      </Box>
                    </HStack>
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Footer */}
          {!loading && items.length > 0 && (
            <>
              <Box h="1px" bg="gray.100" />
              <Flex align="center" justify="space-between" px={5} py={3}>
                <HStack color="gray.500" fontSize="sm">
                  <Text>Total:</Text>
                  <Badge borderRadius="full" colorScheme="gray">
                    {items.length}
                  </Badge>
                </HStack>
                <HStack>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Trash2 size={14} />}
                    onClick={async () => {
                      try {
                        await api("/api/notifications/read", {
                          method: "DELETE",
                        });
                        setItems((prev) => prev.filter((n) => !n.read));
                      } catch {}
                    }}
                  >
                    Clear read
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="pink"
                    bg="pink.500"
                    _hover={{ bg: "pink.600" }}
                    onClick={handleClose}
                    color="white"
                  >
                    Close
                  </Button>
                </HStack>
              </Flex>
            </>
          )}
        </Flex>
      </Box>
    </Box>
  );
}
