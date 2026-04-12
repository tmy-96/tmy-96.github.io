/**
 * Application entry point.
 *
 * Renders the root App component inside React StrictMode and MUI's
 * CssBaseline for consistent cross-browser styling.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import './index.css';
import App from './App';

const theme = createTheme({
  components: {
    MuiPaper: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
      },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
);
