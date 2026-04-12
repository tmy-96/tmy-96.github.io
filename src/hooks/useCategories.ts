/**
 * Custom hook for fetching product categories from Supabase.
 *
 * Categories are preset and read-only. This hook fetches all active
 * (non-deleted) categories on mount and exposes them for use in
 * the product form's category dropdown.
 */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Category } from '../types/category';

/** Return type of the useCategories hook. */
export interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: string | null;
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setCategories(data as Category[]);
      }

      setLoading(false);
    };

    fetchCategories();
  }, []);

  return { categories, loading, error };
}
