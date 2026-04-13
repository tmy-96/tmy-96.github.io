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

interface FetchCategoriesResult {
  categories: Category[] | null;
  error: string | null;
}

/** Return type of the useCategories hook. */
export interface UseCategoriesReturn extends FetchCategoriesResult {
  loading: boolean;
}

// Module-level cache so categories are fetched once per app session,
// not on every component mount.
let cachedCategories: Category[] | null = null;
let cachePromise: Promise<FetchCategoriesResult> | null = null;

function fetchCategoriesOnce(): Promise<FetchCategoriesResult> {
  if (cachePromise) return cachePromise;

  const promise: Promise<FetchCategoriesResult> = Promise.resolve(
    supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })
  ).then(({ data, error }) => {
      if (!error && data) {
        cachedCategories = data as Category[];
      } else {
        // Allow retry on next mount if fetch failed
        cachePromise = null;
      }
      return { categories: data as Category[] | null, error: error?.message ?? null };
    });

  cachePromise = promise;
  return promise;
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>(cachedCategories ?? []);
  const [loading, setLoading] = useState<boolean>(cachedCategories === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedCategories !== null) return;

    fetchCategoriesOnce().then(({ categories, error: fetchError }) => {
      if (fetchError) {
        setError(fetchError);
      } else if (categories) {
        setCategories(categories);
      }
      setLoading(false);
    });
  }, []);

  return { categories, loading, error };
}
