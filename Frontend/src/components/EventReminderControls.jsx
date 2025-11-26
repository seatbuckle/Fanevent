// src/components/EventReminderControls.jsx
import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

// helpers to switch minutes <-> { value, unit }
function minutesToValueUnit(offsetMinutes) {
  if (offsetMinutes % 60 === 0 && offsetMinutes >= 60) {
    return { value: offsetMinutes / 60, unit: "hours" };
  }
  return { value: offsetMinutes, unit: "minutes" };
}

function valueUnitToMinutes({ value, unit }) {
  const n = Number(value);
  if (!n || n <= 0) return null;
  return unit === "hours" ? n * 60 : n;
}

export default function EventReminderControls({ eventId }) {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // ----------------- LOAD EXISTING REMINDERS -----------------
  React.useEffect(() => {
    let mounted = true;

    if (!eventId) {
      setRows([{ id: String(Date.now()), value: 1, unit: "hours" }]);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);

    const timeoutMs = 5000;
    const timeoutId = setTimeout(() => {
      if (!mounted) return;
      console.warn("[Reminders] API timeout, using default row");
      setRows([{ id: String(Date.now()), value: 1, unit: "hours" }]);
      setLoading(false);
    }, timeoutMs);

    (async () => {
      try {
        console.log("[Reminders] Fetching /api/event-reminders/", eventId);
        const res = await api(`/api/event-reminders/${eventId}`);
        if (!mounted) return;

        const offsets = Array.isArray(res?.offsets) ? res.offsets : [];

        if (offsets.length === 0) {
          setRows([{ id: String(Date.now()), value: 1, unit: "hours" }]);
        } else {
          setRows(
            offsets.map((m, idx) => {
              const vu = minutesToValueUnit(m);
              return {
                id: `${idx}-${m}`,
                value: vu.value,
                unit: vu.unit,
              };
            })
          );
        }
      } catch (e) {
        console.error("[Reminders] Failed to load reminders", e);
        if (mounted) {
          setRows([{ id: String(Date.now()), value: 1, unit: "hours" }]);
        }
      } finally {
        if (mounted) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [eventId]);

  // ----------------- MUTATIONS -----------------
  const updateRow = (id, patch) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: String(Date.now()), value: 30, unit: "minutes" },
    ]);
  };

    // ----------------- SAVE REMINDERS -----------------
  const save = () => {
    if (saving) return; // prevent double-click

    const minuteOffsets = rows
      .map((r) => valueUnitToMinutes(r))
      .filter((n) => n && n > 0);

    console.log("[Reminders] Saving offsets (minutes):", minuteOffsets);

    if (minuteOffsets.length === 0) {
      toast.error("Add at least one reminder.");
      return;
    }

    const uniqueSorted = Array.from(new Set(minuteOffsets)).sort(
      (a, b) => a - b
    );

    setSaving(true);

    let finished = false;

    // Hard timeout to *always* release the "Saving…" state
    const timeoutId = setTimeout(() => {
      if (finished) return;
      console.warn("[Reminders] Save UI timeout");
      toast.error(
        "Saving reminders took too long. They may still be saved, but please check your connection/backend."
      );
      setSaving(false);
    }, 8000);

    // Fire-and-forget: do NOT await this
    api(`/api/event-reminders/${eventId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offsets: uniqueSorted }),
    })
      .then((res) => {
        finished = true;
        clearTimeout(timeoutId);
        console.log("[Reminders] Save success:", res);
        toast.success("Reminders saved.");
        setSaving(false);
      })
      .catch((err) => {
        finished = true;
        clearTimeout(timeoutId);
        console.error("[Reminders] Failed to save reminders", err);
        toast.error("Couldn’t save reminders. Please try again.");
        setSaving(false);
      });
  };


  // ----------------- RENDER -----------------
  return (
    <Box
      mt={6}
      p={4}
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.200"
      bg="gray.50"
    >
      <Heading size="sm" mb={1}>
        Event reminders
      </Heading>
      <Text fontSize="sm" color="gray.600" mb={3}>
        Choose when you&apos;d like to be reminded before this event starts.
        You can add multiple reminders in minutes or hours.
      </Text>

      {loading ? (
        <Text fontSize="sm" color="gray.500">
          Loading…
        </Text>
      ) : (
        <>
          {/* rows */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}
          >
            {rows.map((row) => (
              <div
                key={row.id}
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={row.value}
                  onChange={(e) =>
                    updateRow(row.id, { value: e.target.value })
                  }
                  style={{
                    width: "110px",
                    padding: "0.25rem 0.5rem",
                    fontSize: "0.875rem",
                    borderRadius: "6px",
                    border: "1px solid #e5e7eb",
                  }}
                />
                <select
                  value={row.unit}
                  onChange={(e) =>
                    updateRow(row.id, { unit: e.target.value })
                  }
                  style={{
                    width: "160px",
                    padding: "0.25rem 0.5rem",
                    fontSize: "0.875rem",
                    borderRadius: "6px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <option value="minutes">minutes before</option>
                  <option value="hours">hours before</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "999px",
                    border: "none",
                    background: "transparent",
                    color: "#ef4444",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={addRow}
              disabled={saving}
              style={{
                fontSize: "0.875rem",
                padding: "0.25rem 0.75rem",
                borderRadius: "999px",
                border: "none",
                background: "transparent",
                color: "#ea4c89",
                cursor: saving ? "default" : "pointer",
              }}
            >
              Add reminder
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{
                fontSize: "0.875rem",
                padding: "0.25rem 0.75rem",
                borderRadius: "999px",
                border: "none",
                background: saving ? "#f9a8d4" : "#ec4899",
                color: "white",
                cursor: saving ? "default" : "pointer",
              }}
            >
              {saving ? "Saving…" : "Save reminders"}
            </button>
          </div>
        </>
      )}
    </Box>
  );
}
