/**
 * Login page component.
 *
 * Displays a centered login form with email and password fields.
 * Uses Supabase Auth via the useAuth hook for authentication.
 * Redirects to the product list on successful login.
 */
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  Paper,
  CircularProgress,
} from '@mui/material';
import type { UseAuthReturn } from '../hooks/useAuth';
import { EMAIL_PATTERN } from '../constants/security';

interface LoginPageProps {
  /** Login function from the useAuth hook. */
  onLogin: UseAuthReturn['login'];
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  /**
   * Handle form submission.
   * Validates inputs, calls the auth login function, and displays errors if any.
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    // Basic client-side validation
    if (!normalizedEmail || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length > 256) {
      setError('Password is too long.');
      return;
    }

    setSubmitting(true);
    const loginError = await onLogin(normalizedEmail, password);
    setSubmitting(false);

    if (loginError) {
      setError(loginError);
    }
    // On success, the auth state change listener in useAuth will update the user,
    // and App.tsx will redirect away from the login page automatically.
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h5" component="h1" gutterBottom align="center">
            Inventory Hub
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Sign in to manage your inventory
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              autoComplete="email"
              autoFocus
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={submitting}
              sx={{ mt: 2 }}
            >
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
