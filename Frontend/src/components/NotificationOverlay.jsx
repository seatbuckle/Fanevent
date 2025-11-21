import React, { useEffect, useState } from 'react';
import { Box, Text, IconButton, Button, Spinner, Flex } from '@chakra-ui/react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';

export default function NotificationOverlay({ isOpen, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setLoading(true);
    api('/api/notifications')
      .then((res) => {
        if (!mounted) return;
        setItems(res.notifications || []);
      })
      .catch(() => setItems([]))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [isOpen]);

  // Wrap onClose to delete read notifications and reload list
  const handleClose = async () => {
    try {
      await api('/api/notifications/read', { method: 'DELETE' });
      // Reload notifications after deletion to update UI
      const res = await api('/api/notifications');
      setItems(res.notifications || []);
    } catch {}
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <Box position="fixed" inset={0} zIndex={100} bg="blackAlpha.300" backdropFilter="blur(6px)" onClick={handleClose}>
      <Flex position="absolute" top={{ base: '10%', md: '12%' }} right={{ base: '4%', md: '8%' }} w={{ base: '92%', md: '420px' }} maxW="94vw" bg="white" borderRadius="2xl" boxShadow="xl" flexDir="column" p={6} onClick={e => e.stopPropagation()}>
        <Flex justify="space-between" align="center" mb={2}>
          <Text fontSize="lg" fontWeight="bold">Notifications</Text>
          <IconButton aria-label="Close" icon={<X size={18} />} size="sm" onClick={handleClose} />
        </Flex>
        {loading ? (
          <Box textAlign="center" py={8}><Spinner /></Box>
        ) : items.length === 0 ? (
          <Box py={6} textAlign="center" color="gray.500">No notifications yet.</Box>
        ) : (
          items.map((n) => (
            <Box key={n._id} bg={n.read ? 'gray.50' : 'pink.50'} p={3} mb={2} borderRadius="md" boxShadow="sm">
              <Text fontSize="sm" color="gray.700">{n.type}</Text>
              <Text mt={1} color="gray.800">{typeof n.data === 'string' ? n.data : JSON.stringify(n.data)}</Text>
              <Text mt={1} fontSize="xs" color="gray.500">{new Date(n.createdAt).toLocaleString()}</Text>
              {!n.read && (
                <Button size="xs" mt={2} onClick={async ()=>{ await api(`/api/notifications/${n._id}/read`, { method: 'PATCH' }).catch(()=>{}); setItems(items.map(i=>i._id===n._id?{...i, read:true}:i)) }}>Mark read</Button>
              )}
            </Box>
          ))
        )}
      </Flex>
    </Box>
  );
}
