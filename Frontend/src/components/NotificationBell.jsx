// import React from "react";
// import {
//   Box,
//   Flex,
//   Text,
//   IconButton,
//   Badge,
//   VStack,
//   HStack,
//   Avatar,
//   Button,
//   Spinner,
//   useDisclosure,
//   Separator,
// } from "@chakra-ui/react";
// import { Bell, CheckCheck, Trash2 } from "lucide-react";
// import { useUser } from "@clerk/clerk-react";
// import { Link, useNavigate } from "react-router-dom";
// import { api } from "@/lib/api";
// import toast from "react-hot-toast";

// function timeAgo(dateString) {
//   const d = new Date(dateString);
//   const diff = Math.max(0, Date.now() - d.getTime());
//   const m = Math.floor(diff / (60 * 1000));
//   if (m < 1) return "just now";
//   if (m < 60) return `${m}m ago`;
//   const h = Math.floor(m / 60);
//   if (h < 24) return `${h}h ago`;
//   const days = Math.floor(h / 24);
//   return `${days}d ago`;
// }

// // Minimal type → icon/label mapping
// const TYPE_META = {
//   RSVP_NEW: { emoji: "🎟️", label: "New RSVP" },
//   EVENT_REMINDER: { emoji: "⏰", label: "Reminder" },
//   EVENT_UPDATE: { emoji: "🔔", label: "Event Update" },
//   EVENT_CANCELLED: { emoji: "🚫", label: "Event Cancelled" },
//   ANNOUNCEMENT: { emoji: "📣", label: "Announcement" },
//   DEFAULT: { emoji: "✨", label: "Update" },
// };

// export default function NotificationBell() {
//   const { isSignedIn } = useUser();
//   const navigate = useNavigate();
//   const [items, setItems] = React.useState([]);
//   const [loading, setLoading] = React.useState(false);
//   const [unread, setUnread] = React.useState(0);
//   const [open, setOpen] = React.useState(false);
//   const [cursor, setCursor] = React.useState(null); // ISO for `before`
//   const [hasMore, setHasMore] = React.useState(true);

//   const fetchNotifs = React.useCallback(async (append = false) => {
//     if (!isSignedIn || loading) return;
//     setLoading(true);
//     try {
//       const qs = new URLSearchParams();
//       qs.set("limit", "12");
//       if (append && cursor) qs.set("before", cursor);
//       const data = await api(`/api/notifications?${qs.toString()}`);
//       const list = data?.notifications || [];
//       setItems((prev) => (append ? [...prev, ...list] : list));
//       setHasMore(list.length >= 12);
//       const nextCursor = list[list.length - 1]?.createdAt || null;
//       setCursor(nextCursor);
//       setUnread(list.filter((n) => !n.read).length);
//     } catch (e) {
//       toast.error("Failed to load notifications");
//     } finally {
//       setLoading(false);
//     }
//   }, [isSignedIn, loading, cursor]);

//   React.useEffect(() => {
//     if (open) fetchNotifs(false);
//   }, [open]);

//   const markAllRead = async () => {
//     try {
//       await api(`/api/notifications/mark-all-read`, { method: "POST" });
//       setItems((arr) => arr.map((n) => ({ ...n, read: true })));
//       setUnread(0);
//     } catch (e) {
//       toast.error("Could not mark all read");
//     }
//   };

//   const markOneRead = async (id) => {
//     try {
//       await api(`/api/notifications/${id}/read`, { method: "PATCH" });
//       setItems((arr) => arr.map((n) => (n._id === id ? { ...n, read: true } : n)));
//       setUnread((u) => Math.max(0, u - 1));
//     } catch {}
//   };

//   const deleteOne = async (id) => {
//     const ok = confirm("Delete this notification?");
//     if (!ok) return;
//     try {
//       await api(`/api/notifications/${id}`, { method: "DELETE" });
//       setItems((arr) => arr.filter((n) => n._id !== id));
//     } catch (e) {
//       toast.error("Could not delete");
//     }
//   };

//   const Pill = ({ active }) => (
//     <Box
//       position="absolute"
//       inset="0"
//       rounded="full"
//       bgGradient="linear(to-r, pink.50, white)"
//       borderWidth="1px"
//       borderColor="white"
//       boxShadow="0 10px 30px rgba(236,72,153,0.25)"
//       opacity={active ? 1 : 0}
//       transform={active ? "scale(1)" : "scale(0.98)"}
//       transition="all 160ms"
//     />
//   );

