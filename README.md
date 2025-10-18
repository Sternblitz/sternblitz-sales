# Sternblitz Vertriebsplattform ⚡

**Step 1:** Minimaler Build (Login, Dashboard-Hülle, Live-Simulator-Placeholder)

## Env
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Seiten
- `/login` – E-Mail/Passwort Login (Supabase)
- `/dashboard` – Simulator oben, Button „Jetzt loslegen“

## Nächste Schritte
- Supabase Auth aktivieren (Email + Password)
- DB-Schema (profiles, teams, orders)
- Formular mit 4 Kästchen + Individual
- Signatur + PDF + Stripe + Postmark

## Auth & RLS

- **Supabase Clients**: Server code uses `src/lib/supabase/server.ts` (cookies-backed `createServerClient`), while interactive UI uses `src/lib/supabase/browser.ts`. Service-role keys are no longer required anywhere in the app.
- **Middleware Guard**: `src/middleware.ts` protects `/dashboard(.*)` and `/sign`, redirecting unauthenticated traffic to `/login` while preserving the requested path via `?redirect=`.
- **Server-Side Login**: `src/app/login/page.tsx` renders a server action backed login form. Successful authentication redirects to `/dashboard/orders` and persists the Supabase session via HttpOnly cookies.
- **Orders API**: `src/app/api/orders/list/route.ts` runs on the user session and relies on Supabase RLS for scoping. Filters support `?range=today|yesterday|7d|all` and `?q=` search terms.
- **Order Attribution**: `src/app/api/sign/submit/route.ts` injects `sales_rep_id`, `team_id`, and `source_account_id` from the authenticated profile before saving leads or uploading PDFs, ensuring data lineage is enforced by policies.

### RLS expectations

- `leads` rows are visible according to Supabase policies: sales → own (`source_account_id` or `sales_rep_id`), teamlead → team (`team_id`), admin → all rows.
- `profiles` exposes only the caller’s record; additional fields (`team_id`, `sales_rep_id`) are used to derive lead ownership on insert.
- Storage bucket access (contracts) uses the end-user session; ensure bucket policies allow authenticated uploads and reads for permitted roles.

### Manual verification checklist

1. **Sales** – log in as a sales profile, create an order via `/sign`, confirm it appears in `/dashboard/orders` and the API only returns that user’s rows.
2. **Teamlead** – log in as a team lead, confirm `/dashboard/orders` shows team members’ orders and respects filters.
3. **Admin** – log in as admin and ensure all orders are visible while filters and PDF links continue to work.

## Smoke test

- Run `npm run smoke` to execute a lightweight build verification (`next build`), catching TypeScript or server-action regressions early.
