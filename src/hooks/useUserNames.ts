/**
 * Custom hook for resolving user UUIDs to display names.
 *
 * Since auth.users is not directly queryable from the client,
 * this hook uses a Postgres function to look up user metadata.
 * Results are cached in local state to avoid repeated lookups.
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { UUID_PATTERN } from '../constants/security';

/** Map of user UUID to display name. */
type UserNameMap = Record<string, string>;

export interface UseUserNamesReturn {
  /** Cached map of user IDs to display names. */
  userNames: UserNameMap;
  /** Resolve a user ID to a display name. Returns cached value or fetches it. */
  resolveUserName: (userId: string | null) => Promise<string>;
}

export function useUserNames(): UseUserNamesReturn {
  const [userNames, setUserNames] = useState<UserNameMap>({});
  const cacheRef = useRef<UserNameMap>({});
  const inflightRef = useRef<Record<string, Promise<string>>>({});

  /**
   * Resolve a user UUID to their display name.
   * Uses a Postgres RPC function to look up the user metadata.
   * Caches results to avoid redundant queries.
   */
  const resolveUserName = useCallback(async (userId: string | null): Promise<string> => {
    if (!userId) return '—';
    if (!UUID_PATTERN.test(userId)) return 'Unknown User';

    // Return cached name immediately if available.
    const cachedName = cacheRef.current[userId];
    if (cachedName) return cachedName;

    // Reuse an in-flight lookup to avoid duplicate RPC calls for the same user.
    const inflightLookup = inflightRef.current[userId];
    if (inflightLookup) return inflightLookup;

    const lookupPromise = (async (): Promise<string> => {
      const { data, error } = await supabase.rpc('get_user_display_name', {
        user_id: userId,
      });

      const shouldCache = !error && Boolean(data);
      const resolvedName = shouldCache ? (data as string) : 'Unknown User';

      if (shouldCache) {
        cacheRef.current[userId] = resolvedName;
        setUserNames((prev) => {
          if (prev[userId] === resolvedName) return prev;
          return { ...prev, [userId]: resolvedName };
        });
      }

      return resolvedName;
    })();

    inflightRef.current[userId] = lookupPromise;

    try {
      return await lookupPromise;
    } finally {
      delete inflightRef.current[userId];
    }
  }, []);

  return { userNames, resolveUserName };
}
