# InventoryHub

A React-based product catalog management application.

## Assumed User Story

A warehouse team needs a shared web application to maintain their product catalog. Team members log in with their credentials to:

- **Browse** a paginated product list showing name, category, price, and quantity
- **Add** new products with details including name, description, price, quantity, category, and an image
- **View** full product details on a dedicated detail page, with audit info (created/edited by whom)
- **Adjust** stock quantities using +/- buttons or direct keyboard input (minimum 0), then save changes
- **Edit** product information and replace images
- **Remove** discontinued products from the catalog — only when stock quantity is 0, preventing accidental deletion of in-stock items

All team members share the same product catalog, and changes are persisted in real-time to the cloud database.

## Architecture Rationale

### Why Vite (not Create React App)

CRA is officially deprecated. Vite provides faster dev server startup, hot module replacement, and optimized production builds. It is the current community standard for new React projects.

### Why TypeScript

Type safety catches bugs at compile time rather than runtime. For a production-grade application, TypeScript provides self-documenting code through interfaces, better IDE support, and safer refactoring — essential qualities for a senior developer workflow.

### Why Material UI (MUI)

MUI provides a comprehensive, accessible component library following Material Design principles. Using MUI native components (AppBar, Table, TextField, Dialog, etc.) ensures consistent styling, built-in accessibility, and rapid development without reinventing common UI patterns. Styling is done via MUI's `sx` prop, which integrates with MUI's theme and spacing system.

### Why Tailwind CSS (for tweaks only)

Tailwind is available as a safety net for edge cases where `sx` falls short — such as styling non-MUI elements, pseudo-elements (`::before`/`::after`), or complex animations. In practice, `sx` handles nearly everything in this project.

### Why Supabase

Supabase provides authentication, PostgreSQL database, Row Level Security, and file storage in a single platform — eliminating the need for a separate backend server. Key benefits:

- **Built-in JWT-based authentication** with automatic token management in the client SDK
- **Row Level Security (RLS)** enforces access control at the database level, not just in application code
- **Supabase Storage** for product image uploads with public read access
- **Free tier** is sufficient for this application's scope
- The JavaScript client SDK handles auth headers automatically, keeping application code clean

### Why Custom Hooks (not Redux/Context)

The `useProducts`, `useAuth`, `useCategories`, `useImageUpload`, and `useUserNames` hooks serve as the single source of truth for their respective domains. This approach:

- **Separates business logic from UI** — hooks are testable in isolation
- **Avoids premature abstraction** — the component tree is shallow (3 levels max), making Context/Redux unnecessary overhead
- **Follows Single Responsibility Principle** — each hook manages one concern

### Why HashRouter (not BrowserRouter)

GitHub Pages doesn't support server-side URL rewriting. HashRouter uses URL hash fragments (`/#/products/123`) which work without server configuration, making deployment straightforward.

### Why Store Price in Cents

Prices are stored as integers in cents (e.g., RM 12.50 = `1250`) rather than decimals. This avoids floating-point precision issues (e.g., `0.1 + 0.2 = 0.30000000000000004`). All price arithmetic is exact integer math, and conversion to display format (`RM X.XX`) happens only in the UI layer.

### Component Composition

Small, single-responsibility components composed together:

- `QuantityControl` — reusable +/- with keyboard input
- `ImageUpload` — file picker with preview
- `ProtectedRoute` — auth guard wrapper
- `Layout` — AppBar + content area

## SOLID Principles

- **S - Single Responsibility**: Each hook and component has one job
- **O - Open/Closed**: Components accept props/callbacks to extend behavior without modifying internals
- **L - Liskov Substitution**: Consistent typed interfaces — any component expecting a `Product` works with any valid Product object
- **I - Interface Segregation**: Small, focused interfaces — `ProductFormData` for form input vs `Product` for full DB record
- **D - Dependency Inversion**: Hooks depend on the Supabase client abstraction, not direct API calls. Components depend on hook interfaces, not implementations

## API Security

All API calls to Supabase are guarded by JWT:

1. On login, Supabase Auth returns a JWT `access_token`
2. The Supabase client SDK automatically attaches the JWT as a `Bearer` token on every request
3. RLS policies verify the JWT server-side — only `authenticated` role users can access data
4. Without a valid JWT, all API calls are rejected with 401
5. Token refresh is handled automatically via `onAuthStateChange`

## Soft Delete Pattern

Products are never hard-deleted. Instead, a soft delete sets `deleted_at` and `deleted_by` timestamps. RLS policies automatically filter out soft-deleted records (`deleted_at IS NULL`). This provides:

- **Data recovery** — accidentally removed products can be restored
- **Audit trail** — who deleted what and when is always recorded
- **Referential integrity** — no orphaned foreign key references

## Database Schema & Seeding SQL

Run the following SQL in your Supabase SQL Editor to set up the full database:

