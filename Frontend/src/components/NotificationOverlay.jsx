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

  const isWarning =
    typeStr.includes("warning") ||
    (data?.kind && String(data.kind).toLowerCase().includes("warning"));

  const messageText =
    data?.adminMessage ??
    data?.warningMessage ??
    data?.note ??
    data?.message ??
    (typeof n?.data === "string" ? n.data : null) ??
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

  const common = {
    icon: <Info size={18} />,
    color: "gray",
    title: n?.type || "Notification",
    body:
      messageText ||
      (Object.keys(data || {}).length ? JSON.stringify(data) : "—"),
    link,
    isWarning,
    groupHref,
    eventHref,
    messageHref,
    rawData: data,
  };

  if (typeStr.includes("welcome"))
    return { ...common, icon: <Bell size={18} />, color: "pink", title: "Welcome to Fanevent 🎉" };

  if (typeStr.includes("group") && typeStr.includes("warning"))
    return {
      ...common,
      icon: <AlertTriangle size={18} />,
      color: "yellow",
      title: `Group Warning${data?.groupName ? ` · ${data.groupName}` : ""}`,
    };

  if (typeStr.includes("group") && (typeStr.includes("removed") || typeStr.includes("deleted")))
    return {
      ...common,
      icon: <Trash2 size={18} />,
      color: "red",
      title: `Group Removed${data?.groupName ? ` · ${data.groupName}` : ""}`,
    };

  if (typeStr.includes("user") && typeStr.includes("warning"))
    return { ...common, icon: <Flag size={18} />, color: "yellow", title: "Account Warning" };

  if (typeStr.includes("organizer") && typeStr.includes("warning"))
    return { ...common, icon: <Flag size={18} />, color: "yellow", title: "Organizer Warning" };

  if (typeStr.includes("event") && (typeStr.includes("removed") || typeStr.includes("deleted")))
    return {
      ...common,
      icon: <Trash2 size={18} />,
      color: "red",
      title: `Event Removed${data?.eventTitle ? ` · ${data.eventTitle}` : ""}`,
    };

  if (typeStr.includes("event") && typeStr.includes("approved"))
    return {
      ...common,
      icon: <CheckCircle2 size={18} />,
      color: "green",
      title: `Event Approved${data?.eventTitle ? ` · ${data.eventTitle}` : ""}`,
    };

  if (typeStr.includes("event") && typeStr.includes("rejected"))
    return {
      ...common,
      icon: <AlertTriangle size={18} />,
      color: "red",
      title: `Event Rejected${data?.eventTitle ? ` · ${data.eventTitle}` : ""}`,
    };

  if (typeStr.includes("report"))
    return { ...common, icon: <Flag size={18} />, color: "purple", title: n?.type || "Report Update" };

  return common;
}

