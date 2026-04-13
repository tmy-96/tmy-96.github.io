/**
 * Unit tests for the ProductFormPage component.
 *
 * Verifies form rendering in create mode, field validation,
 * and category dropdown population.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProductFormPage from '../../pages/ProductFormPage';
import { MAX_IMAGE_FILE_SIZE_BYTES } from '../../constants/imageUpload';

const mockGetProduct = vi.fn();
const mockAddProduct = vi.fn();
const mockUpdateProduct = vi.fn();
const mockUploadImage = vi.fn();
const mockDeleteImage = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockParams: Record<string, string> = {};

// Mock hooks
vi.mock('../../hooks/useProducts', () => ({
  useProducts: () => ({
    getProduct: mockGetProduct,
    addProduct: mockAddProduct,
    updateProduct: mockUpdateProduct,
  }),
}));

vi.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [
      { id: 'cat-1', name: 'Electronics' },
      { id: 'cat-2', name: 'Clothing' },
    ],
    loading: false,
  }),
}));

vi.mock('../../hooks/useProductImageStorage', () => ({
  useProductImageStorage: () => ({
    uploadImage: mockUploadImage,
    deleteImage: mockDeleteImage,
    uploading: false,
    getPublicUrl: mockGetPublicUrl,
  }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

describe('ProductFormPage (Create Mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProduct.mockResolvedValue(null);
    mockAddProduct.mockResolvedValue('new-id');
    mockUpdateProduct.mockResolvedValue(true);
    mockUploadImage.mockResolvedValue('path/image.png');
    mockDeleteImage.mockResolvedValue(undefined);
    mockGetPublicUrl.mockReturnValue('https://example.com/image.png');
    Object.keys(mockParams).forEach((key) => delete mockParams[key]);
  });

  it('renders the "Add New Product" heading in create mode', () => {
    render(
      <MemoryRouter>
        <ProductFormPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Add New Product')).toBeInTheDocument();
  });

  it('renders all required form fields', () => {
    render(
      <MemoryRouter>
        <ProductFormPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/product name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
    // MUI Select renders "Category" in both the label and the selected value area
    const categoryElements = screen.getAllByText('Category');
    expect(categoryElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows the default price value in create mode', () => {
    render(
      <MemoryRouter>
        <ProductFormPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/price/i)).toHaveValue(0);
  });

  it('renders Create Product and Cancel buttons', () => {
    render(
      <MemoryRouter>
        <ProductFormPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('limits the price input to 2 decimal places', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProductFormPage />
      </MemoryRouter>
    );

    const priceField = screen.getByLabelText(/price/i);
    await user.clear(priceField);
    await user.type(priceField, '12.345');

    expect(priceField).toHaveValue(12.34);
  });

  it('shows validation error when submitting with empty product name', async () => {
    render(
      <MemoryRouter>
        <ProductFormPage />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByText('Create'));
    expect(screen.getByText('Product name is required.')).toBeInTheDocument();
  });

  it('allows removing a newly selected image before submit', async () => {
    render(
      <MemoryRouter>
        <ProductFormPage />
      </MemoryRouter>
    );

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);
    expect(screen.getByText('Remove Image')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Remove Image'));

    expect(screen.getByText('No image selected')).toBeInTheDocument();
    expect(screen.queryByText('Remove Image')).not.toBeInTheDocument();
  });

  it('shows an error when an oversized image is selected', async () => {
    render(
      <MemoryRouter>
        <ProductFormPage />
      </MemoryRouter>
    );

    const oversizedFile = new File(['test'], 'large.png', { type: 'image/png' });
    Object.defineProperty(oversizedFile, 'size', { value: MAX_IMAGE_FILE_SIZE_BYTES + 1 });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, oversizedFile);

    expect(screen.getByText('Image must be 5 MB or smaller.')).toBeInTheDocument();
    expect(screen.queryByText('Remove Image')).not.toBeInTheDocument();
  });

  it('blocks submit while oversized image validation error is present', async () => {
    render(
      <MemoryRouter>
        <ProductFormPage />
      </MemoryRouter>
    );

    const oversizedFile = new File(['test'], 'large.png', { type: 'image/png' });
    Object.defineProperty(oversizedFile, 'size', { value: MAX_IMAGE_FILE_SIZE_BYTES + 1 });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, oversizedFile);

    expect(screen.getByText('Image must be 5 MB or smaller.')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeDisabled();
    expect(mockAddProduct).not.toHaveBeenCalled();
  });
});

describe('ProductFormPage (Edit Mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.id = 'product-1';
    mockGetProduct.mockResolvedValue({
      id: 'product-1',
      name: 'Existing Product',
      description: 'Existing description',
      price: 1250,
      quantity: 3,
      category_id: 'cat-1',
      category: { id: 'cat-1', name: 'Electronics' },
      image_path: 'product-1/existing-image.png',
      created_at: '2026-01-01T00:00:00.000Z',
      created_by: null,
      edited_at: null,
      edited_by: null,
      deleted_at: null,
      deleted_by: null,
    });
    mockAddProduct.mockResolvedValue('new-id');
    mockUpdateProduct.mockResolvedValue(true);
    mockUploadImage.mockResolvedValue('path/image.png');
    mockDeleteImage.mockResolvedValue(undefined);
    mockGetPublicUrl.mockReturnValue('https://example.com/existing-image.png');
  });

  it('removes an existing image when the form is saved', async () => {
    render(
      <MemoryRouter>
        <ProductFormPage />
      </MemoryRouter>
    );

    await screen.findByDisplayValue('Existing Product');
    await screen.findByDisplayValue('12.50');
    await userEvent.click(screen.getByText('Remove Image'));
    await userEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockUpdateProduct).toHaveBeenCalledWith(
        'product-1',
        expect.objectContaining({ image_path: null })
      );
    });
    expect(mockDeleteImage).toHaveBeenCalledWith('product-1/existing-image.png');
    expect(mockNavigate).toHaveBeenCalledWith('/products/product-1');
  });
});
