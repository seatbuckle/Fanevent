// src/pages/OrganizerDashboard.jsx
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
  Textarea,
  Image,
  Flex,
  Grid,
  GridItem,
  Separator,
} from "@chakra-ui/react";
import { useUser } from "@clerk/clerk-react"; 
import { useNavigate } from "react-router-dom"; 
import toast from "react-hot-toast";
import { api } from "../lib/api";
import CreateGroupModal from "@/components/CreateGroupModal";

/* ======================= Helpers ======================= */
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const options = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
  return date.toLocaleDateString("en-US", options);
};

// merge date + time to ISO strings (safe if time omitted)
const mergeDateTime = (dateStr, timeStr) => {
  if (!dateStr) return null;
  if (!timeStr) return new Date(dateStr).toISOString();
  const [h, m] = (timeStr || "00:00").split(":").map((x) => parseInt(x, 10));
  const base = new Date(dateStr);
  base.setHours(h || 0, m || 0, 0, 0);
  return base.toISOString();
};

// Status pill styles (match admin dashboard look)
const getStatusStyles = (status) => {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "approved":
      return {
        bg: "green.50",
        color: "green.700",
        borderColor: "green.200",
        label: "Approved",
      };
    case "rejected":
      return {
        bg: "red.50",
        color: "red.700",
        borderColor: "red.200",
        label: "Rejected",
      };
    case "cancelled":
    case "canceled":
      return {
        bg: "gray.100",
        color: "gray.700",
        borderColor: "gray.300",
        label: "Cancelled",
      };
    case "pending":
    default:
      return {
        bg: "yellow.50",
        color: "yellow.700",
        borderColor: "yellow.200",
        label: "Pending",
      };
  }
};


/* ======================= Reusable Card ======================= */
const Card = ({ children, ...props }) => (
  <Box
    bg="white"
    borderWidth="1px"
    borderColor="gray.200"
    rounded="2xl"
    p={{ base: 5, md: 6 }}
    boxShadow="sm"
    {...props}
  >
    {children}
  </Box>
);

