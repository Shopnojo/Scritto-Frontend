# Scritto Admin

Next.js (App Router) + TypeScript + Tailwind admin console for Scritto.

The admin is a **pure client of the Scritto FastAPI backend**. It never talks to
PostgreSQL/Supabase, holds no database credentials, and makes no authorization
decisions of its own.

```
Admin website ──HTTP──▶ FastAPI (/api/v1) ──▶ PostgreSQL / Supabase
Android app   ──HTTP──▶ FastAPI (/api/v1)
```

Inside the frontend, every request follows the same path:

```
page (app/) → view component (components/) → domain API fn (lib/api/devices.ts …)
            → central client (lib/api/client.ts) → FastAPI
```

## Getting started

```bash
cd admin
cp .env.example .env.local   # real API by default
npm install
npm run dev                  # http://localhost:3000
```

By default (`NEXT_PUBLIC_USE_MOCKS=false`) the site talks to FastAPI at
`NEXT_PUBLIC_API_URL`; until the backend is running you'll see "Can't reach the
Scritto API". For UI work without a backend, set it to `true`: any email +
password signs you in and data comes from `lib/mocks`.

| Script | |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build (also type-checks and lints) |
| `npm run start` | serve the production build |
| `npm run lint` | ESLint |

## Environment variables

Only `NEXT_PUBLIC_*` values exist here, and they are all **public** (inlined into
the browser bundle). Secrets (`DATABASE_URL`, `JWT_SECRET`, Firebase private key,
Google client secret, Supabase service-role key) belong to the backend only.

| Variable | Example | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.scritto.app/api/v1` or `/api/v1` | FastAPI base URL incl. `/api/v1`. Relative paths work behind a same-domain proxy. |
| `NEXT_PUBLIC_USE_MOCKS` | `false` | `true` serves responses from `lib/mocks`. Must be `false` in production; mock code is stripped from the bundle when it is. |
| `NEXT_PUBLIC_BASE_PATH` | `/admin` | Serve under a sub-path (`scritto.app/admin`). Empty for `admin.scritto.app`. Build-time. |
| `NEXT_OUTPUT_STANDALONE` | `true` | Emit `.next/standalone` for Docker/VPS. Not needed on Vercel. |

`.env.local` is git-ignored; `.env.example` is the committed template.

## Project structure

```
app/
  layout.tsx              fonts, theme, <AuthProvider>
  page.tsx                redirects to /dashboard
  login/page.tsx
  (admin)/layout.tsx      route group: <RequireAdmin> + sidebar shell (no URL segment)
  (admin)/dashboard|analytics|devices|devices/[id]|notifications|settings/page.tsx
components/
  layout/                 Sidebar, Header, AdminLayout, Logo
  auth/                   AuthProvider (session state), RequireAdmin (route guard), LoginForm
  dashboard/              StatCard, UsageChart, RecentActivity, DashboardView
  devices/ analytics/ notifications/ settings/   feature views + components
  ui/                     Button, Card, Badge, Field, Table, Pagination, States, …
lib/
  env.ts                  the only place env vars are read
  api/client.ts           central HTTP client (base URL, auth header, timeouts, error mapping, mock switch)
  api/errors.ts           ApiError + safe user-facing messages
  api/auth|analytics|devices|notifications|config.ts   one module per backend area
  auth/session.ts         access-token storage
  auth/auth-utils.ts      isAdmin(), safe ?next= redirects
  hooks/                  useApiQuery, useQueryState (URL filters), useDebouncedValue
  mocks/                  fake backend for UI development (same contract as FastAPI)
  utils/                  formatting, cn()
