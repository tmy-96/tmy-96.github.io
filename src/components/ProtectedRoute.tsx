/**
 * Route guard component.
 *
 * Wraps protected routes to ensure only authenticated users can access them.
 * Redirects unauthenticated users to the login page.
 * Shows a loading spinner while the auth state is being determined.
 */
import { Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import type { User } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  user: User | null;
  loading: boolean;
}

export default function ProtectedRoute({ user, loading }: ProtectedRouteProps) {
  // Show a centered spinner while auth state is being resolved
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if no authenticated user
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Render the child route
  return <Outlet />;
}
