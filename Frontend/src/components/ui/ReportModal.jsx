// src/components/ui/ReportModal.jsx
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/clerk-react";

// If you proxy /api in dev, leave empty string.
// Otherwise set VITE_API_BASE in your .env
const API_BASE = import.meta?.env?.VITE_API_BASE || "";

const CATEGORY_OPTIONS = [
  "Harassment",
  "Spam",
  "Misinformation",
  "Hate",
  "Scam/Fraud",
  "Sexual Content",
  "Violence",
  "Other",
];

export default function ReportModal({
  isOpen,
  onClose,
  reportType,   // "Event" | "Group" | "User" | "Message" (from parent)
  targetId,
  targetName,
}) {
  const [reason, setReason] = useState("");
  const [reportCategory, setReportCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getToken, isSignedIn } = useAuth();

  // reset fields when opened/closed
  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setReportCategory("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const minLen = 10;
  const maxLen = 1000;
  const isTooShort = reason.trim().length < minLen;
  const categoryRequired = !reportCategory;

  async function handleSubmit() {
    if (!isSignedIn) {
      toast.error("Please sign in to submit a report.");
      return;
    }
    if (categoryRequired) {
      toast.error("Please select a report category.");
      return;
    }
    if (isTooShort) {
      toast.error(`Please provide at least ${minLen} characters explaining your report.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken().catch(() => null);

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reportType,        // keep the parent-provided type (Event/Group/User/Message)
          targetId,
          targetName,
          reportCategory,    // NEW: Harassment, Spam, etc.
          reason: reason.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        const msg = data?.message || `Failed to submit report (${res.status})`;
        throw new Error(msg);
      }

      toast.success("Report submitted successfully. Thank you for helping keep the community safe.");
      setReason("");
      setReportCategory("");
      onClose?.();
    } catch (err) {
      console.error("Error submitting report:", err);
      toast.error(err.message || "Failed to submit report. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setReason("");
    setReportCategory("");
    onClose?.();
  }

  // Simple inline styles to avoid any external UI libs
  const overlayStyle = {
    position: "fixed",
    inset: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4000,
    padding: "12px",
  };

  const cardStyle = {
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    padding: "20px",
    maxWidth: "640px",
    width: "100%",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.9rem",
    fontWeight: 600,
    marginBottom: "8px",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #CBD5E1",
    fontSize: "0.95rem",
  };

  const helperStyle = (isError) => ({
    marginTop: "6px",
    fontSize: "0.75rem",
    color: isError ? "#DC2626" : "#64748B",
    textAlign: "right",
  });

  const buttonRowStyle = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "24px",
  };

  const btnStyle = {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #E2E8F0",
    background: "white",
    cursor: "pointer",
  };

  const btnPrimaryStyle = {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "none",
    background: "#EC4899",
    color: "white",
    cursor: "pointer",
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "16px" }}>
          {`Report ${reportType || ""}`}
        </div>

        {/* Target summary */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "0.9rem", color: "#475569", marginBottom: "8px" }}>
            You are reporting:
          </div>
          <div
            style={{
              background: "#F8FAFC",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #E2E8F0",
            }}
          >
            <div style={{ fontWeight: 600, color: "#1F2937" }}>{targetName}</div>
            <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "6px" }}>
              Type: {reportType || "—"}
            </div>
          </div>
        </div>

        {/* Report Category */}
        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="report-category" style={labelStyle}>
            Report Category
          </label>
          <select
            id="report-category"
            value={reportCategory}
            onChange={(e) => setReportCategory(e.target.value)}
            style={{
              ...inputStyle,
              borderColor: categoryRequired ? "#FCA5A5" : "#CBD5E1",
            }}
          >
            <option value="">Select a category</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <div style={helperStyle(categoryRequired)}>
            {categoryRequired ? "Please choose a category." : "Pick the closest match."}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="report-reason" style={labelStyle}>
            Reason for Report
          </label>
          <textarea
            id="report-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`Please explain why you are reporting this (minimum ${minLen} characters)...`}
            rows={6}
            style={{
              ...inputStyle,
              resize: "vertical",
              borderColor: isTooShort ? "#FCA5A5" : "#CBD5E1",
            }}
            maxLength={maxLen}
          />
          <div style={helperStyle(isTooShort)}>
            {reason.length} / {maxLen} characters {isTooShort && `(minimum ${minLen})`}
          </div>
        </div>

        {/* Note */}
        <div
          style={{
            marginTop: "16px",
            background: "#EFF6FF",
            padding: "12px",
            borderRadius: "8px",
            color: "#1E3A8A",
            fontSize: "0.8rem",
          }}
        >
          <strong>Note:</strong> Reports are reviewed by admins and kept confidential. Please
          provide specific details to help us take appropriate action.
        </div>

        {/* Actions */}
        <div style={buttonRowStyle}>
          <button onClick={handleClose} style={btnStyle} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={btnPrimaryStyle}
            disabled={categoryRequired || isTooShort || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