types/                    request/response types that mirror FastAPI's Pydantic schemas
```

Pages are thin server components (they set `<title>` metadata) that render a
client "view" component. Views fetch through `useApiQuery` and always render
loading (skeleton), error (safe message + retry) and empty states.

## Backend contract

**The Scritto app has no user accounts.** Analytics are based on anonymous
*installations*: the app generates a random installation ID on first launch,
registers it, and sends usage events (event names only, never note content).
What the Android app needs to change is listed in
[docs/android-integration.md](docs/android-integration.md).

**The FastAPI schemas are the source of truth.** `types/*.ts` is this frontend's
copy of them. When the backend's response models are final, update these
files; the compiler then flags every component that needs to follow. No
database structure is defined here; the types only describe JSON over HTTP.

Called by the **Android app** (no login; see the integration doc):

| Method & path | Purpose |
|---|---|
| `POST /devices/register` | upsert an installation (`installation_id`, model, Android/app version, locale) |
| `POST /events` | batch of usage events for one installation |
| `GET /config` | remote config read at launch |

Called by **this admin site** (admin login required on every `/admin/*` route):

| Frontend function | Method & path | Notes |
|---|---|---|
| `auth.login` | `POST /auth/login` | body `{email, password}`; may return `{access_token}` |
| `auth.getCurrentUser` | `GET /auth/me` | must include `is_admin` (bool) **or** `role` (`"admin"`) |
| `auth.logout` | `POST /auth/logout` | |
| `analytics.getOverview` | `GET /admin/analytics/overview?days=` | `total_installs`, `active_installs`, `new_installs`, `events` |
| `analytics.getInstallAnalytics` | `GET /admin/analytics/installs?days=` | daily active + new installs (replaces the planned `/analytics/users`) |
| `analytics.getEventAnalytics` | `GET /admin/analytics/events?days=` | daily totals, top events, latest events |
| `analytics.getDeviceAnalytics` | `GET /admin/analytics/devices` | Android versions, models |
| `analytics.getVersionAnalytics` | `GET /admin/analytics/versions` | app versions + `latest_version` |
| `devices.listDevices` | `GET /admin/devices?page&page_size&search&app_version` | `Paginated<Device>` |
| `devices.getDevice` | `GET /admin/devices/{installation_id}` | device + `recent_events` + `top_events` |
| `notifications.sendNotification` | `POST /admin/notifications/send` | `{title, body, audience: "all"\|"devices", device_ids?}`; needs FCM |
| `notifications.listNotifications` | `GET /admin/notifications?page&page_size` | |
| `notifications.getNotification` | `GET /admin/notifications/{id}` | |
| `config.getRemoteConfig` | `GET /config` | |
| `config.updateRemoteConfig` | `PUT /config` | body `{values: {key: value}}`, admin only |

`/admin/users*` from the original plan is dropped: there are no user accounts.
"Active" means the installation sent at least one event in the period.
Paginated lists are `{items, total, page, page_size}`. Error bodies can be
anything; the client never shows them (see Security).

## Authentication

1. `/login` posts credentials to `POST /auth/login`.
2. If the response contains `access_token`, it is kept in `sessionStorage` and
   sent as `Authorization: Bearer …`. Every request also uses
   `credentials: "include"`, so **cookie-based sessions work unchanged**: if
   the backend sets an httpOnly cookie and returns no token, nothing else needs to change.
3. The app calls `GET /auth/me`. The **backend decides** whether the user is an
   admin (`is_admin` / `role`); `lib/auth/auth-utils.ts#isAdmin` only reads that.
4. Routes under `app/(admin)` are wrapped in `RequireAdmin`: signed-out users go
   to `/login?next=…` (internal paths only), and non-admins see a "No admin access" screen.
5. Any `401` from any endpoint clears the token and returns to login.

The client-side guard is purely UX. **Every `/admin/*` endpoint must verify the
token and the admin role itself** and return `403` otherwise.

Backend requirements for cross-origin deployments (`admin.` → `api.`):
FastAPI `CORSMiddleware` with the admin origin listed explicitly (no `*`),
`allow_credentials=True`, and `Authorization` / `Content-Type` allowed headers.
For cookie sessions across subdomains use `Domain=.scritto.app; Secure; SameSite=Lax`.

## Security

- No secrets in the frontend; only public `NEXT_PUBLIC_*` config.
- Role checks in the UI are never trusted for security; the backend enforces everything.
- IDs in URLs/forms (installation IDs, notification recipients) are untrusted input; the backend validates them.
- Raw backend/database errors are never rendered. `ApiError.message` is a fixed,
  status-based message; the raw body is only logged to the console in development.
- Login redirects only accept internal paths (prevents `?next=` open redirects).
- Security headers (`X-Frame-Options: DENY`, `nosniff`, referrer and permissions policy) are set in `next.config.ts`.
- Pages are marked `noindex`.

## Replacing mocks with FastAPI

`lib/mocks/server.ts` implements the same paths and response shapes as the
real API and is plugged in **only** inside `lib/api/client.ts`. Components and
`lib/api/*` don't know mocks exist. To switch:

1. Set `NEXT_PUBLIC_USE_MOCKS=false` and `NEXT_PUBLIC_API_URL`.
2. Adjust `types/*.ts` to the final FastAPI schemas, then fix what the compiler flags.
3. Once fully on the real API, `lib/mocks/` can be deleted (and the 6-line branch in `client.ts`).

## Deployment

The app has no provider-specific code. Hosting changes are config-only.

**Separate subdomains (e.g. Vercel + Render):**
`admin.scritto.app` → this app; `NEXT_PUBLIC_API_URL=https://api.scritto.app/api/v1`.
Set the backend CORS as described above.

**Same domain behind a reverse proxy:**
`scritto.app/admin` → this app (`NEXT_PUBLIC_BASE_PATH=/admin`),
`scritto.app/api/*` → FastAPI (`NEXT_PUBLIC_API_URL=/api/v1`). Same-origin, so no CORS needed.

```nginx
location /api/   { proxy_pass http://fastapi:8000; }
location /admin  { proxy_pass http://admin:3000; }   # next start, or node .next/standalone/server.js
```

**Self-hosted Node/Docker:** build with `NEXT_OUTPUT_STANDALONE=true`, then run
`node .next/standalone/server.js` (copy `.next/static` and `public/` alongside, per Next.js docs).

`NEXT_PUBLIC_*` values are inlined at **build** time, so rebuild after changing them.
