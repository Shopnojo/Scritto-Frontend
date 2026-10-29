# Scritto Admin

Next.js (App Router), TypeScript and Tailwind admin console for Scritto.

The frontend uses the existing Supabase project for Google OAuth and the Scritto Express backend for administrator authorization and data. It never accesses PostgreSQL directly and never contains a service-role key.

```
Browser ── Google OAuth ──▶ existing Supabase project
Browser ── Bearer access token ──▶ Express API (/api/v1) ──▶ Supabase
Android ─────────────────────────▶ existing backend/auth setup
```

## Getting started

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Set the public Supabase URL and anon/publishable key for the same project already used by the Android app. Set `NEXT_PUBLIC_API_URL` to the Express backend URL, including `/api/v1`.

## Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Existing Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon/publishable key; never the service-role key |
| `NEXT_PUBLIC_API_URL` | Express API base URL, including `/api/v1` |
| `NEXT_PUBLIC_USE_MOCKS` | Optional UI mocks; keep `false` for real authentication |
| `NEXT_PUBLIC_BASE_PATH` | Optional URL prefix when hosted under a sub-path |

## Google OAuth setup

No new Google OAuth provider or Supabase project is needed. In the existing Supabase project's Authentication URL configuration, add the frontend callback URL to the allowed redirect URLs:

- Local: `http://localhost:3000/auth/callback`
- Production: `https://YOUR_ADMIN_DOMAIN/auth/callback`

Google sign-in uses the Supabase PKCE flow. The callback exchanges the one-time code for a Supabase session and sends its access token to the backend. The backend's `GET /api/v1/auth/me` endpoint decides whether the signed-in user has an active `owner`, `admin`, or `analyst` profile. A Google account alone does not grant admin access.

For cross-origin local development, set the backend's `FRONTEND_ORIGIN` to the exact frontend origin (for example `http://localhost:3000`).

## CI checks

The GitHub Actions workflow runs `npm ci`, ESLint and a production Next.js build on pushes and pull requests targeting `frontend`. CI uses placeholder public environment values; it does not need real credentials.
