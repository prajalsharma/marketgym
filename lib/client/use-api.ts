"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "./api";

interface Settled<T> {
  key: string | null;
  data: T | null;
  error: unknown;
}

/**
 * GET an API path on the client. Loading is derived from whether the latest
 * request has settled (no setState inside the effect body). Pass null to skip.
 */
export function useApiGet<T>(path: string | null): {
  data: T | null;
  error: unknown;
  loading: boolean;
  /** last successful response for any earlier path, so a range switch can keep the old chart on screen */
  previous: T | null;
  retry: () => void;
} {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<Settled<T>>({ key: null, data: null, error: null });
  const key = path ? `${path}#${tick}` : null;

  useEffect(() => {
    if (!path) return;
    const ctrl = new AbortController();
    const k = `${path}#${tick}`;
    apiGet<T>(path, { signal: ctrl.signal }).then(
      (data) => setState({ key: k, data, error: null }),
      (error: unknown) => {
        if (!ctrl.signal.aborted) setState({ key: k, data: null, error });
      },
    );
    return () => ctrl.abort();
  }, [path, tick]);

  const retry = useCallback(() => setTick((t) => t + 1), []);
  const settled = key !== null && state.key === key;
  return {
    data: settled ? state.data : null,
    error: settled ? state.error : null,
    loading: key !== null && !settled,
    previous: state.data,
    retry,
  };
}