/* ---------- Component ---------- */
export default function NotificationOverlay({ isOpen, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inline “panel” state (no modal)
  const [inspected, setInspected] = useState(null); // raw notification
  const [shapedInspected, setShapedInspected] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api("/api/notifications");
        if (mounted) setItems(res.notifications || res.data?.notifications || []);
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

  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items]);

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
      await api(`/api/notifications/${inspected._id}/read`, { method: "PATCH" });
      setItems((prev) => prev.map((i) => (i._id === inspected._id ? { ...i, read: true } : i)));
      inspected.read = true;
    } catch {}
  };

  if (!isOpen) return null;

  // layout: when inspector open on md+, shift the list left so they never overlap
  const listRightMd = inspected ? "calc(8% + 460px + 16px)" : "8%";

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={100}
      bg="blackAlpha.300"
      backdropFilter="blur(6px)"
      onClick={handleClose}
    >
      {/* LIST CARD */}
      <Flex
        position="absolute"
        top={{ base: "8%", md: "10%" }}
        right={{ base: "4%", md: "8%" }}
        // Use style for calc on md+
        style={{ right: typeof window !== "undefined" ? undefined : undefined }}
        w={{ base: "92%", md: "440px" }}
        maxW="94vw"
        bg="white"
        borderRadius="2xl"
        boxShadow="xl"
        flexDir="column"
        p={0}
        onClick={(e) => e.stopPropagation()}
        zIndex={100}
        // responsive manual right shift when inspector is open
        sx={{
          "@media (min-width: 48em)": {
            right: listRightMd,
          },
        }}
      >
        {/* Header */}
        <Flex align="center" justify="space-between" px={5} py={4}>
          <HStack>
            <Bell size={18} />
            <Text fontSize="lg" fontWeight="bold">Notifications</Text>
            {unreadCount > 0 && (
              <Badge colorScheme="pink" borderRadius="full">{unreadCount} new</Badge>
            )}
          </HStack>
          <HStack>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await api("/api/notifications/mark-all-read", { method: "POST" });
                  setItems((prev) => prev.map((n) => ({ ...n, read: true })));
                } catch {}
              }}
            >
              Mark all read
            </Button>
            <IconButton
              aria-label="Close"
              icon={<X size={18} />}
              size="sm"
              onClick={handleClose}
              colorScheme="pink"
              bg="pink.500"
              _hover={{ bg: "pink.600" }}
              color="white"
            />
          </HStack>
        </Flex>
        <Box h="1px" bg="gray.100" />

        {/* Body */}
        {loading ? (
          <Box textAlign="center" py={10}><Spinner /></Box>
        ) : items.length === 0 ? (
          <Box py={8} textAlign="center" color="gray.500">No notifications yet.</Box>
        ) : (
          <Box px={4} py={3} maxH="70vh" overflowY="auto">

return (
  <Box
    position="fixed"
    inset={0}
    zIndex={100}
    bg="blackAlpha.300"
    backdropFilter="blur(6px)"
    onClick={handleClose}
  >
    {/* WRAPPER: single anchor, stacks inspector ABOVE list */}
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
        <Box
          bg="white"
          borderRadius="2xl"
          boxShadow="xl"
          mb={3}                // spacing ABOVE the list
          p={0}
        >
          <Flex align="center" justify="space-between" px={5} py={4}>
            <HStack>
              <AlertTriangle size={18} />
              <Text fontSize="lg" fontWeight="bold">Warning Details</Text>
              <Badge colorScheme="yellow" borderRadius="full">Warning</Badge>
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
                Mark read & close
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
                  <Text fontSize="sm" color="gray.600">{inspected?.type}</Text>
                  <Text ml="auto" fontSize="xs" color="gray.500">
                    {timeAgo(inspected?.createdAt)}
                  </Text>
                </HStack>

                {shapedInspected?.rawData?.groupName && (
                  <HStack fontSize="sm" color="gray.700" mb={1}>
                    <Users size={16} />
                    <Text>
                      Group: <strong>{shapedInspected.rawData.groupName}</strong>
                    </Text>
                  </HStack>
                )}

                {shapedInspected?.rawData?.eventTitle && (
                  <HStack fontSize="sm" color="gray.700" mb={1}>
                    <Calendar size={16} />
                    <Text>
                      Event: <strong>{shapedInspected.rawData.eventTitle}</strong>
                    </Text>
                  </HStack>
                )}

                {shapedInspected?.rawData?.reason && (
                  <Box mt={2}>
                    <Text fontWeight="semibold" mb={1}>Reason</Text>
                    <Text fontSize="sm" color="gray.800">
                      {shapedInspected.rawData.reason}
                    </Text>
                  </Box>
                )}

                <Box mt={3}>
                  <Text fontWeight="semibold" mb={1}>Message from Admin</Text>
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
                onClick={() => (window.location.href = shapedInspected.groupHref)}
              >
                Open Group
              </Button>
            )}
            {shapedInspected?.eventHref && (
              <Button
                size="sm"
                leftIcon={<Calendar size={14} />}
                variant="outline"
                onClick={() => (window.location.href = shapedInspected.eventHref)}
              >
                View Event
              </Button>
            )}
            {shapedInspected?.messageHref && (
              <Button
                size="sm"
                colorScheme="pink"
                bg="pink.500"
                _hover={{ bg: "pink.600" }}
                color="white"
                onClick={() => {
                  const href = shapedInspected.messageHref;
                  if (href.startsWith("http")) window.open(href, "_blank", "noreferrer");
                  else window.location.href = href;
                }}
              >
                View Message Thread
              </Button>
            )}
            <Button size="sm" onClick={closeInspector}>Close</Button>
          </Flex>
        </Box>
      )}

      {/* LIST CARD — always rendered; stays under the inspector */}
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
            <Text fontSize="lg" fontWeight="bold">Notifications</Text>
            {unreadCount > 0 && (
              <Badge colorScheme="pink" borderRadius="full">{unreadCount} new</Badge>
            )}
          </HStack>
          <HStack>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await api("/api/notifications/mark-all-read", { method: "POST" });
                  setItems((prev) => prev.map((n) => ({ ...n, read: true })));
                } catch {}
              }}
            >
              Mark all read
            </Button>
            <IconButton
              aria-label="Close"
              icon={<X size={18} />}
              size="sm"
              onClick={handleClose}
              colorScheme="pink"
              bg="pink.500"
              _hover={{ bg: "pink.600" }}
              color="white"
            />
          </HStack>
        </Flex>
        <Box h="1px" bg="gray.100" />

        {/* Body (unchanged from your version except layout) */}
        {loading ? (
          <Box textAlign="center" py={10}><Spinner /></Box>
        ) : items.length === 0 ? (
          <Box py={8} textAlign="center" color="gray.500">No notifications yet.</Box>
        ) : (
          <Box px={4} py={3} maxH="70vh" overflowY="auto">
            {items.map((n, idx) => {
              const shaped = shapeNotification(n);
              const isLast = idx === items.length - 1;

              const hasNav =
                shaped.link || shaped.groupHref || shaped.eventHref || shaped.messageHref;

              const handlePrimaryClick = () => {
                if (shaped.isWarning) {
                  openInspector(n); // now stacks ABOVE the list
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
                            <Box w="8px" h="8px" borderRadius="full" bg="pink.500" />
                            <Badge size="xs" colorScheme="pink" variant="subtle" borderRadius="full">
                              New
                            </Badge>
                          </HStack>
                        )}
                      </HStack>

                      {shaped.body && (
                        <Text mt={0.5} fontSize="sm" color="gray.800" whiteSpace="pre-wrap">
                          {shaped.body}
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
                                await api(`/api/notifications/${n._id}/read`, { method: "PATCH" });
                                setItems((prev) =>
                                  prev.map((i) => (i._id === n._id ? { ...i, read: true } : i))
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
                              await api(`/api/notifications/${n._id}`, { method: "DELETE" });
                              setItems((prev) => prev.filter((i) => i._id !== n._id));
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
                <Badge borderRadius="full" colorScheme="gray">{items.length}</Badge>
              </HStack>
              <HStack>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Trash2 size={14} />}
                  onClick={async () => {
                    try {
                      await api("/api/notifications/read", { method: "DELETE" });
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

          </Box>
        )}

        {/* Footer */}
        {!loading && items.length > 0 && (
          <>
            <Box h="1px" bg="gray.100" />
            <Flex align="center" justify="space-between" px={5} py={3}>
              <HStack color="gray.500" fontSize="sm">
                <Text>Total:</Text>
                <Badge borderRadius="full" colorScheme="gray">{items.length}</Badge>
              </HStack>
              <HStack>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Trash2 size={14} />}
                  onClick={async () => {
                    try {
                      await api("/api/notifications/read", { method: "DELETE" });
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

      {/* ---------- Inline “Inspector” panel (no Modal) ---------- */}
      {inspected && (
        <Box
          position="absolute"
          // On small screens, show as a full-width overlay card.
          top={{ base: "4%", md: "10%" }}
          left={{ base: "4%", md: "auto" }}
          right={{ base: "4%", md: "8%" }}
          w={{ base: "92%", md: "440px" }}
          maxW="94vw"
          bg="white"
          borderRadius="2xl"
          boxShadow="xl"
          p={0}
          onClick={(e) => e.stopPropagation()}
          zIndex={101} // above the list card
        >
          <Flex align="center" justify="space-between" px={5} py={4}>
            <HStack>
              <AlertTriangle size={18} />
              <Text fontSize="lg" fontWeight="bold">Warning Details</Text>
              <Badge colorScheme="yellow" borderRadius="full">Warning</Badge>
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
                Mark read & close
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
                  <Text fontSize="sm" color="gray.600">{inspected?.type}</Text>
                  <Text ml="auto" fontSize="xs" color="gray.500">{timeAgo(inspected?.createdAt)}</Text>
                </HStack>

                {shapedInspected?.rawData?.groupName && (
                  <HStack fontSize="sm" color="gray.700" mb={1}>
                    <Users size={16} />
                    <Text>Group: <strong>{shapedInspected.rawData.groupName}</strong></Text>
                  </HStack>
                )}

                {shapedInspected?.rawData?.eventTitle && (
                  <HStack fontSize="sm" color="gray.700" mb={1}>
                    <Calendar size={16} />
                    <Text>Event: <strong>{shapedInspected.rawData.eventTitle}</strong></Text>
                  </HStack>
                )}

                {shapedInspected?.rawData?.reason && (
                  <Box mt={2}>
                    <Text fontWeight="semibold" mb={1}>Reason</Text>
                    <Text fontSize="sm" color="gray.800">{shapedInspected.rawData.reason}</Text>
                  </Box>
                )}

                <Box mt={3}>
                  <Text fontWeight="semibold" mb={1}>Message from Admin</Text>
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
                onClick={() => (window.location.href = shapedInspected.groupHref)}
              >
                Open Group
              </Button>
            )}
            {shapedInspected?.eventHref && (
              <Button
                size="sm"
                leftIcon={<Calendar size={14} />}
                variant="outline"
                onClick={() => (window.location.href = shapedInspected.eventHref)}
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
                  if (href.startsWith("http")) window.open(href, "_blank", "noreferrer");
                  else window.location.href = href;
                }}
              >
                View Message Thread
              </Button>
            )}
            <Button size="sm" onClick={closeInspector}>Close</Button>
          </Flex>
        </Box>
      )}
    </Box>
  );
}
