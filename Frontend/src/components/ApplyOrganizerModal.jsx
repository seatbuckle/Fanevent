// Apply Organizer Modal (DB-backed autofill) — JS version
import React from "react";
import * as Chakra from "@chakra-ui/react";
import { useAuth, useUser } from "@clerk/clerk-react";

const {
  Box,
  Heading,
  Text,
  VStack,
  Input,
  Textarea,
  Button,
  Flex,
  IconButton,
  Select,
  FormControl,
  FormLabel,
  FormErrorMessage,
  useToast,
} = Chakra;

function ApplyOrganizerModal({ isOpen, onClose, onSubmitted }) {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [groups, setGroups] = React.useState([]);
  const [loadingGroups, setLoadingGroups] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Prefill from Clerk
  const defaultName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  const defaultEmail = user?.primaryEmailAddress?.emailAddress ?? "";

  const [form, setForm] = React.useState({
    fullName: defaultName,
    email: defaultEmail,
    groupId: "",
    experience: "",
    reason: "",
    links: "",
  });

  const [errors, setErrors] = React.useState({});

  // Update defaults if Clerk loads after mount
  React.useEffect(() => {
    setForm((s) => ({
      ...s,
      fullName: defaultName || s.fullName,
      email: defaultEmail || s.email,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultName, defaultEmail]);

  const change = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.fullName?.trim()) next.fullName = "Full name is required";
    if (!form.email?.trim()) next.email = "Email is required";
    if (!form.groupId?.trim()) next.groupId = "Please select a group";
    if (!form.experience?.trim()) next.experience = "This field is required";
    if (!form.reason?.trim()) next.reason = "This field is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // Helper: prefer groupId from URL if present (?groupId=... or ?group=...)
  const urlPreferredGroupId = React.useMemo(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      return qs.get("groupId") || qs.get("group") || "";
    } catch {
      return "";
    }
  }, []);

  // Load groups from your DB (no dummy fallback)
  React.useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    (async () => {
      try {
        setLoadingGroups(true);
        const token = await getToken();

        // 1) Try groups the user belongs to
        let res = await fetch("/api/groups/me/mine", {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });

        // 2) If that fails or returns nothing, try public list
        if (!res.ok) {
          res = await fetch("/api/groups", {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal: controller.signal,
          });
        }

        if (!res.ok) {
          const maybeJson = await res.json().catch(() => null);
          const msg = (maybeJson && maybeJson.message) || "Failed to load groups";
          throw new Error(msg);
        }

        const data = await res.json();
        const items = Array.isArray(data) ? data : data?.items ?? [];

        if (!mounted) return;
        setGroups(items);

        // Prefill groupId:
        const urlMatch = urlPreferredGroupId
          ? items.find((g) => (g._id || g.id) === urlPreferredGroupId)
          : null;

        if (urlMatch) {
          setForm((s) => ({ ...s, groupId: urlPreferredGroupId }));
        } else if (items.length === 1) {
          const onlyId = items[0]._id || items[0].id;
          if (onlyId) {
            setForm((s) => ({ ...s, groupId: onlyId }));
          }
        }
      } catch (err) {
        if (!mounted) return;
        console.error("Load groups error:", err);
        const message = err?.message || "Failed to load groups";
        toast({ title: message, status: "error" });
      } finally {
        if (mounted) setLoadingGroups(false);
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getToken, urlPreferredGroupId]);

  const submit = async () => {
    if (!validate()) {
      toast({ title: "Please fix the errors", status: "error" });
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();

      const res = await fetch("/api/organizer-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const maybeJson = await res.json().catch(() => null);
        const msg = (maybeJson && maybeJson.message) || "Failed to submit";
        throw new Error(msg);
      }

      toast({ title: "Application submitted", status: "success" });
      onSubmitted && onSubmitted("pending");
      onClose();
    } catch (e) {
      toast({ title: e?.message || "Failed to submit", status: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectPlaceholder = loadingGroups
    ? "Loading groups..."
    : groups.length
    ? "Select a group"
    : "No groups found — join or create one first";

  return (
    <>
      {/* Overlay */}
      <Box position="fixed" inset="0" bg="blackAlpha.600" zIndex="1000" onClick={onClose} />
      {/* Modal */}
      <Flex
        position="fixed"
        inset="0"
        align="center"
        justify="center"
        zIndex="1001"
        p={4}
        onClick={onClose}
      >
        <Box
          bg="white"
          borderRadius="xl"
          maxW="680px"
          w="full"
          maxH="90vh"
          overflowY="auto"
          boxShadow="2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <Flex justify="space-between" align="center" p={6} borderBottomWidth="1px">
            <Heading size="lg">Apply to be an Organizer</Heading>
            <IconButton size="sm" variant="ghost" onClick={onClose} aria-label="Close">
              ✕
            </IconButton>
          </Flex>

          {/* Body */}
          <Box p={6}>
            <Text fontSize="sm" color="gray.600" mb={6}>
              Fill out this form to apply for organizer privileges. Our admin team will review your application.
            </Text>

            <VStack spacing={5} align="stretch">
              <FormControl isInvalid={!!errors.fullName} isRequired>
                <FormLabel>Full Name</FormLabel>
                <Input
                  name="fullName"
                  value={form.fullName}
                  onChange={change}
                  placeholder="Full Name"
                />
                <FormErrorMessage>{errors.fullName}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.email} isRequired>
                <FormLabel>Email Address</FormLabel>
                <Input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={change}
                  placeholder="Email address"
                />
                <FormErrorMessage>{errors.email}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.groupId} isRequired>
                <FormLabel>Group of Desired Organizer Role</FormLabel>
                <Select
                  name="groupId"
                  value={form.groupId}
                  onChange={change}
                  placeholder={selectPlaceholder}
                  isDisabled={loadingGroups || groups.length === 0}
                >
                  {groups.map((g) => {
                    const id = g._id || g.id;
                    return (
                      <option key={id} value={id}>
                        {g.name}
                      </option>
                    );
                  })}
                </Select>
                <FormErrorMessage>{errors.groupId}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.experience} isRequired>
                <FormLabel>Event Organization Experience</FormLabel>
                <Textarea
                  name="experience"
                  value={form.experience}
                  onChange={change}
                  placeholder="Describe your experience organizing events or managing communities."
                  rows={4}
                />
                <FormErrorMessage>{errors.experience}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.reason} isRequired>
                <FormLabel>Why do you want to be an organizer?</FormLabel>
                <Textarea
                  name="reason"
                  value={form.reason}
                  onChange={change}
                  placeholder="Tell us why you want to organize events on our platform, and/or what kind of events you plan on hosting."
                  rows={4}
                />
                <FormErrorMessage>{errors.reason}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>Relevant Links (Optional)</FormLabel>
                <Input
                  name="links"
                  value={form.links}
                  onChange={change}
                  placeholder="Social media profiles, websites, portfolios, etc."
                />
              </FormControl>
            </VStack>
          </Box>

          {/* Footer */}
          <Flex justify="flex-end" gap={3} p={6} borderTopWidth="1px">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="pink"
              isLoading={loading}
              loadingText="Submitting..."
              onClick={submit}
              isDisabled={loadingGroups || groups.length === 0}
            >
              Submit Application
            </Button>
          </Flex>
        </Box>
      </Flex>
    </>
  );
}

export default ApplyOrganizerModal;
