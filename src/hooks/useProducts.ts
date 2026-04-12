/**
 * Custom hook for managing product CRUD operations with Supabase.
 *
 * Provides product fetching, single product retrieval,
 * create/update operations, quantity adjustment, and soft delete.
 * All mutations track the acting user via audit fields (created_by,
 * edited_by, deleted_by) using the current Supabase auth session.
 */
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types/product';
import { PRODUCT_IMAGE_PATH_PATTERN } from '../constants/imageUpload';
import { UUID_PATTERN } from '../constants/security';
import { getCurrentUserId } from '../utils/auth';
import { sanitizeMultiLine, sanitizeSearchTerm, sanitizeSingleLine } from '../utils/inputSanitizers';

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_PRICE_CENTS = 1_000_000_000;
const MAX_QUANTITY = 1_000_000;

/** Shape of data required to create or update a product. */
interface ProductMutationData {
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  category_id: string | null;
  image_path: string | null;
}

export interface FetchProductsParams {
  page: number;
  rowsPerPage: number;
  searchTerm: string;
  categoryId: string;
  sortBy: 'name' | 'description' | 'price' | 'quantity' | 'category' | 'created_at' | 'created_by' | 'edited_at' | 'edited_by';
  sortDirection: 'asc' | 'desc';
}

/** Return type of the useProducts hook. */
export interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  /** Fetch active products using server-side pagination, filtering, and sorting. */
  fetchProducts: (params: FetchProductsParams) => Promise<void>;
  /** Fetch a single product by ID. */
  getProduct: (id: string) => Promise<Product | null>;
  /** Create a new product. Returns the created product's ID on success. */
  addProduct: (data: ProductMutationData) => Promise<string | null>;
  /** Update an existing product's fields. */
  updateProduct: (id: string, data: Partial<ProductMutationData>) => Promise<boolean>;
  /** Increment a product's quantity by 1. */
  incrementQuantity: (id: string) => Promise<boolean>;
  /** Decrement a product's quantity by 1 (minimum 0). */
  decrementQuantity: (id: string) => Promise<boolean>;
  /** Set a product's quantity to a specific value (minimum 0). */
  setQuantity: (id: string, quantity: number) => Promise<boolean>;
  /** Soft-delete a product (only allowed when quantity is 0). */
  removeProduct: (id: string) => Promise<boolean>;
}