```sql
-- ============================================================
-- 1. TABLES
-- ============================================================

-- Categories table with audit columns and soft delete
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  edited_at TIMESTAMPTZ,
  edited_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Products table with price in cents, audit columns, and soft delete
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  category_id UUID REFERENCES categories(id),
  image_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  edited_at TIMESTAMPTZ,
  edited_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Categories: authenticated users can read active (non-deleted) categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active categories"
  ON categories FOR SELECT TO authenticated USING (deleted_at IS NULL);

-- Products: authenticated users can read, insert, update (no hard delete)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active products"
  ON products FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 3. RPC FUNCTION (user display name lookup)
-- ============================================================

-- Allows the client to resolve user UUIDs to display names
-- without direct access to auth.users (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_user_display_name(user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    raw_user_meta_data->>'display_name',
    email
  )
  FROM auth.users
  WHERE id = user_id;
$$;

-- ============================================================
-- 4. PRESET USERS (run in Supabase SQL Editor)
-- ============================================================

-- Create 3 preset users with display names in metadata
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'user1@inventoryhub.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"display_name": "User One"}'::jsonb,
    now(), now(), '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'user2@inventoryhub.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"display_name": "User Two"}'::jsonb,
    now(), now(), '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'user3@inventoryhub.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"display_name": "User Three"}'::jsonb,
    now(), now(), '', '', '', '', ''
  );

-- Create identity records (required for email/password login)
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT
  u.id, u.id, u.email,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
FROM auth.users u
WHERE u.email IN ('user1@inventoryhub.com', 'user2@inventoryhub.com', 'user3@inventoryhub.com');

-- ============================================================
-- 5. SEED CATEGORIES (using User One as creator)
-- ============================================================

INSERT INTO categories (name, created_by)
SELECT name, u.id
FROM (VALUES
  ('Electronics'), ('Clothing'), ('Food & Beverages'),
  ('Furniture'), ('Stationery'), ('Others')
) AS c(name)
CROSS JOIN auth.users u
WHERE u.email = 'user1@inventoryhub.com';

-- ============================================================
-- 6. STORAGE BUCKET (product images)
-- ============================================================

-- Create public bucket for product images (5MB limit, image types only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can update product images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can delete product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Public read access for product images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'product-images');
```

## Preset Test Credentials

| User | Email | Password | Display Name |
|------|-------|----------|--------------|
| User 1 | user1@inventoryhub.com | password123 | User One |
| User 2 | user2@inventoryhub.com | password123 | User Two |
| User 3 | user3@inventoryhub.com | password123 | User Three |

All users share the same product catalog (shared inventory).

## Preset Categories

Electronics, Clothing, Food & Beverages, Furniture, Stationery, Others

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 19 | UI framework |
| TypeScript 6 | Type safety (strict mode, no `any`) |
| Vite 8 | Build tool |
| Material UI (MUI) v9 | Component library |
| Tailwind CSS v4 | Utility CSS (edge cases only) |
| React Router DOM v7 | Client-side routing (HashRouter) |
| Supabase | Auth + PostgreSQL + Storage |
| Vitest | Unit testing |
| React Testing Library | Component testing |
| pnpm | Package manager |
| gh-pages | GitHub Pages deployment |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A Supabase project (free tier works)

### 1. Clone and Install

```bash
git clone https://github.com/tmy-96/tmy-96.github.io.git
cd tmy-96.github.io
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Database

Run the complete SQL script from the [Database Schema & Seeding SQL](#database-schema--seeding-sql) section in your Supabase SQL Editor. This creates:

1. Tables (`categories`, `products`) with RLS policies
2. `get_user_display_name` RPC function for audit display
3. 3 preset users with display names
4. 6 preset categories (seeded by User One)
5. `product-images` storage bucket with access policies

### 4. Run Locally

```bash
pnpm dev
```

### 5. Run Tests

```bash
pnpm test
```

### 6. Build for Production

```bash
pnpm build
```

### 7. Deploy to GitHub Pages

```bash
pnpm deploy
```

## Project Structure

```
src/
  types/
    product.ts              # Product + ProductFormData interfaces
    category.ts             # Category interface
  lib/
    supabase.ts             # Supabase client initialization
  hooks/
    useAuth.ts              # Authentication state + login/logout
    useProducts.ts          # Product CRUD + pagination + soft delete
    useCategories.ts        # Fetch preset categories
    useImageUpload.ts       # Supabase Storage image operations
    useUserNames.ts         # Resolve user UUIDs to display names via RPC
  components/
    Layout.tsx              # AppBar + content wrapper
    ProtectedRoute.tsx      # Auth guard for routes
    QuantityControl.tsx     # +/- buttons + editable input
    ImageUpload.tsx         # File picker + preview
  pages/
    LoginPage.tsx           # Authentication form
    ProductListPage.tsx     # Paginated product table (landing)
    ProductDetailPage.tsx   # Product view + quantity + actions
    ProductFormPage.tsx     # Create/edit form + image upload
  App.tsx                   # Router configuration
  main.tsx                  # Entry point
  index.css                 # Tailwind import
```

## Future Enhancements

If more time were allowed, the following improvements could be made:

- **Role-based access control** — Admin role (create/edit/delete) vs Viewer role (read-only), implemented via Supabase custom claims and more granular RLS policies
- **Product search and sorting** — Full-text search on product name/description, sortable table columns
- **Product categories management** — CRUD interface for categories (currently preset and read-only)
- **Audit trail UI** — View history of who changed what and when, leveraging the existing audit columns
- **Bulk import/export** — CSV upload for batch product creation, export for reporting
- **Real-time updates** — Supabase Realtime subscriptions for live multi-user sync (see changes from other users instantly)
- **Dark mode** — MUI theme toggle between light and dark modes
- **Integration / E2E tests** — Playwright or Cypress for full user flow testing
