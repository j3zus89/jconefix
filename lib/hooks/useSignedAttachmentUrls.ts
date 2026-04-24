'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildSignedUrlMapForEntries, type SignedAttachmentEntry } from '@/lib/supabase-storage-signed';

/**
 * Resuelve adjuntos almacenados como ruta (o URL legacy) a URLs firmadas para un bucket.
 */
export function useSignedAttachmentUrls(
  supabase: SupabaseClient,
  bucketId: string,
  entries: SignedAttachmentEntry[],
): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({});

  const serialized = useMemo(
    () =>
      entries
        .map((e) => `${e.key}\x1f${String(e.stored ?? '')}`)
        .sort()
        .join('\n'),
    [entries],
  );

  useEffect(() => {
    let cancelled = false;
    if (entries.length === 0) {
      setMap({});
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      const next = await buildSignedUrlMapForEntries(supabase, bucketId, entries);
      if (!cancelled) setMap(next);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- entries contenido reflejado en serialized
  }, [supabase, bucketId, serialized]);

  return map;
}