function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function useProducts(): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  /** Fetch active products with joined category data using server-side query controls. */
  const fetchProducts = useCallback(
    async ({
      page,
      rowsPerPage,
      searchTerm,
      categoryId,
      sortBy,
      sortDirection,
    }: FetchProductsParams): Promise<void> => {
      setLoading(true);
      setError(null);

      const safePage = Number.isInteger(page) && page >= 0 ? page : 0;
      const safeRowsPerPage = [5, 10, 25].includes(rowsPerPage) ? rowsPerPage : 10;
      const safeSearchTerm = sanitizeSearchTerm(searchTerm, MAX_NAME_LENGTH);
      const safeCategoryId = categoryId !== 'all' && isValidUuid(categoryId) ? categoryId : 'all';

      const sortColumnMap: Record<FetchProductsParams['sortBy'], string> = {
        name: 'name',
        description: 'description',
        price: 'price',
        quantity: 'quantity',
        category: 'category_id',
        created_at: 'created_at',
        created_by: 'created_by',
        edited_at: 'edited_at',
        edited_by: 'edited_by',
      };

      const from = safePage * safeRowsPerPage;
      const to = from + safeRowsPerPage - 1;

      let query = supabase
        .from('products')
        .select('*, category:categories(*)', { count: 'exact' });

      if (safeSearchTerm) {
        query = query.ilike('name', `%${safeSearchTerm}%`);
      }

      if (safeCategoryId !== 'all') {
        query = query.eq('category_id', safeCategoryId);
      }

      const { data, error: fetchError, count } = await query
        .order(sortColumnMap[sortBy], { ascending: sortDirection === 'asc' })
        .range(from, to);

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setProducts(data as Product[]);
        setTotalCount(count ?? 0);
      }

      setLoading(false);
    },
    []
  );

  /** Fetch a single product by its UUID, including joined category data. */
  const getProduct = useCallback(async (id: string): Promise<Product | null> => {
    if (!isValidUuid(id)) {
      setError('Invalid product id.');
      return null;
    }

    const { data, error: fetchError } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('id', id)
      .single();

    if (fetchError) {
      setError(fetchError.message);
      return null;
    }

    return data as Product;
  }, []);

  /**
   * Create a new product in the database.
   * Sets `created_by` to the current authenticated user.
   * @returns The new product's UUID on success, null on failure.
   */
  const addProduct = useCallback(
    async (data: ProductMutationData): Promise<string | null> => {
      setError(null);

      const sanitizedName = sanitizeSingleLine(data.name).slice(0, MAX_NAME_LENGTH);
      if (!sanitizedName) {
        setError('Product name is required.');
        return null;
      }

      const sanitizedDescription = data.description
        ? sanitizeMultiLine(data.description).slice(0, MAX_DESCRIPTION_LENGTH)
        : null;

      if (!Number.isInteger(data.price) || data.price < 0 || data.price > MAX_PRICE_CENTS) {
        setError('Invalid product price.');
        return null;
      }

      if (!Number.isInteger(data.quantity) || data.quantity < 0 || data.quantity > MAX_QUANTITY) {
        setError('Invalid product quantity.');
        return null;
      }

      if (data.category_id && !isValidUuid(data.category_id)) {
        setError('Invalid product category.');
        return null;
      }

      if (data.image_path && !PRODUCT_IMAGE_PATH_PATTERN.test(data.image_path)) {
        setError('Invalid image path.');
        return null;
      }

      const userId = await getCurrentUserId();

      const { data: inserted, error: insertError } = await supabase
        .from('products')
        .insert({
          name: sanitizedName,
          description: sanitizedDescription,
          price: data.price,
          quantity: data.quantity,
          category_id: data.category_id,
          image_path: data.image_path,
          created_by: userId,
        })
        .select('id')
        .single();

      if (insertError) {
        setError(insertError.message);
        return null;
      }

      return inserted.id as string;
    },
    []
  );

  /**
   * Update an existing product's fields.
   * Sets `edited_at` and `edited_by` for audit tracking.
   */
  const updateProduct = useCallback(
    async (id: string, data: Partial<ProductMutationData>): Promise<boolean> => {
      setError(null);
      if (!isValidUuid(id)) {
        setError('Invalid product id.');
        return false;
      }

      const safeUpdate: Partial<ProductMutationData> = {};

      if (data.name !== undefined) {
        const sanitizedName = sanitizeSingleLine(data.name).slice(0, MAX_NAME_LENGTH);
        if (!sanitizedName) {
          setError('Product name is required.');
          return false;
        }
        safeUpdate.name = sanitizedName;
      }

      if (data.description !== undefined) {
        safeUpdate.description = data.description
          ? sanitizeMultiLine(data.description).slice(0, MAX_DESCRIPTION_LENGTH)
          : null;
      }

      if (data.price !== undefined) {
        if (!Number.isInteger(data.price) || data.price < 0 || data.price > MAX_PRICE_CENTS) {
          setError('Invalid product price.');
          return false;
        }
        safeUpdate.price = data.price;
      }

      if (data.quantity !== undefined) {
        if (!Number.isInteger(data.quantity) || data.quantity < 0 || data.quantity > MAX_QUANTITY) {
          setError('Invalid product quantity.');
          return false;
        }
        safeUpdate.quantity = data.quantity;
      }

      if (data.category_id !== undefined) {
        if (data.category_id && !isValidUuid(data.category_id)) {
          setError('Invalid product category.');
          return false;
        }
        safeUpdate.category_id = data.category_id;
      }

      if (data.image_path !== undefined) {
        if (data.image_path && !PRODUCT_IMAGE_PATH_PATTERN.test(data.image_path)) {
          setError('Invalid image path.');
          return false;
        }
        safeUpdate.image_path = data.image_path;
      }

      const userId = await getCurrentUserId();
      const editedAt = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('products')
        .update({
          ...safeUpdate,
          edited_at: editedAt,
          edited_by: userId,
        })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        return false;
      }

      // Update local state to reflect the change
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ...safeUpdate, edited_at: editedAt, edited_by: userId } : p
        )
      );

      return true;
    },
    []
  );

  /** Increment a product's quantity by 1. */
  const incrementQuantity = useCallback(
    async (id: string): Promise<boolean> => {
      const product = products.find((p) => p.id === id);
      if (!product) return false;

      return updateProduct(id, { quantity: product.quantity + 1 });
    },
    [products, updateProduct]
  );

  /**
   * Decrement a product's quantity by 1.
   * Enforces minimum quantity of 0 to prevent negative stock.
   */
  const decrementQuantity = useCallback(
    async (id: string): Promise<boolean> => {
      const product = products.find((p) => p.id === id);
      if (!product || product.quantity <= 0) return false;

      return updateProduct(id, { quantity: product.quantity - 1 });
    },
    [products, updateProduct]
  );

  /**
   * Set a product's quantity to a specific value.
   * Clamps to minimum 0 to prevent negative stock.
   */
  const setQuantity = useCallback(
    async (id: string, quantity: number): Promise<boolean> => {
      const clampedQuantity = Math.max(0, Math.floor(quantity));
      return updateProduct(id, { quantity: clampedQuantity });
    },
    [updateProduct]
  );

  /**
   * Soft-delete a product via an RPC function.
   * Uses a SECURITY DEFINER function because a direct UPDATE sets deleted_at
   * to non-null, which causes the row to violate the SELECT RLS policy
   * (deleted_at IS NULL). The RPC handles the guard (quantity must be 0)
   * at the database level for defense in depth.
   */
  const removeProduct = useCallback(
    async (id: string): Promise<boolean> => {
      if (!isValidUuid(id)) {
        setError('Invalid product id.');
        return false;
      }

      setError(null);

      const { error: rpcError } = await supabase.rpc('soft_delete_product', {
        product_id: id,
      });

      if (rpcError) {
        setError(rpcError.message);
        return false;
      }

      // Remove from local state (it's now soft-deleted and won't appear in future fetches)
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setTotalCount((prev) => prev - 1);

      return true;
    },
    []
  );

  return {
    products,
    loading,
    error,
    totalCount,
    fetchProducts,
    getProduct,
    addProduct,
    updateProduct,
    incrementQuantity,
    decrementQuantity,
    setQuantity,
    removeProduct,
  };
}
