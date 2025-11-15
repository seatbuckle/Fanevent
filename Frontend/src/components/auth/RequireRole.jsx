// src/components/auth/RequireRole.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUser, SignedIn, SignedOut } from "@clerk/clerk-react";
import { Box, Spinner, Text } from "@chakra-ui/react";

export default function RequireRole({ role = "admin", children }) {
  const { isLoaded, user } = useUser();
  const location = useLocation();

  // Loading state (Clerk still hydrating)
  if (!isLoaded) {
    return (
      <Box minH="40vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  return (
    <>
      <SignedOut>
        {/* Not signed in -> send to your sign-in route, preserve return URL */}
        <Navigate to={`/sign-in?redirect_url=${encodeURIComponent(location.pathname)}`} replace />
      </SignedOut>

      <SignedIn>
        {user?.publicMetadata?.role === role ? (
          children
        ) : (
          <Box p={10}>
            <Text fontWeight="semibold" fontSize="lg" mb={2}>Not authorized</Text>
            <Text color="gray.600">
              You need <Text as="span" color="pink.500" fontWeight="semibold">{role}</Text> access to view this page.
            </Text>
          </Box>
        )}
      </SignedIn>
    </>
  );
}
