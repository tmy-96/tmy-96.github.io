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

// Module-level cache so categories are fetched once per app session,
// not on every component mount.
let cachedCategories: Category[] | null = null;
let cachePromise: Promise<{ data: Category[] | null; error: string | null }> | null = null;

function fetchCategoriesOnce(): Promise<{ data: Category[] | null; error: string | null }> {
  if (cachePromise) return cachePromise;

  cachePromise = supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })
    .then(({ data, error }) => {
      if (!error && data) {
        cachedCategories = data as Category[];
      } else {
        // Allow retry on next mount if fetch failed
        cachePromise = null;
      }
      return { data: data as Category[] | null, error: error?.message ?? null };
    });

  return cachePromise;
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>(cachedCategories ?? []);
  const [loading, setLoading] = useState<boolean>(cachedCategories === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedCategories !== null) return;

    setLoading(true);
    fetchCategoriesOnce().then(({ data, error: fetchError }) => {
      if (fetchError) {
        setError(fetchError);
      } else if (data) {
        setCategories(data);
      }
      setLoading(false);
    });
  }, []);

  return { categories, loading, error };
}
