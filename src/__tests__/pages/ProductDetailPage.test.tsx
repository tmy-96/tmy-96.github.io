/**
 * Unit tests for the ProductDetailPage component.
 *
 * Covers rendering, pending quantity controls, save/remove flows,
 * the remove confirmation dialog, and navigation behaviour.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProductDetailPage from '../../pages/ProductDetailPage';
import type { Product } from '../../types/product';

// ─── Mock setup ─────────────────────────────────────────────────────────────

const mockGetProduct = vi.fn();
const mockSetQuantity = vi.fn();
const mockRemoveProduct = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockResolveUserName = vi.fn();
const mockNavigate = vi.fn();
const mockParams: Record<string, string> = { id: 'product-1' };

vi.mock('../../hooks/useProducts', () => ({
  useProducts: () => ({
    getProduct: mockGetProduct,
    setQuantity: mockSetQuantity,
    removeProduct: mockRemoveProduct,
    error: null,
  }),
}));

vi.mock('../../hooks/useProductImageStorage', () => ({
  useProductImageStorage: () => ({
    getPublicUrl: mockGetPublicUrl,
  }),
}));

vi.mock('../../hooks/useUserNames', () => ({
  useUserNames: () => ({
    resolveUserName: mockResolveUserName,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Test Widget',
    description: 'A useful widget',
    price: 1999,
    quantity: 5,
    category_id: 'cat-1',
    category: { id: 'cat-1', name: 'Electronics', created_at: '', created_by: null, edited_at: null, edited_by: null, deleted_at: null, deleted_by: null },
    image_path: null,
    created_at: '2026-01-15T00:00:00.000Z',
    created_by: null,
    edited_at: null,
    edited_by: null,
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ProductDetailPage />
    </MemoryRouter>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ProductDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProduct.mockResolvedValue(buildProduct());
    mockSetQuantity.mockResolvedValue(true);
    mockRemoveProduct.mockResolvedValue(true);
    mockGetPublicUrl.mockReturnValue('https://example.com/image.jpg');
    mockResolveUserName.mockResolvedValue('—');
  });

  // ─── Rendering ─────────────────────────────────────────────────────────────

  it('renders product name, price, category, and description', async () => {
    renderPage();

    expect(await screen.findByText('Test Widget')).toBeInTheDocument();
    expect(screen.getByText('RM 19.99')).toBeInTheDocument();
    expect(screen.getByText(/electronics/i)).toBeInTheDocument();
    expect(screen.getByText('A useful widget')).toBeInTheDocument();
  });

  it('shows "Product not found" when getProduct returns null', async () => {
    mockGetProduct.mockResolvedValue(null);
    renderPage();

    expect(await screen.findByText('Product not found.')).toBeInTheDocument();
  });

  it('renders product image when image_path is set', async () => {
    mockGetProduct.mockResolvedValue(buildProduct({ image_path: 'product-1/img.jpg' }));
    renderPage();

    const img = await screen.findByRole('img', { name: 'Test Widget' });
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('does not render an image element when image_path is null', async () => {
    renderPage();

    await screen.findByText('Test Widget');
    expect(screen.queryByRole('img', { name: 'Test Widget' })).not.toBeInTheDocument();
  });

  it('renders Back to List, Edit, and Remove buttons', async () => {
    renderPage();

    await screen.findByText('Test Widget');
    expect(screen.getByRole('button', { name: /back to list/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  // ─── Navigation ────────────────────────────────────────────────────────────

  it('navigates to "/" when "Back to List" is clicked', async () => {
    renderPage();
    await screen.findByText('Test Widget');

    await userEvent.click(screen.getByRole('button', { name: /back to list/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('navigates to the edit page when "Edit" is clicked', async () => {
    renderPage();
    await screen.findByText('Test Widget');

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/products/product-1/edit');
  });

  // ─── Pending quantity controls ─────────────────────────────────────────────

  it('does not show "Update" button when quantity is unchanged', async () => {
    renderPage();
    await screen.findByText('Test Widget');

    expect(screen.queryByRole('button', { name: /update/i })).not.toBeInTheDocument();
  });

  it('shows "Update" button after incrementing quantity', async () => {
    renderPage();
    await screen.findByText('Test Widget');

    await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }));
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
  });

  it('hides "Update" button after decrementing back to original quantity', async () => {
    renderPage();
    await screen.findByText('Test Widget');

    await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }));
    await userEvent.click(screen.getByRole('button', { name: /decrease quantity/i }));

    expect(screen.queryByRole('button', { name: /update/i })).not.toBeInTheDocument();
  });

  it('decrement button is disabled when pending quantity reaches 0', async () => {
    mockGetProduct.mockResolvedValue(buildProduct({ quantity: 0 }));
    renderPage();
    await screen.findByText('Test Widget');

    expect(screen.getByRole('button', { name: /decrease quantity/i })).toBeDisabled();
  });

  // ─── Save quantity ──────────────────────────────────────────────────────────

  it('calls setQuantity with the new quantity and shows a snackbar on success', async () => {
    renderPage();
    await screen.findByText('Test Widget');

    await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }));
    await userEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => {
      expect(mockSetQuantity).toHaveBeenCalledWith('product-1', 6);
    });
    expect(await screen.findByText('Quantity updated to 6.')).toBeInTheDocument();
  });

  it('hides "Update" button after a successful save', async () => {
    renderPage();
    await screen.findByText('Test Widget');

    await userEvent.click(screen.getByRole('button', { name: /increase quantity/i }));
    await userEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /update/i })).not.toBeInTheDocument();
    });
  });

  // ─── Remove flow ────────────────────────────────────────────────────────────

  it('Remove button is disabled when product quantity is greater than 0', async () => {
    renderPage();
    await screen.findByText('Test Widget');

    expect(screen.getByRole('button', { name: /remove/i })).toBeDisabled();
  });

  it('Remove button is enabled when product quantity is 0', async () => {
    mockGetProduct.mockResolvedValue(buildProduct({ quantity: 0 }));
    renderPage();
    await screen.findByText('Test Widget');

    expect(screen.getByRole('button', { name: /remove/i })).toBeEnabled();
  });

  it('opens the confirmation dialog when Remove is clicked', async () => {
    mockGetProduct.mockResolvedValue(buildProduct({ quantity: 0 }));
    renderPage();
    await screen.findByText('Test Widget');

    await userEvent.click(screen.getByRole('button', { name: /remove/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/remove product/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/test widget/i)).toBeInTheDocument();
  });

  it('closes the dialog without removing when Cancel is clicked', async () => {
    mockGetProduct.mockResolvedValue(buildProduct({ quantity: 0 }));
    renderPage();
    await screen.findByText('Test Widget');

    await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(mockRemoveProduct).not.toHaveBeenCalled();
  });

  it('calls removeProduct and navigates to "/" on confirmed removal', async () => {
    mockGetProduct.mockResolvedValue(buildProduct({ quantity: 0 }));
    renderPage();
    await screen.findByText('Test Widget');

    await userEvent.click(screen.getByRole('button', { name: /remove/i }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /remove/i }));

    await waitFor(() => {
      expect(mockRemoveProduct).toHaveBeenCalledWith('product-1');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
