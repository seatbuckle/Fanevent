import React from "react";
import { Box, Container, Heading, Text, VStack, HStack, Badge, Button, Separator } from "@chakra-ui/react";
import { api } from "@/lib/api";
import { CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";

function format(d) {
  const dt = new Date(d);
  return dt.toLocaleString();
}

export default function NotificationCenter() {
  const [items, setItems] = React.useState([]);
  const [cursor, setCursor] = React.useState(null);
  const [hasMore, setHasMore] = React.useState(true);

  const load = async (append = false) => {
    const qs = new URLSearchParams();
    qs.set("limit", "25");
    if (append && cursor) qs.set("before", cursor);
    const res = await api(`/api/notifications?${qs.toString()}`);
    const list = res?.notifications || [];
    setItems((arr) => (append ? [...arr, ...list] : list));
    setHasMore(list.length >= 25);
    setCursor(list[list.length - 1]?.createdAt || null);
  };

  React.useEffect(() => { load(false); }, []);

  const markAll = async () => {
    await api(`/api/notifications/mark-all-read`, { method: "POST" });
    setItems((arr) => arr.map((n) => ({ ...n, read: true })));
  };

  return (
    <Container maxW="900px" pt={{ base: 24, md: 28 }} pb={16}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Notification Center</Heading>
        <Button onClick={markAll} leftIcon={<CheckCheck size={16} />} rounded="full" colorScheme="pink" variant="outline">Mark all read</Button>
      </HStack>

      <VStack align="stretch" spacing={4}>
        {items.map((n) => (
          <Box key={n._id} p={5} bg={n.read ? "white" : "pink.50"} rounded="xl" borderWidth="1px" borderColor={n.read ? "gray.200" : "pink.200"}>
            <HStack justify="space-between" mb={1}>
              <HStack>
                <Badge colorScheme={n.read ? "gray" : "pink"}>{n.type}</Badge>
                <Text fontWeight="semibold">{n.data?.title || "Update"}</Text>
              </HStack>
              <Text fontSize="sm" color="gray.500">{format(n.createdAt)}</Text>
            </HStack>
            <Text color="gray.700">{n.data?.message || n.data?.body || "You have a new update."}</Text>
            {n.link && (
              <Button as={Link} to={n.link} size="sm" mt={3} colorScheme="pink" variant="solid" rounded="full">Open</Button>
            )}
          </Box>
        ))}
        {hasMore && (
          <Box textAlign="center" pt={2}>
            <Button variant="ghost" onClick={() => load(true)}>Load more</Button>
          </Box>
        )}
      </VStack>
    </Container>
  );
}