/**
 * Category type definition.
 *
 * Represents a product category stored in the Supabase `categories` table.
 * Categories are preset and read-only for regular users.
 */
export interface Category {
  id: string;
  name: string;
  created_at: string;
  created_by: string | null;
  edited_at: string | null;
  edited_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}