/* ======================= Event Modal (Create/Edit) ======================= */
function EventModal({ isOpen, onClose, event = null, onSaved }) {
  const [loading, setLoading] = React.useState(false);
  // coverImage: string for existing/added image; null means "explicitly clear on save"
  const [coverImage, setCoverImage] = React.useState(event?.image || "");
  const coverInputRef = React.useRef(null);
  const [additionalMedia, setAdditionalMedia] = React.useState(event?.media || []);
  const [tags, setTags] = React.useState(event?.tags || []);
  const [tagInput, setTagInput] = React.useState("");
  const [youtubeInput, setYoutubeInput] = React.useState("");
  // —— Group autosuggest state
const [groupQuery, setGroupQuery] = React.useState(event?.group || "");
const [groupSuggestions, setGroupSuggestions] = React.useState([]);
const [showGroupSuggest, setShowGroupSuggest] = React.useState(false);
const groupAbortRef = React.useRef(null);
const groupDebounceRef = React.useRef(null);
// Announcements
const [announcements, setAnnouncements] = React.useState([]);
const [loadingAnnouncements, setLoadingAnnouncements] = React.useState(false);

const updateMediaAt = (idx, key, value) => {
  setAdditionalMedia((arr) => arr.map((m, i) => (i === idx ? { ...m, [key]: value } : m)));
};


// Debounced fetch against your /api/groups endpoint
const fetchGroupSuggestions = React.useCallback(async (q) => {
  try {
    if (groupAbortRef.current) groupAbortRef.current.abort();
    groupAbortRef.current = new AbortController();

    const res = await fetch(`/api/groups?query=${encodeURIComponent(q)}&limit=8`, {
      headers: { "Content-Type": "application/json" },
      signal: groupAbortRef.current.signal,
    });

    let items = [];
    if (res.ok) {
      const data = await res.json();
      items = Array.isArray(data) ? data : data?.items ?? [];
    } else {
      // fallback: get all then filter client-side
      const res2 = await fetch("/api/groups", { headers: { "Content-Type": "application/json" } });
      if (res2.ok) {
        const data2 = await res2.json();
        const all = Array.isArray(data2) ? data2 : data2?.items ?? [];
        const lc = q.toLowerCase();
        items = all.filter((g) => (g?.name || "").toLowerCase().includes(lc)).slice(0, 8);
      }
    }

    setGroupSuggestions(items);
    setShowGroupSuggest(items.length > 0);
  } catch {
    // ignore
  }
}, []);

// Input change -> update form.group, keep groupId until a suggestion is selected
const onGroupInputChange = (e) => {
  const val = e.target.value;
  setGroupQuery(val);
  setForm((s) => ({ ...s, group: val, groupId: s.groupId }));

  if (groupDebounceRef.current) clearTimeout(groupDebounceRef.current);
  if (!val.trim()) {
    setShowGroupSuggest(false);
    setGroupSuggestions([]);
    return;
  }
  groupDebounceRef.current = setTimeout(() => fetchGroupSuggestions(val.trim()), 200);
};

// Click a suggestion -> set groupId + group
const selectGroup = (g) => {
  const id = g._id || g.id || "";
  const name = g.name || "";
  setForm((s) => ({ ...s, groupId: id, group: name }));
  setGroupQuery(name);
  setShowGroupSuggest(false);
};


  // === Size limits + downscale helper ===
  const MAX_IMAGE_MB = 1.2;             // hard cap per image after downscale
  const MAX_VIDEO_MB = 8;               // per video (still base64 for now)
  const MAX_MEDIA_ITEMS = 6;            // total media items allowed
  const MAX_PAYLOAD_BYTES = 6 * 1024 * 1024; // ~6MB total request size

  // Downscale big images to ~1600px max dimension to keep payload small
  // More robust image downscaler with multiple fallbacks
  async function downscaleImage(file, {
    maxDim = 1600,
    mime = "image/jpeg",
    quality = 0.85,
  } = {}) {
    if (!(file instanceof File)) throw new Error("Input is not a File");

    // Some devices produce HEIC/HEIF which the browser can't decode
    if (!file.type.startsWith("image/")) {
      throw new Error(`Unsupported image type: ${file.type || "unknown"}`);
    }
    if (/image\/heic|image\/heif/i.test(file.type)) {
      throw new Error("HEIC/HEIF is not supported by the browser");
    }

    // If already small (< maxDim) just return a data URL directly
    const smallEnough = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(Math.max(img.width, img.height) <= maxDim);
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    }).catch(() => false);

    if (smallEnough) {
      // Read as DataURL and return unchanged
      const raw = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(file);
      });
      return raw;
    }

    // Try createImageBitmap for faster/safer decoding
    let bitmap;
    try {
      if ("createImageBitmap" in window) {
        bitmap = await createImageBitmap(file);
      }
    } catch (e) {
      // ignore, we’ll fallback
      console.debug("createImageBitmap failed, falling back:", e);
    }

    let width, height, source;
    if (bitmap) {
      width = bitmap.width;
      height = bitmap.height;
      source = bitmap;
    } else {
      // Fallback: decode via object URL + <img>
      const objUrl = URL.createObjectURL(file);
      source = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = objUrl;
      });
      width = source.width;
      height = source.height;
      // no need to revoke yet; we can revoke after drawing
    }

    const scale = Math.min(1, maxDim / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    // Prefer toBlob (smaller memory), but Safari may return null
    const dataUrl = await new Promise((resolve, reject) => {
      try {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Safari fallback
              try {
                const d = canvas.toDataURL(mime, quality);
                resolve(d);
              } catch (e) {
                reject(e);
              }
              return;
            }
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = reject;
            fr.readAsDataURL(blob);
          },
          mime,
          quality
        );
      } catch (e) {
        try {
          const d = canvas.toDataURL(mime, quality);
          resolve(d);
        } catch (err) {
          reject(err);
        }
      }
    });

    // Cleanup
    try {
      if (source && "close" in source) source.close(); // close ImageBitmap
    } catch {}
    try {
      // revoke any object URLs we might have created
      const maybeUrl = (typeof source?.src === "string" && source.src) || null;
      if (maybeUrl?.startsWith("blob:")) URL.revokeObjectURL(maybeUrl);
    } catch {}

    return dataUrl;
  }

  const normalizeYouTubeUrl = (url) => {
    try {
      const u = new URL(url);
      if (u.hostname === "youtu.be") {
        return `https://www.youtube.com/watch?v=${u.pathname.slice(1)}`;
      }
      if (u.hostname.includes("youtube.com")) {
        if (u.pathname.startsWith("/shorts/")) {
          return `https://www.youtube.com/watch?v=${u.pathname.split("/")[2]}`;
        }
        if (u.pathname.startsWith("/embed/")) {
          return `https://www.youtube.com/watch?v=${u.pathname.split("/")[2]}`;
        }
        return url;
      }
    } catch {}
    return null;
  };

  const [form, setForm] = React.useState({
    title: event?.title || "",
    groupId: event?.groupId || "",
    group: event?.group || event?.category || "",
    date: event?.startAt ? event.startAt.slice(0, 10) : "",
    startTime: "",
    endTime: "",
    locationName: event?.locationName || event?.location || "",
    address: event?.address || "",
    city: event?.city || "",
    state: event?.state || "",
    zipCode: event?.zipCode || "",
    description: event?.description || "",
    capacity: event?.capacity || "",
    price: event?.price || "",
  });

  // 🔄 Hydrate ALL fields from the event each time the modal opens (edit) or reset for create
  React.useEffect(() => {
    if (!isOpen) return;
    const ev = event || {};

    setCoverImage(ev.image || "");
    setAdditionalMedia(Array.isArray(ev.media) ? ev.media : []);
    setTags(Array.isArray(ev.tags) ? ev.tags : []);

    const base = {
      title: ev.title || "",
      groupId: ev.groupId || "",
      group: ev.group || ev.category || "",
      date: ev.startAt ? String(ev.startAt).slice(0, 10) : "",
      startTime: "",
      endTime: "",
      locationName: ev.locationName || ev.location || "",
      address: ev.address || "",
      city: ev.city || "",
      state: ev.state || "",
      zipCode: ev.zipCode || "",
      description: ev.description || "",
      capacity: ev.capacity ?? "",
      price: ev.price ?? "",
    };

    if (ev.startAt) {
      const d = new Date(ev.startAt);
      base.startTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    if (ev.endAt) {
      const d2 = new Date(ev.endAt);
      base.endTime = `${String(d2.getHours()).padStart(2, "0")}:${String(d2.getMinutes()).padStart(2, "0")}`;
    }

    setForm(base);
  }, [isOpen, event]);

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  // === Guarded + downscaling cover upload ===
  const handleCoverUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const mb = f.size / (1024 * 1024);

    if (!f.type.startsWith("image/")) {
      toast.error("Cover must be an image.");
      e.target.value = "";
      return;
    }
    if (mb > MAX_IMAGE_MB) {
      toast.error(`Cover image is too large (${mb.toFixed(1)}MB). Max ${MAX_IMAGE_MB}MB.`);
      e.target.value = "";
      return;
    }

    try {
      const dataUrl = await downscaleImage(f);
      setCoverImage(dataUrl);
    } catch {
      toast.error("Failed to process image");
    } finally {
      e.target.value = "";
    }
  };

  // === Guarded + downscaling media upload ===
  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const mb = f.size / (1024 * 1024);

      if (f.type.startsWith("image/")) {
        if (mb > MAX_IMAGE_MB) {
          toast.error(`Image "${f.name}" is too large (${mb.toFixed(1)}MB). Max ${MAX_IMAGE_MB}MB.`);
          continue;
        }
        try {
          const dataUrl = await downscaleImage(f);
          setAdditionalMedia((prev) => [
            ...prev,
            { type: "image", url: dataUrl, title: f.name },
          ]);
        } catch {
          toast.error(`Failed to process ${f.name}`);
        }
      } else if (f.type.startsWith("video/")) {
        if (mb > MAX_VIDEO_MB) {
          toast.error(`Video "${f.name}" is too large (${mb.toFixed(1)}MB). Max ${MAX_VIDEO_MB}MB.`);
          continue;
        }
        const reader = new FileReader();
        reader.onload = () =>
          setAdditionalMedia((prev) => [
            ...prev,
            { type: "video", url: reader.result, title: f.name },
          ]);
        reader.readAsDataURL(f);
      } else {
        toast.error(`Unsupported file type: ${f.type || "unknown"}`);
      }
    }
    e.target.value = "";
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((arr) => [...arr, t]);
    setTagInput("");
  };
  const removeTag = (t) => setTags((arr) => arr.filter((x) => x !== t));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Build startAt/endAt from date + time inputs
      const toISO = (dateStr, timeStr) => {
        if (!dateStr) return null;
        const time = timeStr && timeStr.length ? timeStr : "09:00";
        return new Date(`${dateStr}T${time}:00`).toISOString();
      };

      const mediaPayload = (additionalMedia || []).slice(0, 8).map((m) => {
        const item = typeof m === "string" ? { type: "image", url: m } : m || {};
        let type = item.type;
        if (!type) {
            if (item.url?.startsWith("data:video") || /\.(mp4|mov|webm)(\?|$)/i.test(item.url || "")) type = "video";
            else type = "image";
        }
        return {
            type,
            url: item.url || "",
            title: (item.title || "").trim(),
            by: (item.by || "").trim(),          // <-- keep the credit
        };
        });

    const payload = {
        title: form.title?.trim(),
        description: form.description?.trim() || "",
        image: coverImage === null ? "" : (coverImage || undefined),
        media: mediaPayload,       // keeps title + by
        tags,
        // 🔑 Hosted by (Fandom Group)
        groupId: form.groupId || undefined,
        group: form.group || "",   // display name
        category: form.group || "",// keep your existing UI expectations
        // Location / timing
        locationName: form.locationName || "",
        address: form.address || "",
        city: form.city || "",
        state: form.state || "",
        zipCode: form.zipCode || "",
        startAt: toISO(form.date, form.startTime),
        endAt: toISO(form.date, form.endTime),
    };


      // Basic client validation
      if (!payload.title) throw new Error("Title is required");
      if (!payload.startAt) throw new Error("Date (start) is required");

      if (!event?._id) {
        // CREATE
        await api("/api/organizer/events", {
          method: "POST",
          body: payload,
        });
        toast.success("Event created (pending approval)");
      } else {
        // EDIT
        await api(`/api/organizer/events/${event._id}`, {
          method: "PATCH",
          body: payload,
        });
        toast.success("Event updated (re-submitted for approval)");
      }

      onClose();
      onSaved?.();
    } catch (err) {
      toast.error(err?.message || "Failed to save event");
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
          maxW="760px"
          w="full"
          maxH="90vh"
          overflowY="auto"
          onClick={(e) => e.stopPropagation()}
          boxShadow="lg"
        >
          {/* Header */}
          <Flex justify="space-between" align="center" p={{ base: 4, md: 6 }} borderBottomWidth="1px">
            <Heading size="md">{event ? "Edit Event" : "Create New Event"}</Heading>
            <Button variant="ghost" rounded="full" onClick={onClose} size="sm">
              ✕
            </Button>
          </Flex>

          {/* Body */}
          <VStack spacing={6} p={{ base: 4, md: 6 }} align="stretch">
            {/* Cover Image */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Event Cover Image
              </Text>

              <Box
                borderWidth="2px"
                borderStyle="dashed"
                borderColor="gray.300"
                rounded="xl"
                p={6}
                textAlign="center"
                bg={coverImage ? "transparent" : "gray.50"}
                minH="140px"
                onClick={() => coverInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    coverInputRef.current?.click();
                  }
                }}
              >
                {coverImage ? (
                  <Image src={coverImage || undefined} w="full" h="200px" objectFit="cover" rounded="lg" />
                ) : (
                  <VStack spacing={2}>
                    <Text fontSize="3xl">📷</Text>
                    <Text fontSize="sm" color="gray.600">
                      Click to upload a cover image
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      PNG, JPG, GIF up to 10MB
                    </Text>
                  </VStack>
                )}
              </Box>

              {/* Replace / Remove cover controls */}
              {coverImage && (
                <HStack mt={2} spacing={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    rounded="full"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    Replace cover
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="red"
                    rounded="full"
                    onClick={() => {
                      setCoverImage(null); // mark for deletion on save
                      toast.success("Cover image will be removed on save");
                    }}
                  >
                    Remove cover
                  </Button>
                </HStack>
              )}

              {/* Hidden input that opens the file picker */}
              <Input
                ref={coverInputRef}
                id="cover-file"
                type="file"
                accept="image/*"
                display="none"
                onChange={handleCoverUpload}
              />
            </Box>

            {/* Additional Media (with Title / By) */}
            <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>
                Additional Media
            </Text>

            <HStack spacing={4} overflowX="auto" pb={2} align="stretch">
                {additionalMedia.map((m, idx) => {
                const media = typeof m === "string" ? { type: "image", url: m } : m || {};
                const remove = () => setAdditionalMedia((arr) => arr.filter((_, i) => i !== idx));

                let thumb = null;
                if (media.type === "image") {
                    thumb = media.url ? (
                    <Image src={media.url || undefined} w="140px" h="100px" objectFit="cover" rounded="md" />
                    ) : (
                    <Box w="140px" h="100px" bg="gray.100" rounded="md" display="flex" alignItems="center" justifyContent="center">
                        🖼️
                    </Box>
                    );
                } else if (media.type === "video") {
                    thumb = media.url ? (
                    <video
                        src={media.url}
                        width="140"
                        height="100"
                        style={{ borderRadius: 8, background: "#f3f3f3" }}
                        controls
                    />
                    ) : (
                    <Box w="140px" h="100px" bg="gray.100" rounded="md" display="flex" alignItems="center" justifyContent="center">
                        🎬
                    </Box>
                    );
                } else {
                    // youtube
                    thumb = (
                    <Box
                        w="140px"
                        h="100px"
                        bg="gray.100"
                        rounded="md"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        overflow="hidden"
                        px={2}
                    >
                        <Text fontSize="xs" textAlign="center">YouTube</Text>
                    </Box>
                    );
                }

                return (
                    <Box key={idx} borderWidth="1px" borderColor="gray.200" rounded="lg" p={2} minW="240px">
                    {thumb}
                    <VStack align="stretch" spacing={2} mt={2}>
                        <Input
                        size="sm"
                        placeholder="Title"
                        value={media.title || ""}
                        onChange={(e) => updateMediaAt(idx, "title", e.target.value)}
                        rounded="md"
                        />
                        <Input
                        size="sm"
                        placeholder='By (e.g., "Photo by Jane")'
                        value={media.by || ""}
                        onChange={(e) => updateMediaAt(idx, "by", e.target.value)}
                        rounded="md"
                        />
                        {/* For YouTube, allow user to correct URL inline */}
                        {media.type === "youtube" && (
                        <Input
                            size="sm"
                            placeholder="YouTube URL"
                            value={media.url || ""}
                            onChange={(e) => updateMediaAt(idx, "url", e.target.value)}
                            rounded="md"
                        />
                        )}
                        <HStack justify="space-between">
                        <Badge variant="subtle">{media.type}</Badge>
                        <Button size="xs" colorScheme="red" rounded="full" onClick={remove}>
                            ✕ Remove
                        </Button>
                        </HStack>
                    </VStack>
                    </Box>
                );
                })}

                {/* Add tile */}
                <Box
                borderWidth="2px"
                borderStyle="dashed"
                borderColor="gray.300"
                rounded="md"
                w="110px"
                h="110px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                position="relative"
                flexShrink={0}
                cursor="pointer"
                >
                <Text fontSize="2xl" color="gray.400">+</Text>
                <Input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    position="absolute"
                    inset="0"
                    opacity="0"
                    cursor="pointer"
                    onChange={handleMediaUpload}
                />
                </Box>
            </HStack>

            {/* YouTube adder with immediate slot creation */}
            <HStack mt={3} spacing={2}>
                <Input
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                placeholder="Paste a YouTube URL and click Add"
                rounded="lg"
                />
                <Button
                variant="outline"
                rounded="full"
                onClick={() => {
                    // reuse your normalize function if you have it; otherwise accept raw
                    let norm = youtubeInput.trim();
                    try {
                    const u = new URL(norm);
                    if (u.hostname === "youtu.be") {
                        norm = `https://www.youtube.com/watch?v=${u.pathname.slice(1)}`;
                    } else if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/shorts/")) {
                        norm = `https://www.youtube.com/watch?v=${u.pathname.split("/")[2]}`;
                    }
                    } catch {}
                    if (!norm) return toast.error("Invalid YouTube URL");
                    setAdditionalMedia((arr) => [...arr, { type: "youtube", url: norm, title: "", by: "" }]);
                    setYoutubeInput("");
                    toast.success("YouTube video added");
                }}
                >
                Add YouTube
                </Button>
            </HStack>

            <Text fontSize="xs" color="gray.500" mt={2}>
                Add photos, videos, or paste a YouTube URL. Each media can have a Title and a “By …” credit.
            </Text>
            </Box>

            {/* Title + Group (with autosuggest) */}
<Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
  <GridItem>
    <Text fontSize="sm" fontWeight="medium" mb={2}>
      Event Title *
    </Text>
    <Input
      name="title"
      value={form.title}
      onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
      placeholder="Enter event title"
      rounded="lg"
    />
  </GridItem>

  <GridItem>
    <Text fontSize="sm" fontWeight="medium" mb={2}>
      Fandom Group *
            </Text>
            <Box position="relative">
            <Input
                name="group"
                value={groupQuery}
                onChange={onGroupInputChange}
                onBlur={() => setTimeout(() => setShowGroupSuggest(false), 120)}
                placeholder="Search and select a group"
                rounded="lg"
                aria-autocomplete="list"
                aria-expanded={showGroupSuggest}
                aria-controls="group-suggest"
            />
            {showGroupSuggest && groupSuggestions.length > 0 && (
                <Box
                id="group-suggest"
                position="absolute"
                top="100%"
                left="0"
                right="0"
                mt={1}
                bg="white"
                borderWidth="1px"
                borderColor="gray.200"
                rounded="md"
                shadow="md"
                zIndex={20}
                maxH="260px"
                overflowY="auto"
                >
                {groupSuggestions.map((g) => {
                    const id = g._id || g.id;
                    return (
                    <Flex
                        key={id}
                        align="center"
                        justify="space-between"
                        px={3}
                        py={2}
                        cursor="pointer"
                        _hover={{ bg: "pink.50" }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectGroup(g)}
                    >
                        <Box>
                        <Text fontWeight="medium">{g.name}</Text>
                        <Text fontSize="xs" color="gray.600">
                            {(g.category || "General")} • {(g.members?.length ?? g.members ?? 0)} members
                        </Text>
                        </Box>
                        <Badge variant="subtle">Select</Badge>
                    </Flex>
                    );
                })}
                </Box>
            )}
            </Box>
        </GridItem>
        </Grid>

        {/* Date & Time */}
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap={4} mt={2}>
        <GridItem>
            <Text fontSize="sm" fontWeight="medium" mb={2}>
            Date *
            </Text>
            <Input
            name="date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
            rounded="lg"
            aria-required="true"
            />
        </GridItem>

        <GridItem>
            <Text fontSize="sm" fontWeight="medium" mb={2}>
            Start Time (optional)
            </Text>
            <Input
            name="startTime"
            type="time"
            value={form.startTime}
            onChange={(e) => setForm((s) => ({ ...s, startTime: e.target.value }))}
            rounded="lg"
            />
        </GridItem>

        <GridItem>
            <Text fontSize="sm" fontWeight="medium" mb={2}>
            End Time (optional)
            </Text>
            <Input
            name="endTime"
            type="time"
            value={form.endTime}
            onChange={(e) => setForm((s) => ({ ...s, endTime: e.target.value }))}
            rounded="lg"
            />
        </GridItem>
        </Grid>



            {/* Location */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Location Name
              </Text>
              <Input
                name="locationName"
                value={form.locationName}
                onChange={onChange}
                placeholder="Enter venue name"
                rounded="lg"
              />
            </Box>

            <Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap={4}>
              <GridItem>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Address
                </Text>
                <Input
                  name="address"
                  value={form.address}
                  onChange={onChange}
                  placeholder="Street address"
                  rounded="lg"
                />
              </GridItem>
              <GridItem>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  City
                </Text>
                <Input
                  name="city"
                  value={form.city}
                  onChange={onChange}
                  placeholder="City"
                  rounded="lg"
                />
              </GridItem>
            </Grid>

            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
              <GridItem>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  State
                </Text>
                <Input
                  name="state"
                  value={form.state}
                  onChange={onChange}
                  placeholder="State/Province"
                  rounded="lg"
                />
              </GridItem>
              <GridItem>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Zip Code
                </Text>
                <Input
                  name="zipCode"
                  value={form.zipCode}
                  onChange={onChange}
                  placeholder="Postal/Zip code"
                  rounded="lg"
                />
              </GridItem>
            </Grid>

            {/* Capacity / Price (optional) */}
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
              <GridItem>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Capacity (optional)
                </Text>
                <Input
                  name="capacity"
                  value={form.capacity}
                  onChange={onChange}
                  placeholder="e.g., 100"
                  rounded="lg"
                />
              </GridItem>
              <GridItem>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Price (optional)
                </Text>
                <Input
                  name="price"
                  value={form.price}
                  onChange={onChange}
                  placeholder="e.g., 0 (free)"
                  rounded="lg"
                />
              </GridItem>
            </Grid>

            {/* Description */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Event Description
              </Text>
              <Textarea
                name="description"
                value={form.description}
                onChange={onChange}
                rows={6}
                placeholder="Describe your event..."
                rounded="lg"
              />
            </Box>

            {/* Tags */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Event Tags
              </Text>
              <Flex wrap="wrap" gap={2} mb={2}>
                {tags.map((tag) => (
                  <Box
                    key={tag}
                    px={3}
                    py={1}
                    rounded="full"
                    borderWidth="1px"
                    borderColor="gray.300"
                    display="inline-flex"
                    alignItems="center"
                    gap={2}
                    bg="gray.50"
                  >
                    <Text>{tag}</Text>
                    <Box as="button" onClick={() => removeTag(tag)} fontWeight="bold" fontSize="xs">
                      ✕
                    </Box>
                  </Box>
                ))}
              </Flex>
              <HStack>
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Type to add tags..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  rounded="lg"
                />
                <Button variant="outline" rounded="full" onClick={addTag}>
                  Add
                </Button>
              </HStack>
            </Box>
          </VStack>

          {/* Footer */}
          <Flex justify="flex-end" gap={3} p={{ base: 4, md: 6 }} borderTopWidth="1px">
            <Button variant="outline" rounded="full" onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="pink" rounded="full" isLoading={loading} onClick={handleSubmit}>
              {event ? "Submit Edit" : "Create Event"}
            </Button>
          </Flex>
        </Box>
      </Box>
    </>
  );
}

/* ======================= Announcement Modal ======================= */
function AnnouncementModal({ isOpen, onClose, announcement = null, onPosted, events = [] }) {
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    eventId: announcement?.eventId || "",
    title: announcement?.title || "",
    content: announcement?.content || "",
  });

  // Event autosuggest state
  const [eventQuery, setEventQuery] = React.useState("");
  const [eventSuggestions, setEventSuggestions] = React.useState([]);
  const [showEventSuggest, setShowEventSuggest] = React.useState(false);

  // reset when opened / announcement changes
  React.useEffect(() => {
    if (!isOpen) return;
    setForm({
      eventId: announcement?.eventId || "",
      title: announcement?.title || "",
      content: announcement?.content || "",
    });

    if (announcement?.eventId && events.length) {
      const ev = events.find((e) => String(e._id) === String(announcement.eventId));
      setEventQuery(ev?.title || announcement.eventId || "");
    } else {
      setEventQuery("");
    }
    setEventSuggestions([]);
    setShowEventSuggest(false);
  }, [isOpen, announcement, events]);

  const onChange = (e) =>
    setForm((s) => ({
      ...s,
      [e.target.name]: e.target.value,
    }));

  const onEventInputChange = (e) => {
    const val = e.target.value;
    setEventQuery(val);

    if (!val.trim()) {
      setShowEventSuggest(false);
      setEventSuggestions([]);
      setForm((s) => ({ ...s, eventId: "" }));
      return;
    }

    const lc = val.toLowerCase();
    const matches = events.filter((ev) =>
      (ev.title || "").toLowerCase().includes(lc)
    );
    setEventSuggestions(matches.slice(0, 8));
    setShowEventSuggest(matches.length > 0);
  };

  const selectEvent = (ev) => {
    setForm((s) => ({ ...s, eventId: ev._id }));
    setEventQuery(ev.title || "");
    setShowEventSuggest(false);
  };

