/**
 * Product type definitions.
 *
 * Contains the full Product interface (as stored in Supabase) and
 * the ProductFormData interface (used for form input when creating/editing).
 */
import type { Category } from './category';

/** Full product record as returned from the database. */
export interface Product {
  id: string;
  name: string;
  description: string | null;
  /** Price stored in cents (e.g., 1250 = RM 12.50) to avoid floating-point precision issues. */
  price: number;
  quantity: number;
  category_id: string | null;
  /** Joined category object from the categories table. */
  category: Category | null;
  image_path: string | null;
  created_at: string;
  created_by: string | null;
  edited_at: string | null;
  edited_by: string | null;
  /** Null means active; non-null means soft-deleted. */
  deleted_at: string | null;
  deleted_by: string | null;
}

/** Form input data for creating or updating a product. */
export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  quantity: number;
  category_id: string;
  /** File object when a new image is selected; null when unchanged. */
  image: File | null;
}
