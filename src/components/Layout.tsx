/**
 * Application layout component.
 *
 * Renders the MUI AppBar with the app title, logged-in user's display name,
 * and a logout button. The main content area renders child routes via Outlet.
 */
import { Outlet } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import type { User } from '@supabase/supabase-js';

interface LayoutProps {
  user: User;
  onLogout: () => Promise<void>;
}

export default function Layout({ user, onLogout }: LayoutProps) {
  // Extract display name from Supabase user metadata, fallback to email
  const displayName =
    (user.user_metadata?.display_name as string) ?? user.email ?? 'User';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Inventory Hub
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {displayName}
          </Typography>
          <Button
            color="inherit"
            onClick={onLogout}
            startIcon={<LogoutIcon />}
            size="small"
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      {/* Main content area */}
      <Container maxWidth="lg" sx={{ py: 3, flex: 1 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
