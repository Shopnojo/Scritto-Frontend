"use client";

import type { ReactNode } from "react";
import type { ApiQueryState } from "@/lib/hooks/useApiQuery";
import { ErrorState } from "./States";

interface QueryBoundaryProps<T> {
  query: ApiQueryState<T>;
  loading: ReactNode;
  children: (data: T) => ReactNode;
}

/** Renders the loading / error / success branch of a useApiQuery result. */
export function QueryBoundary<T>({ query, loading, children }: QueryBoundaryProps<T>) {
  if (query.error) return <ErrorState error={query.error} onRetry={query.refetch} />;
  if (query.isLoading || query.data === undefined) return <>{loading}</>;
  return <>{children(query.data)}</>;
}