const handleSubmit = async () => {
  setLoading(true);
  try {
    if (!form.eventId) throw new Error("Please select an event.");
    if (!eventQuery.trim()) throw new Error("Event title is required.");

    if (!form.title.trim()) throw new Error("Announcement title is required.");
    if (!form.content.trim()) throw new Error("Announcement content is required.");

    await api("/api/organizer/announcements", {
      method: "POST",
      body: form,
    });

    toast.success("Announcement posted");
    onClose();
    onPosted?.();
  } catch (err) {
    toast.error(err?.message || "Failed to post announcement");
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
          maxW="640px"
          w="full"
          onClick={(e) => e.stopPropagation()}
          boxShadow="lg"
        >
          <Flex justify="space-between" align="center" p={{ base: 4, md: 6 }} borderBottomWidth="1px">
            <Heading size="md">Create Announcement</Heading>
            <Button variant="ghost" rounded="full" onClick={onClose} size="sm">
              ✕
            </Button>
          </Flex>

          <VStack spacing={4} p={{ base: 4, md: 6 }} align="stretch">
            {/* Event auto-suggest */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Related Event
              </Text>
              <Box position="relative">
                <Input
                  value={eventQuery}
                  onChange={onEventInputChange}
                  onBlur={() => setTimeout(() => setShowEventSuggest(false), 120)}
                  placeholder="Start typing to select one of your events."
                  rounded="lg"
                  aria-autocomplete="list"
                  aria-expanded={showEventSuggest}
                  aria-controls="announcement-event-suggest"
                />
                {showEventSuggest && eventSuggestions.length > 0 && (
                  <Box
                    id="announcement-event-suggest"
                    position="absolute"
                    top="100%"
                    left="0"
                    right="0"
                    mt={1}
                    bg="white"
                    borderWidth="1px"
                    borderColor="gray.200"
                    rounded="md"
                    shadow="md"
                    zIndex={20}
                    maxH="260px"
                    overflowY="auto"
                  >
                    {eventSuggestions.map((ev) => (
                      <Flex
                        key={ev._id}
                        align="center"
                        justify="space-between"
                        px={3}
                        py={2}
                        cursor="pointer"
                        _hover={{ bg: "pink.50" }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectEvent(ev)}
                      >
                        <Box>
                          <Text fontWeight="medium">{ev.title}</Text>
                          <Text fontSize="xs" color="gray.600">
                            {ev.group || ev.category || "Event"} •{" "}
                            {ev.startAt ? new Date(ev.startAt).toLocaleDateString() : ""}
                          </Text>
                        </Box>
                        <Badge variant="subtle">Select</Badge>
                      </Flex>
                    ))}
                  </Box>
                )}
              </Box>
              {form.eventId && (
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Event ID: {form.eventId}
                </Text>
              )}
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Announcement Title
              </Text>
              <Input
                name="title"
                value={form.title}
                onChange={onChange}
                placeholder="Enter announcement title"
                rounded="lg"
              />
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Announcement Content
              </Text>
              <Textarea
                name="content"
                value={form.content}
                onChange={onChange}
                placeholder="Enter announcement details..."
                rows={6}
                rounded="lg"
              />
            </Box>
          </VStack>

          <Flex justify="flex-end" gap={3} p={{ base: 4, md: 6 }} borderTopWidth="1px">
            <Button variant="outline" rounded="full" onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="pink" rounded="full" isLoading={loading} onClick={handleSubmit}>
              Post Announcement
            </Button>
          </Flex>
        </Box>
      </Box>
    </>
  );
}

/* ======================= Main Organizer Dashboard ======================= */
export default function OrganizerDashboard() {
  const { isLoaded } = useUser();
  const [activeTab, setActiveTab] = React.useState("my-events");
  const navigate = useNavigate();
    // NEW: announcements state
  const [announcements, setAnnouncements] = React.useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = React.useState(false);


  // events & attendees
  const [events, setEvents] = React.useState([]);
  const [loadingEvents, setLoadingEvents] = React.useState(false);

  const [selectedEventId, setSelectedEventId] = React.useState("");
  const [attendees, setAttendees] = React.useState([]);
  const [loadingAttendees, setLoadingAttendees] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // modals
  const [createGroupOpen, setCreateGroupOpen] = React.useState(false);
  const [eventModalOpen, setEventModalOpen] = React.useState(false);
  const [announcementModalOpen, setAnnouncementModalOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState(null);

  // load my events
  const loadEvents = React.useCallback(async () => {
    setLoadingEvents(true);
    try {
      // ✅ Use the correct backend route that exists
      const rows = await api("/api/organizer/events/mine");
      setEvents(Array.isArray(rows) ? rows : []);
      if (!selectedEventId && rows?.length) setSelectedEventId(rows[0]._id);
    } catch (e) {
      toast.error(e?.message || "Failed to load events");
    } finally {
      setLoadingEvents(false);
    }
  }, [selectedEventId]);

  React.useEffect(() => {
    if (isLoaded) loadEvents();
  }, [isLoaded, loadEvents]);

  // load attendees when event changes
  const loadAttendees = React.useCallback(async () => {
    if (!selectedEventId) {
      setAttendees([]);
      return;
    }
    setLoadingAttendees(true);
    try {
      const rows = await api(`/api/organizer/events/${selectedEventId}/attendees`);
      setAttendees(Array.isArray(rows) ? rows : []);
    } catch (e) {
      toast.error(e?.message || "Failed to load attendees");
    } finally {
      setLoadingAttendees(false);
    }
  }, [selectedEventId]);

const loadAnnouncements = React.useCallback(async () => {
  setLoadingAnnouncements(true);
  try {
  // Matches the backend route we added: GET /api/organizer/announcements/mine
  const res = await api("/api/organizer/announcements/mine");
  const items = res?.items || [];
  setAnnouncements(items);
  } catch (e) {
    toast.error(e?.message || "Failed to load announcements");
  } finally {
    setLoadingAnnouncements(false);
  }
}, []);

  React.useEffect(() => {
    loadAttendees();
  }, [loadAttendees]);

  React.useEffect(() => {
    if (activeTab === "announcements") {
    loadAnnouncements();
    }
  }, [activeTab, loadAnnouncements]);

  const openEditModal = (ev) => {
    setEditingEvent(ev);
    setEventModalOpen(true);
  };
  const closeEventModal = () => {
    setEventModalOpen(false);
    setEditingEvent(null);
  };
  

  const deleteEvent = async (id) => {
    if (!id) return;
    if (!confirm("Delete this event? This action cannot be undone.")) return;
    try {
      // NOTE: ensure you have a matching DELETE route on the backend:
      // e.g., server/routes/events.organizer.js -> r.delete("/:id", requireAuth, requireRole("organizer"), ...)
      await api(`/api/organizer/events/${id}`, { method: "DELETE" });
      toast.success("Event deleted");
      setEvents((arr) => arr.filter((e) => e._id !== id));
      if (selectedEventId === id) setSelectedEventId("");
    } catch (e) {
      toast.error(e?.message || "Failed to delete event");
    }
  };

  // filtered attendees by search
  const filteredAttendees = attendees.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();

    const name = (
      a?.name ||
      a?.userName ||
      a?.user?.name ||
      ""
    ).toLowerCase();

    const email = (
      a?.email ||
      a?.userEmail ||
      a?.user?.email ||
      ""
    ).toLowerCase();

    const eventTitle = (
      a?.eventTitle ||
      a?.event?.title ||
      events.find((e) => String(e._id) === String(a.eventId))?.title ||
      ""
    ).toLowerCase();

    return (
      name.includes(q) ||
      email.includes(q) ||
      eventTitle.includes(q)
    );
  });


    // === Derived analytics: attendee counts per event (live truth based on events state) ===
  const eventsWithCounts = events.map((e) => {
    const count =
      typeof e.attendeesCount === "number"
        ? e.attendeesCount
        : Array.isArray(e.attendees)
        ? e.attendees.length
        : 0;

    return { ...e, _popCount: count };
  });

  const popularEvents = [...eventsWithCounts].sort(
    (a, b) => b._popCount - a._popCount
  );
  const topPopular = popularEvents.slice(0, 3);
  const maxPopCount = topPopular[0]?._popCount || 1;


  if (!isLoaded) {
    return (
      <Container maxW="1200px" pt={{ base: 24, md: 28 }} pb={10}>
        <Text>Loading…</Text>
      </Container>
    );
  }

  return (
    <>
      <Container maxW="1200px" pt={{ base: 24, md: 28 }} pb={12}>
        {/* Header */}
        <Flex justify="space-between" align="start" mb={6} gap={4} flexWrap="wrap">
          <Box>
            <Heading size="xl" mb={1}>
              Organizer Dashboard
            </Heading>
            <Text color="gray.600">Manage your events and attendees</Text>
          </Box>
          <HStack gap={2}>
            <Button variant="outline" rounded="full">
              Drafts
            </Button>
            <Button
              colorScheme="pink"
              rounded="full"
              onClick={() => setEventModalOpen(true)}
              size="md"
            >
              + Create Event
            </Button>
            <Button
              variant="outline"
              rounded="full"
              onClick={() => setCreateGroupOpen(true)}
              size="md"
            >
              + Create Group
            </Button>
          </HStack>
        </Flex>

        {/* Tabs (pill style) */}
        <HStack
          spacing={2}
          mb={8}
          overflowX="auto"
          py={1}
          bg="gray.50"
          rounded="full"
          px={2}
          borderWidth="1px"
          borderColor="gray.200"
        >
          {["My Events", "Attendees", "Announcements", "Analytics"].map((tab) => {
            const val = tab.toLowerCase().replace(" ", "-");
            const active = activeTab === val;
            return (
              <Button
                key={tab}
                size="sm"
                rounded="full"
                variant={active ? "solid" : "ghost"}
                colorScheme="pink"
                onClick={() => setActiveTab(val)}
              >
                {tab}
              </Button>
            );
          })}
        </HStack>

        {/* ======================= My Events ======================= */}
        {activeTab === "my-events" && (
          <Card>
            <Heading size="md" mb={5}>
              My Events
            </Heading>

            {/* Desktop header row */}
            <Grid
              templateColumns="2fr 2fr 1fr 1fr 1.5fr"
              gap={4}
              pb={3}
              borderBottomWidth="1px"
              display={{ base: "none", md: "grid" }}
            >
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                Event
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

            {/* Rows */}
            <VStack spacing={4} align="stretch" mt={4}>
              {loadingEvents && <Text color="gray.500">Loading events…</Text>}
              {!loadingEvents &&
                events.map((ev) => (
                  <Grid
                    key={ev._id}
                    templateColumns={{ base: "1fr", md: "2fr 2fr 1fr 1fr 1.5fr" }}
                    gap={4}
                    alignItems="center"
                    p={4}
                    borderWidth="1px"
                    borderRadius="xl"
                    _hover={{ bg: "gray.50" }}
                  >
                    <HStack spacing={3}>
                      {ev.image ? (
                        <Image src={ev.image || undefined} w="56px" h="56px" objectFit="cover" rounded="lg" />
                      ) : (
                        <Box w="56px" h="56px" bg="gray.100" rounded="lg" display="flex" alignItems="center" justifyContent="center">
                          🖼️
                        </Box>
                      )}
                      <Box>
                        <Text fontWeight="semibold">{ev.title}</Text>
                        <Text fontSize="sm" color="gray.600">
                          {ev.group || ev.category}
                        </Text>
                      </Box>
                    </HStack>

                    <Box>
                      <Text fontWeight="medium">{formatDate(ev.startAt || ev.date)}</Text>
                      {ev.time && (
                        <Text fontSize="sm" color="gray.600">
                          {ev.time}
                        </Text>
                      )}
                    </Box>

                    <Text fontWeight="semibold">
                      {typeof ev.attendeesCount === "number" ? ev.attendeesCount : ev.attendees?.length || 0}
                    </Text>

                    {(() => {
                      const s = getStatusStyles(ev.status);
                      return (
                        <Box
                          as="span"
                          px={3}
                          py={1}
                          borderRadius="full"
                          fontSize="xs"
                          fontWeight="semibold"
                          bg={s.bg}
                          color={s.color}
                          borderWidth="1px"
                          borderColor={s.borderColor}
                          textTransform="capitalize"
                        >
                          {s.label}
                        </Box>
                      );
                    })()}


                    <HStack spacing={2}>
                      <Button
                        variant="ghost"
                        rounded="full"
                        size="sm"
                        onClick={() => navigate(`/events/${ev._id}`)}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        colorScheme="pink"
                        rounded="full"
                        size="sm"
                        onClick={() => openEditModal(ev)}
                        isDisabled={ev.status === "cancelled"}
                        title={ev.status === "cancelled" ? "Cancelled events can't be edited" : ""}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        rounded="full"
                        size="sm"
                        onClick={() => deleteEvent(ev._id)}
                      >
                        Delete
                      </Button>
                    </HStack>
                  </Grid>
                ))}
              {!loadingEvents && !events.length && (
                <Text color="gray.500">No events yet. Click “Create Event”.</Text>
              )}
            </VStack>
          </Card>
        )}

        {/* ======================= Attendees ======================= */}
        {activeTab === "attendees" && (
          <Card>
            <Heading size="md" mb={5}>
              Manage Attendees
            </Heading>

            <Flex gap={3} mb={5} flexWrap="wrap">
              <Box position="relative" flex="1" minW="260px">
                <Input
                  placeholder="Search attendees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  pl={10}
                  rounded="full"
                />
                <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color="gray.400">
                  🔍
                </Box>
              </Box>

              <Box
                as="select"
                minW="220px"
                borderWidth="1px"
                rounded="full"
                p={2}
                bg="white"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                <option value="">All Events</option>
                {events.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.title}
                  </option>
                ))}
              </Box>

              <Button variant="outline" rounded="full" colorScheme="pink" onClick={loadAttendees}>
                Refresh
              </Button>
            </Flex>

            {/* Desktop header */}
            <Grid
              templateColumns="1.6fr 1.2fr 1fr 1fr"
              gap={4}
              pb={3}
              borderBottomWidth="1px"
              display={{ base: "none", lg: "grid" }}
            >
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                Name / Email
              </Text>
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                Event
              </Text>
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                RSVP Date
              </Text>
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                Status
              </Text>
            </Grid>

            <VStack spacing={3} mt={4} align="stretch">
              {loadingAttendees && <Text color="gray.500">Loading attendees…</Text>}
              {!loadingAttendees &&
                filteredAttendees.map((a) => (
                  <Grid
                    key={a._id || `${a.userId}-${a.eventId}`}
                    templateColumns={{ base: "1fr", lg: "1.6fr 1.2fr 1fr 1fr" }}
                    gap={4}
                    alignItems="center"
                    p={4}
                    borderWidth="1px"
                    borderRadius="xl"
                    _hover={{ bg: "gray.50" }}
                  >
                    <Box>
                      <Text fontWeight="medium">{a.name || a.userName || a.user?.name || "User"}</Text>
                      <Text fontSize="sm" color="gray.600">
                        {a.email || a.userEmail || a.user?.email}
                      </Text>
                    </Box>

                    <Text fontSize="sm">{a.eventTitle || events.find((e) => e._id === a.eventId)?.title}</Text>
                    <Text fontSize="sm">
                      {a.rsvpedAt || a.rsvpAt || a.createdAt
                        ? new Date(a.rsvpedAt || a.rsvpAt || a.createdAt).toLocaleDateString()
                        : "-"}
                    </Text>


                    <Badge
                      colorScheme={
                        a.status === "confirmed" ? "green" : a.status === "canceled" ? "red" : "yellow"
                      }
                      rounded="full"
                      px={3}
                      py={1}
                      w="fit-content"
                    >
                      {a.status || "pending"}
                    </Badge>
                  </Grid>
                ))}
              {!loadingAttendees && !filteredAttendees.length && (
                <Text color="gray.500">No attendees found.</Text>
              )}
            </VStack>
          </Card>
        )}

        {/* ======================= Announcements ======================= */}
        {activeTab === "announcements" && (
          <Card>
            <Flex justify="space-between" align="center" mb={5} flexWrap="wrap" gap={3}>
            <Heading size="md">Announcements</Heading>
            <Flex gap={2}>
            <Button variant="outline" rounded="full" onClick={loadAnnouncements}>
              Refresh
            </Button>
            <Button colorScheme="pink" rounded="full" onClick={() => setAnnouncementModalOpen(true)}>
              New Announcement
            </Button>
          </Flex>
        </Flex>

        {loadingAnnouncements && <Text color="gray.500">Loading announcements…</Text>}

        {!loadingAnnouncements && announcements.length === 0 && (
          <Text color="gray.500">No announcements yet. Click “New Announcement”.</Text>
        )}

        <VStack spacing={4} align="stretch">
          {announcements.map((a) => (
            <Grid
              key={a._id}
              templateColumns={{ base: "1fr", md: "2fr 1fr 1fr" }}
              gap={4}
              alignItems="start"
              p={4}
              borderWidth="1px"
              borderRadius="xl"
              _hover={{ bg: "gray.50" }}
            >
            <Box>
              <Text fontWeight="semibold" mb={1}>{a.title}</Text>
              <Text fontSize="sm" color="gray.700">{a.content}</Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600">
                {a.eventId ? `Event: ${a.eventId}` : "Broadcast"}
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.500">
                {new Date(a.createdAt).toLocaleString()}
              </Text>
            </Box>
          </Grid>
        ))}
      </VStack>
          </Card>
        )}

        {/* ======================= Analytics (placeholder UI) ======================= */}
        {activeTab === "analytics" && (
          <VStack spacing={6} align="stretch">
            <Card>
              <Heading size="md" mb={5}>
                Event Analytics
              </Heading>
              <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6}>
                <Box bg="gray.50" rounded="xl" p={5} borderWidth="1px" borderColor="gray.200">
                  <Text fontSize="sm" color="gray.600" mb={1}>
                    Total Events
                  </Text>
                  <Heading size="xl">{events.length}</Heading>
                </Box>
                <Box bg="gray.50" rounded="xl" p={5} borderWidth="1px" borderColor="gray.200">
                  <Text fontSize="sm" color="gray.600" mb={1}>
                    Total RSVPs
                  </Text>
                  <Heading size="xl">
                    {events.reduce((sum, e) => sum + (e.attendeesCount || e.attendees?.length || 0), 0)}
                  </Heading>
                </Box>
                <Box bg="gray.50" rounded="xl" p={5} borderWidth="1px" borderColor="gray.200">
                  <Text fontSize="sm" color="gray.600" mb={1}>
                    Approved Events
                  </Text>
                  <Heading size="xl">
                    {events.filter((e) => e.status === "approved").length}
                  </Heading>
                </Box>
              </Grid>
              <Separator my={6} />
              <Heading size="sm" mb={3}>
                Event Popularity
              </Heading>
              <Flex gap={4} h="260px" align="flex-end">
                {topPopular.map((e, i) => {
                  // 20–90% height based strictly on relative attendee count
                  const ratio = e._popCount / maxPopCount;
                  const h = 20 + ratio * 70;

                  return (
                    <Box
                      key={e._id}
                      flex="1"
                      bg={["pink.400", "pink.500", "pink.300"][i % 3]}
                      rounded="xl"
                      h={`${h}%`}
                      display="flex"
                      flexDir="column"
                      alignItems="center"
                      justifyContent="flex-end"
                      pb={3}
                    >
                      <Text color="white" fontSize="xs" mb={1}>
                        {e._popCount} RSVP{e._popCount === 1 ? "" : "s"}
                      </Text>
                      <Text color="white" fontSize="sm" textAlign="center" px={2} noOfLines={2}>
                        {e.title}
                      </Text>
                    </Box>
                  );
                })}
                {topPopular.length === 0 && (
                  <Box w="full" textAlign="center" color="gray.500" py={10}>
                    No RSVP data yet.
                  </Box>
                )}
              </Flex>


            </Card>
          </VStack>
        )}

        {/* Modals */}
        <EventModal
          isOpen={eventModalOpen}
          onClose={closeEventModal}
          event={editingEvent}
          onSaved={loadEvents}
        />
        <AnnouncementModal
          isOpen={announcementModalOpen}
          onClose={() => setAnnouncementModalOpen(false)}
          onPosted={async () => {
            toast.success("Announcement posted");
            await loadAnnouncements();
          }}
          events={events}
        />

        <CreateGroupModal
          isOpen={createGroupOpen}
          onClose={() => setCreateGroupOpen(false)}
          onCreated={() => toast.success("Group submitted for approval")}
        />

      </Container>
    </>
  );
}
