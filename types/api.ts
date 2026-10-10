/**
 * Shared API envelope types.
 *
 * Every type under /types mirrors a FastAPI response/request schema. The
 * backend's Pydantic models are the source of truth: when they change, update
 * these types and the compiler will point at every component that needs to follow.
 */

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface PageQuery {
  page?: number;
  page_size?: number;
}

/** ISO-8601 timestamp string as serialised by FastAPI. */
export type ISODateTime = string;

/** Reporting window accepted by the analytics endpoints (`?days=`). */
export type AnalyticsPeriod = 7 | 30 | 90;
