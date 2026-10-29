/**
 * The only place that reads public environment variables.
 * Never add service-role keys or other secrets to this module.
 */
const DEFAULT_API_URL = "http://localhost:3001/api/v1";

export const env = {
  /** Express API base URL including /api/v1, without a trailing slash. */
  apiUrl: (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, ""),
  supabaseUrl: (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, ""),
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  useMocks: process.env.NEXT_PUBLIC_USE_MOCKS === "true",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/+$/, "") ?? "",
  isProduction: process.env.NODE_ENV === "production",
} as const;
