/**
 * Root application component.
 *
 * Sets up React Router with hash-based routing (for GitHub Pages compatibility),
 * manages authentication state, and defines the route hierarchy.
 *
 * Route structure:
 * - /login          -> LoginPage (public)
 * - /               -> ProductListPage (protected, landing page)
 * - /products/new   -> ProductFormPage create mode (protected)
 * - /products/:id   -> ProductDetailPage (protected)
 * - /products/:id/edit -> ProductFormPage edit mode (protected)
 */
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProductFormPage from './pages/ProductFormPage';

export default function App() {
  const { user, loading, login, logout } = useAuth();

  return (
    <HashRouter>
      <Routes>
        {/* Public route: login page */}
        <Route
          path="/login"
          element={
            // Redirect to home if already authenticated
            user ? <Navigate to="/" replace /> : <LoginPage onLogin={login} />
          }
        />

        {/* Protected routes: require authentication */}
        <Route element={<ProtectedRoute user={user} loading={loading} />}>
          <Route element={<Layout user={user!} onLogout={logout} />}>
            <Route path="/" element={<ProductListPage />} />
            <Route path="/products/new" element={<ProductFormPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/products/:id/edit" element={<ProductFormPage />} />
          </Route>
        </Route>

        {/* Catch-all: redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
