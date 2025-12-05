// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { Toaster } from "react-hot-toast";

// pages & components
import Home from "./pages/Home";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import Groups from "./pages/Groups";
import GroupDetails from "./pages/GroupDetails";
import MyDashboard from "./pages/MyDashboard";
import AllResults from "./pages/AllResults";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminApplications from "./pages/admin/AdminApplications";
import Messages from "./pages/Messages";
import RequireRole from "./components/auth/RequireRole";
import { useRoleStore } from "./store/useRoleStore";
import NotificationCenter from "@/pages/NotificationCenter";



/** Layout shared by user, organizer, and admin routes */
function SiteLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}

/** User routes (no organizer/admin pages) */
function UserRoutes() {
  return (
    <SiteLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/all-results" element={<AllResults />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/groups/:id" element={<GroupDetails />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/my-dashboard" element={<MyDashboard />} />
        <Route path="/notifications" element={<NotificationCenter />} />
        <Route path="/messages" element={<Messages />} />

        {/* Block privileged areas */}
        <Route path="/organizer" element={<Navigate to="/" replace />} />
        <Route path="/admin/*" element={<Navigate to="/" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SiteLayout>
  );
}

/** Organizer routes (user site + protected organizer page) */
function OrganizerRoutes() {
  return (
    <SiteLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/all-results" element={<AllResults />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetails />} />
        <Route path="/my-dashboard" element={<MyDashboard />} />
        <Route path="/notifications" element={<NotificationCenter />} />
        <Route path="/messages" element={<Messages />} />

        {/* Protected organizer page */}
        <Route
          path="/organizer"
          element={
            <RequireRole role="organizer">
              <OrganizerDashboard />
            </RequireRole>
          }
        />

        {/* No access to admin section */}
        <Route path="/admin/*" element={<Navigate to="/" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SiteLayout>
  );
}

/** Admin routes (user site + protected admin section) */
function AdminRoutes() {
  return (
    <SiteLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/all-results" element={<AllResults />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetails />} />
        <Route path="/my-dashboard" element={<MyDashboard />} />
        <Route path="/notifications" element={<NotificationCenter />} />
        <Route path="/messages" element={<Messages />} />

        {/* Organizer page still allowed only to organizers, so redirect admins away */}
        <Route path="/organizer" element={<Navigate to="/" replace />} />

        {/* Protected admin section (wildcard for nested admin routes) */}
        <Route
          path="/admin/*"
          element={
            <RequireRole role="admin">
              <AdminDashboard />
            </RequireRole>
          }
        />
        <Route 
          path="/admin/organizer-applications"
          element={
              <RequireRole role="admin">
                <AdminApplications />
              </RequireRole>
          }
        />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SiteLayout>
  );
}

export default function App() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { role, loading, syncRoleFromClerk } = useRoleStore();

  // When Clerk finishes loading, sync role from publicMetadata
  React.useEffect(() => {
    if (isLoaded) {
      syncRoleFromClerk(isSignedIn ? user : null);
    }
  }, [isLoaded, isSignedIn, user, syncRoleFromClerk]);

  // Gate rendering until Clerk and role store are ready
  if (!isLoaded || loading) {
    return null; // or a global spinner/skeleton
  }

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      {role === "admin" ? (
        <AdminRoutes />
      ) : role === "organizer" ? (
        <OrganizerRoutes />
      ) : (
        <UserRoutes />
      )}
    </>
  );
}
