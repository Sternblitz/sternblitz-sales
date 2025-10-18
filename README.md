# Sternblitz Vertriebsplattform ⚡

Modernisierte Next.js-App mit Supabase Auth, geschützten Dashboard-Flows und serverseitigen PDFs.

## Umgebung

| Variable | Zweck |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Basis-URL deiner Supabase-Instanz. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Öffentlicher Anon-Key – wird für Browser- und Server-Clients verwendet. |
| `RESEND_API_KEY` | API-Key für Resend (optional, für Bestätigungs-Mails). |
| `RESEND_FROM` / `RESEND_REPLY_TO` | Absender- und Reply-To-Adresse für den Mailversand. |

> ⚠️ Es werden keine Service-Role-Keys mehr im Frontend oder in API-Routes benötigt. Sämtliche Datenbankzugriffe laufen über Session-gebundene Supabase-Clients, damit RLS greift.

## Supabase Auth & RLS

- **Supabase-Clients**
  - `src/lib/supabase/browser.ts` kapselt `createBrowserClient` für Client-Komponenten.
  - `src/lib/supabase/server.ts` kapselt `createServerClient` und akzeptiert optionale Cookie-/Header-Stores (nützlich in Server Actions & Routen).
- **Middleware**
  - `src/middleware.ts` schützt `/dashboard(.*)` und `/sign(.*)` und leitet bei fehlender Session sauber auf `/login?redirect=…` um.
- **Rollen-Scoping**
  - Die API `/api/orders/list` sowie das Dashboard lesen über den Session-Client. RLS-Policies entscheiden, welche Leads pro Rolle sichtbar sind.
  - Beim Signieren (`POST /api/sign/submit`) werden `sales_rep_id`, `team_id` und `source_account_id` automatisch aus dem authentifizierten Profil (`profiles`-Tabelle) bzw. der Session injiziert. Dadurch können Anfragen die Zuordnung nicht spoofing.

### Tabellen-Annahmen

- Tabelle `profiles`: enthält mindestens `id`, `sales_rep_id`, `team_id`, `source_account_id` (nullable). Fällt ein Feld leer, werden folgende Defaults verwendet:
  - `sales_rep_id` → Supabase User ID
  - `team_id` → `null`
  - `source_account_id` → Supabase User ID
- Tabelle `leads`: akzeptiert Felder wie `sales_rep_id`, `team_id`, `source_account_id`, `counts` (JSON) sowie die PDF-Metadaten.
- Storage-Bucket `contracts`: public (für `pdf_signed_url`).

## Dashboard Orders

- `src/app/dashboard/orders/page.tsx` rendert serverseitig und nutzt Suspense, um Lade-, Fehler- und Leerzustände zu visualisieren.
- Filter (`?range=today|yesterday|7d|all`) werden zentral über `src/lib/orders/range.ts` ausgewertet und sowohl in der API als auch im UI genutzt.
- Tabelle zeigt neben Kontaktdaten auch die Zuordnung (`sales_rep_id`, `team_id`, `source_account_id`) sowie den PDF-Link.

## Login & Auth Flow

- `/login` ist ein Server Component mit einer Server Action zum Einloggen.
- Erfolgreiche Logins landen auf `/dashboard/orders`.
- Bereits authentifizierte Nutzer werden direkt weitergeleitet.

## Smoke-Test

`npm run smoke` prüft per Node-Test, dass die Supabase-Wrapper weiterhin ausschließlich den Anon-Key verwenden und alle API-Routen den serverseitigen Client nutzen.

```bash
npm run smoke
```

Für einen vollständigen Produktions-Build kannst du zusätzlich `npm run build` ausführen.

## Manuelle Prüfungen

Empfohlenes QA-Grid nach Änderungen an Policies:

1. **Sales** – sollte nur eigene Leads sehen; Signatur erzeugt Einträge mit eigener User-ID als `sales_rep_id` & `source_account_id`.
2. **Teamlead** – sollte die dem Team zugeordneten Leads sehen; prüfe `team_id`-Filter in deinen Policies.
3. **Admin** – volle Sichtbarkeit.

Alle drei Rollen sollten ohne Service-Role-Key funktionieren – falls nicht, prüfe deine RLS-Regeln.
