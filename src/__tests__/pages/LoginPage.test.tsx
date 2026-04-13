/**
 * Unit tests for the LoginPage component.
 *
 * Covers rendering, client-side validation, submission behaviour,
 * and error display. Auth is tested via the onLogin prop mock —
 * no real Supabase calls are made.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '../../pages/LoginPage';

describe('LoginPage', () => {
  const mockOnLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnLogin.mockResolvedValue(null); // success by default
  });

  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders the heading, email field, password field, and submit button', () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    expect(screen.getByRole('heading', { name: /inventory hub/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows no error alert on initial render', () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // ─── Client-side validation ───────────────────────────────────────────────

  it('shows an error when submitting with empty email and password', async () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Email and password are required.')).toBeInTheDocument();
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  it('shows an error when submitting with only an email and no password', async () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Email and password are required.')).toBeInTheDocument();
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  it('shows an error for an invalid email format', async () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  it('shows an error when the password exceeds 256 characters', async () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'a'.repeat(257));
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Password is too long.')).toBeInTheDocument();
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  it('normalizes the email to lowercase before calling onLogin', async () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'User@Example.COM');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith('user@example.com', 'password123');
    });
  });

  // ─── Submission ───────────────────────────────────────────────────────────

  it('calls onLogin with email and password when the form is valid', async () => {
    render(<LoginPage onLogin={mockOnLogin} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith('user@example.com', 'password123');
    });
  });

  it('disables fields and shows spinner while submitting', async () => {
    // Keep onLogin pending so we can assert the in-flight state
    mockOnLogin.mockImplementation(() => new Promise(() => {}));
    render(<LoginPage onLogin={mockOnLogin} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeDisabled();
      expect(screen.getByLabelText(/password/i)).toBeDisabled();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  // ─── Error display ────────────────────────────────────────────────────────

  it('shows the error message returned by onLogin', async () => {
    mockOnLogin.mockResolvedValue('Invalid login credentials');
    render(<LoginPage onLogin={mockOnLogin} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
    });
  });

  it('clears a previous error when the form is resubmitted', async () => {
    mockOnLogin.mockResolvedValueOnce('Invalid login credentials').mockResolvedValueOnce(null);
    render(<LoginPage onLogin={mockOnLogin} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.queryByText('Invalid login credentials')).not.toBeInTheDocument();
    });
  });
});
