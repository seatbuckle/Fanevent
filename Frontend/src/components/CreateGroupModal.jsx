// src/components/CreateGroupModal.jsx
import React from "react";
import {
  Box, Flex, Text, Input, Textarea, Button, HStack, VStack, Image, Badge,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";

const MAX_IMAGE_MB = 1.2;

export default function CreateGroupModal({ isOpen, onClose, onCreated }) {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();

  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    category: "Arts & Culture",
    description: "",
    image: "",
    tags: [],
  });
  const [tag, setTag] = React.useState("");
  const fileRef = React.useRef(null);

  React.useEffect(() => {
    if (!isOpen) {
      setForm({ name: "", category: "Arts & Culture", description: "", image: "", tags: [] });
      setTag("");
    }
  }, [isOpen]);

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const addTag = () => {
    const t = tag.trim();
    if (t && !form.tags.includes(t)) setForm((s) => ({ ...s, tags: [...s.tags, t] }));
    setTag("");
  };
  const removeTag = (t) => setForm((s) => ({ ...s, tags: s.tags.filter((x) => x !== t) }));

  const handleImage = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please select an image.");
      e.target.value = "";
      return;
    }
    const mb = f.size / (1024 * 1024);
    if (mb > MAX_IMAGE_MB) {
      toast.error(`Image too large (${mb.toFixed(1)}MB). Max ${MAX_IMAGE_MB}MB.`);
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((s) => ({ ...s, image: reader.result }));
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (!authLoaded || !isSignedIn) {
      toast.error("Please sign in to create a group");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        image: form.image || "",
        tags: form.tags,
      };

      const created = await api("/api/organizer/groups", {
        method: "POST",
        body: payload,
        auth: "required",
      });

      toast.success("Group created (pending admin approval)");
      onCreated?.(created);
      onClose?.();
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("(401)")) {
        toast.error("Please sign in to continue.");
      } else if (msg.includes("(403)")) {
        toast.error("Organizer only. Apply on your dashboard first.");
      } else if (msg.includes("(404)")) {
        toast.error("Endpoint not found — check server mount for /api/organizer/groups");
      } else {
        toast.error(msg || "Failed to create group");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Box position="fixed" inset="0" bg="blackAlpha.600" zIndex="1000" onClick={onClose} />
      <Box
        position="fixed"
        inset="0"
        zIndex="1001"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={{ base: 4, md: 6 }}
        onClick={onClose}
      >
        <Box
          bg="white"
          rounded="2xl"
          maxW="720px"
          w="full"
          maxH="90vh"
          overflowY="auto"
          onClick={(e) => e.stopPropagation()}
          boxShadow="lg"
        >
          <Flex justify="space-between" align="center" p={{ base: 4, md: 6 }} borderBottomWidth="1px">
            <Text fontSize="lg" fontWeight="semibold">Create New Group</Text>
            <Button variant="ghost" rounded="full" onClick={onClose} size="sm">✕</Button>
          </Flex>

          <VStack spacing={5} p={{ base: 4, md: 6 }} align="stretch">
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>Group Name *</Text>
              <Input name="name" value={form.name} onChange={onChange} placeholder="e.g., Art Museum Enthusiasts" rounded="lg" />
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>Category</Text>
              <Box
                as="select"
                name="category"
                value={form.category}
                onChange={onChange}
                borderWidth="1px"
                rounded="lg"
                p={2}
                bg="white"
              >
                <option>Arts & Culture</option>
                <option>Entertainment</option>
                <option>Music</option>
                <option>Games</option>
                <option>Sports</option>
                <option>Other</option>
              </Box>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>Description</Text>
              <Textarea
                name="description"
                value={form.description}
                onChange={onChange}
                rows={5}
                placeholder="Tell people what this group is about…"
                rounded="lg"
              />
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>Cover Image (optional)</Text>
              {form.image ? (
                <Box position="relative">
                  <Image src={form.image || undefined} w="100%" h="200px" objectFit="cover" rounded="lg" />
                  <Button mt={3} size="sm" onClick={() => setForm((s) => ({ ...s, image: "" }))}>Remove</Button>
                </Box>
              ) : (
                <Box
                  borderWidth="2px"
                  borderStyle="dashed"
                  borderColor="gray.300"
                  rounded="lg"
                  p={6}
                  textAlign="center"
                  bg="gray.50"
                  onClick={() => fileRef.current?.click()}
                  cursor="pointer"
                >
                  <Text fontSize="3xl">📷</Text>
                  <Text fontSize="sm" color="gray.600">Click to upload an image (≤ {MAX_IMAGE_MB}MB)</Text>
                  <Input ref={fileRef} type="file" accept="image/*" display="none" onChange={handleImage} />
                </Box>
              )}
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>Tags (optional)</Text>
              <HStack>
                <Input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="Type a tag and press Add"
                  rounded="lg"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button variant="outline" onClick={addTag}>Add</Button>
              </HStack>
              <HStack mt={2} wrap="wrap">
                {form.tags.map((t) => (
                  <Badge key={t} px={3} py={1} rounded="full" bg="gray.100">
                    <HStack>
                      <Text>{t}</Text>
                      <Box as="button" onClick={() => removeTag(t)} fontWeight="bold">✕</Box>
                    </HStack>
                  </Badge>
                ))}
              </HStack>
            </Box>
          </VStack>

          <Flex justify="flex-end" gap={3} p={{ base: 4, md: 6 }} borderTopWidth="1px">
            <Button variant="outline" rounded="full" onClick={onClose}>Cancel</Button>
            <Button colorScheme="pink" rounded="full" isLoading={loading} onClick={submit}>
              Create Group
            </Button>
          </Flex>
        </Box>
      </Box>
    </>
  );
}
