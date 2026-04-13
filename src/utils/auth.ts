import { supabase } from '../lib/supabase';

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error('Failed to get current user:', error);
      return null;
    }

    return user?.id ?? null;
  } catch (err) {
    console.error('Unexpected error getting current user:', err);
    return null;
  }
}
