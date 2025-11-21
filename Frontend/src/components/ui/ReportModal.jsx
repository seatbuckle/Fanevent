// src/components/ui/ReportModal.jsx
import React, { useState } from "react";
import { Box, Button, Textarea, Text } from "@chakra-ui/react";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/clerk-react";

// Small helper to resolve API base (Vite dev/prod safe)
const API_BASE = "";

const ReportModal = ({ isOpen, onClose, reportType, targetId, targetName }) => {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getToken, isSignedIn } = useAuth();

  const minLen = 10;
  const maxLen = 1000;
  const isTooShort = reason.trim().length < minLen;

  const handleSubmit = async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to submit a report.");
      return;
    }
    if (isTooShort) {
      toast.error(`Please provide at least ${minLen} characters explaining your report.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken().catch(() => null); // Clerk bearer token

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reportType,
          targetId,
          targetName,
          reason: reason.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        // surface server message if available
        const msg = data?.message || `Failed to submit report (${res.status})`;
        throw new Error(msg);
      }

      toast.success("Report submitted successfully. Thank you for helping keep the community safe.");
      setReason("");
      onClose();
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error(error.message || "Failed to submit report. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Box
      position="fixed"
      inset={0}
      w="100vw"
      h="100vh"
      bg="blackAlpha.600"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={4000}
      px={3}
    >
      <Box
        bg="white"
        borderRadius="md"
        boxShadow="lg"
        p={{ base: 4, md: 6 }}
        maxW="600px"
        w="100%"
      >
        <Text fontSize="lg" fontWeight="bold" mb={4}>
          Report {reportType}
        </Text>

        <Box mb={4}>
          <Text fontSize="sm" color="gray.600" mb={2}>
            You are reporting:
          </Text>
          <Box
            bg="gray.50"
            p={3}
            borderRadius="md"
            border="1px solid"
            borderColor="gray.200"
          >
            <Text fontWeight="semibold" color="gray.800">
              {targetName}
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Type: {reportType}
            </Text>
          </Box>
        </Box>

        <Box>
          <Text as="label" htmlFor="report-reason" fontSize="sm" fontWeight="medium" display="block" mb={2}>
            Reason for Report
          </Text>
          {/* Chakra's Textarea sometimes throws a React warning if theme/provider isn't set up:
              Remove focusBorderColor to silence that warning in your current setup. */}
          <Textarea
            id="report-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`Please explain why you are reporting this (minimum ${minLen} characters)...`}
            rows={6}
            resize="vertical"
            // focusBorderColor="#EC4899"   <-- removed to avoid React DOM prop warning in your setup
            borderColor={isTooShort ? "red.300" : undefined}
            maxLength={maxLen}
          />
          <Text fontSize="xs" color={isTooShort ? "red.500" : "gray.500"} mt={1} textAlign="right">
            {reason.length} / {maxLen} characters {isTooShort && `(minimum ${minLen})`}
          </Text>
        </Box>

        <Box mt={4} bg="blue.50" p={3} borderRadius="md">
          <Text fontSize="xs" color="blue.800">
            <strong>Note:</strong> Reports are reviewed by admins and kept confidential. Please provide specific details to help us take appropriate action.
          </Text>
        </Box>

        <Box display="flex" justifyContent="flex-end" gap={3} mt={6}>
          <Button variant="outline" onClick={handleClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            bg="#EC4899"
            color="white"
            _hover={{ bg: "#C7327C" }}
            onClick={handleSubmit}
            isDisabled={isTooShort || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ReportModal;
