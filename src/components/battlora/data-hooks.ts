"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";

// Lightweight data fetching hook with optional polling (live leaderboard etc.)

export function useApiData<T>(
  path: string | null,
  opts?: { refreshMs?: number; enabled?: boolean }
) {
  const enabled = opts?.enabled !== false && !!path;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const pathRef = useRef(path);
  pathRef.current = path;

  const load = useCallback(async () => {
    if (!pathRef.current) return;
    try {
      const result = await api<T>(pathRef.current);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load();
  }, [path, enabled, load]);

  useEffect(() => {
    if (!opts?.refreshMs || !enabled) return;
    const timer = setInterval(load, opts.refreshMs);
    return () => clearInterval(timer);
     
  }, [opts?.refreshMs, enabled, path]);

  return { data, error, loading, refetch: load };
}
