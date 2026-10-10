export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Response of POST /auth/login.
 *
 * Bearer-token backends return `access_token`; cookie-session backends may
 * return an empty body and set an httpOnly cookie instead. The client supports both.
 */
export interface LoginResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

/** Response of GET /auth/me. The backend alone decides `role` / `is_admin`. */
export interface CurrentUser {
  id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  is_admin?: boolean;
}
