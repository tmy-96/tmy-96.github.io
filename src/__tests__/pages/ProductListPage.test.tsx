/**
 * Unit tests for the ProductListPage component.
 *
 * Verifies rendering, filtering, sorting, column visibility,
 * empty state, and navigation behavior.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProductListPage from '../../pages/ProductListPage';
import type { Category } from '../../types/category';
import type { Product } from '../../types/product';

const mockFetchProducts = vi.fn();
const mockNavigate = vi.fn();

let mockedProducts: Product[] = [];
let mockedLoading = false;
let mockedError: string | null = null;
let mockedCategories: Category[] = [];
let mockedCategoriesLoading = false;

vi.mock('../../hooks/useProducts', () => ({
  useProducts: () => ({
    products: mockedProducts,
    loading: mockedLoading,
    error: mockedError,
    totalCount: mockedProducts.length,
    fetchProducts: mockFetchProducts,
  }),
}));

vi.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: mockedCategories,
    loading: mockedCategoriesLoading,
    error: null,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function createProduct(overrides: Partial<Product>): Product {
  return {
    id: 'product-id',
    name: 'Product',
    description: null,
    price: 100,
    quantity: 1,
    category_id: null,
    category: null,
    image_path: null,
    created_at: '2026-04-12T00:00:00.000Z',
    created_by: null,
    edited_at: null,
    edited_by: null,
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

function createCategory(overrides: Partial<Category>): Category {
  return {
    id: 'category-id',
    name: 'Category',
    created_at: '2026-01-01T00:00:00.000Z',
    created_by: null,
    edited_at: null,
    edited_by: null,
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

describe('ProductListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedProducts = [];
    mockedLoading = false;
    mockedError = null;
    mockedCategoriesLoading = false;
    mockedCategories = [
      {
        id: 'c1',
        name: 'Fruit',
        created_at: '2026-01-01T00:00:00.000Z',
        created_by: null,
        edited_at: null,
        edited_by: null,
        deleted_at: null,
        deleted_by: null,
      },
      {
        id: 'c2',
        name: 'Tools',
        created_at: '2026-01-01T00:00:00.000Z',
        created_by: null,
        edited_at: null,
        edited_by: null,
        deleted_at: null,
        deleted_by: null,
      },
    ];
  });

  it('renders the Products heading', () => {
    render(
      <MemoryRouter>
        <ProductListPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Products')).toBeInTheDocument();
  });

  it('shows empty state message when there are no products', () => {
    render(
      <MemoryRouter>
        <ProductListPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/no products yet/i)).toBeInTheDocument();
  });

  it('calls fetchProducts on mount', () => {
    render(
      <MemoryRouter>
        <ProductListPage />
      </MemoryRouter>
    );

    expect(mockFetchProducts).toHaveBeenCalledWith({
      page: 0,
      rowsPerPage: 10,
      searchTerm: '',
      categoryId: 'all',
      sortBy: 'name',
      sortDirection: 'asc',
    });
  });

  it('applies search only when Enter is pressed', async () => {
    const user = userEvent.setup();
    mockedProducts = [
      createProduct({
        id: '1',
        name: 'Apple',
        category: createCategory({ id: 'c1', name: 'Fruit' }),
        category_id: 'c1',
      }),
      createProduct({
        id: '2',
        name: 'Hammer',
        category: createCategory({ id: 'c2', name: 'Tools' }),
        category_id: 'c2',
      }),
    ];

    render(
      <MemoryRouter>
        <ProductListPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Search'), 'app');

    expect(mockFetchProducts).toHaveBeenCalledTimes(1);

    await user.keyboard('{Enter}');

    expect(mockFetchProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({
        searchTerm: 'app',
        page: 0,
      })
    );
  });

  it('shows clear icon when search has value and clears applied filter', async () => {
    const user = userEvent.setup();
    mockedProducts = [createProduct({ id: '1', name: 'Apple' })];

    render(
      <MemoryRouter>
        <ProductListPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByLabelText('Search');
    await user.type(searchInput, 'app');
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(mockFetchProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ searchTerm: 'app' })
    );

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(mockFetchProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({
        searchTerm: '',
        page: 0,
      })
    );
  });

  it('sends sorting changes to server-side fetch', async () => {
    const user = userEvent.setup();
    mockedProducts = [
      createProduct({ id: '1', name: 'Banana', quantity: 2 }),
      createProduct({ id: '2', name: 'Apple', quantity: 10 }),
    ];

    render(
      <MemoryRouter>
        <ProductListPage />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Quantity' }));
    expect(mockFetchProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sortBy: 'quantity',
        sortDirection: 'asc',
      })
    );

    await user.click(screen.getByRole('button', { name: 'Quantity' }));
    expect(mockFetchProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sortBy: 'quantity',
        sortDirection: 'desc',
      })
    );
  });

  it('toggles column visibility from the column menu', async () => {
    const user = userEvent.setup();
    mockedProducts = [
      createProduct({
        id: '1',
        name: 'Apple',
        price: 1234,
        category: createCategory({ id: 'c1', name: 'Fruit' }),
        category_id: 'c1',
      }),
    ];

    render(
      <MemoryRouter>
        <ProductListPage />
      </MemoryRouter>
    );

    const table = screen.getByRole('table');
    expect(within(table).getByText('Price (RM)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /columns/i }));
    await user.click(screen.getByRole('menuitem', { name: /price \(rm\)/i }));

    expect(within(table).queryByText('Price (RM)')).not.toBeInTheDocument();
    expect(within(table).queryByText('RM 12.34')).not.toBeInTheDocument();
  });

  it('navigates to the product detail page when a row is clicked', async () => {
    const user = userEvent.setup();
    mockedProducts = [createProduct({ id: '1', name: 'Apple' })];

    render(
      <MemoryRouter>
        <ProductListPage />
      </MemoryRouter>
    );

    await user.click(screen.getByText('Apple'));

    expect(mockNavigate).toHaveBeenCalledWith('/products/1');
  });
});
