"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ApiQueryState<T> {
  data: T | undefined;
  error: unknown;
  isLoading: boolean;
  /** True while refetching with stale data still on screen. */
  isRefreshing: boolean;
  refetch: () => void;
  /** Replace data locally, e.g. with the response of a mutation. */
  setData: (data: T) => void;
}

/**
 * Minimal data-fetching hook: runs `fetcher` whenever `deps` change, cancels
 * in-flight requests on change/unmount, and keeps previous data while refetching.
 */
export function useApiQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): ApiQueryState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(undefined);
    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  return {
    data,
    error,
    isLoading: isLoading && data === undefined,
    isRefreshing: isLoading && data !== undefined,
    refetch,
    setData,
  };
}