//   return (
//     <Box position="relative">
//       <IconButton
//         variant="ghost"
//         aria-label="Notifications"
//         onClick={() => setOpen((v) => !v)}
//         _hover={{ bg: "gray.100" }}
//       >
//         <Box position="relative">
//           <Bell size={20} />
//           {unread > 0 && (
//             <Badge
//               position="absolute"
//               top="-8px"
//               right="-8px"
//               rounded="full"
//               colorScheme="pink"
//             >
//               {unread}
//             </Badge>
//           )}
//         </Box>
//       </IconButton>

//       {/* Popover panel */}
//       {open && (
//         <Box
//           position="absolute"
//           right={0}
//           mt={2}
//           w={{ base: "92vw", sm: "420px" }}
//           bg="white"
//           rounded="2xl"
//           borderWidth="1px"
//           borderColor="gray.200"
//           boxShadow="0 24px 80px rgba(0,0,0,0.22)"
//           overflow="hidden"
//           zIndex={60}
//         >
//           {/* Header */}
//           <Box position="relative" px={5} py={4} bgGradient="linear(to-r, pink.400, fuchsia.500)" color="white">
//             <Pill active />
//             <Flex justify="space-between" align="center">
//               <Text fontWeight="bold">Notifications</Text>
//               <HStack gap={1}>
//                 <Button size="sm" variant="ghost" color="white" onClick={() => navigate('/notifications')}>
//                   Open Center
//                 </Button>
//                 <Button size="sm" variant="outline" rounded="full" onClick={markAllRead} leftIcon={<CheckCheck size={14} />}>Mark all read</Button>
//               </HStack>
//             </Flex>
//           </Box>

//           {/* List */}
//           <VStack align="stretch" spacing={0} maxH="60vh" overflowY="auto">
//             {loading && !items.length && (
//               <Flex align="center" justify="center" py={10}><Spinner />
//               </Flex>
//             )}
//             {!loading && !items.length && (
//               <Flex align="center" justify="center" py={10} color="gray.500">
//                 <Text>No notifications yet.</Text>
//               </Flex>
//             )}
//             {items.map((n) => {
//               const meta = TYPE_META[n.type] || TYPE_META.DEFAULT;
//               return (
//                 <Box key={n._id} _hover={{ bg: n.read ? "gray.50" : "pink.50" }}>
//                   <HStack align="start" px={4} py={3} spacing={3}>
//                     <Avatar size="sm" bg="pink.100" color="pink.600" name={meta.label} title={meta.label}>
//                       <Box as="span" fontSize="lg">{meta.emoji}</Box>
//                     </Avatar>
//                     <Box flex="1">
//                       <HStack justify="space-between" align="start">
//                         <Text fontWeight={n.read ? "medium" : "bold"} color={n.read ? "gray.700" : "gray.900"}>
//                           {n.data?.title || meta.label}
//                         </Text>
//                         <Text fontSize="xs" color="gray.500">{timeAgo(n.createdAt)}</Text>
//                       </HStack>
//                       <Text fontSize="sm" color="gray.700" mt={1}>
//                         {n.data?.message || n.data?.body || n.data?.summary || "You have a new update"}
//                       </Text>
//                       {n.link && (
//                         <Button as={Link} to={n.link} size="xs" mt={2} colorScheme="pink" variant="ghost">
//                           View
//                         </Button>
//                       )}
//                       <HStack mt={2} spacing={2}>
//                         {!n.read && (
//                           <Button size="xs" variant="outline" rounded="full" onClick={() => markOneRead(n._id)} leftIcon={<CheckCheck size={14} />}>
//                             Mark read
//                           </Button>
//                         )}
//                         <Button size="xs" variant="ghost" rounded="full" onClick={() => deleteOne(n._id)} leftIcon={<Trash2 size={14} />}>
//                           Delete
//                         </Button>
//                       </HStack>
//                     </Box>
//                   </HStack>
//                   <Separator />
//                 </Box>
//               );
//             })}
//             {hasMore && (
//               <Box p={3} textAlign="center">
//                 <Button size="sm" variant="ghost" onClick={() => fetchNotifs(true)}>Load more</Button>
//               </Box>
//             )}
//           </VStack>
//         </Box>
//       )}
//     </Box>
//   );
// }
