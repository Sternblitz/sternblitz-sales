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

## Auth & Rollen
- Rollen werden in erster Linie über `user.user_metadata.role` erkannt. Falls dort kein Wert gesetzt ist, wird die Tabelle `profiles` (Spalte `role`) abgefragt. Standard-Rolle ist `sales`.
- Die API `GET /api/orders/list?range=...` prüft die aktuelle Supabase-Session und liefert nur dann Daten aus. `sales`- und `team_lead`-Accounts sehen ausschließlich Aufträge, deren `source_account_id` ihrer eigenen User-ID entspricht. `admin`-Accounts erhalten alle Leads.
- Beim POST auf `/api/sign/submit` wird serverseitig der eingeloggte Supabase-User ermittelt. Die erzeugten Leads erhalten automatisch `source_account_id = user.id` des ausführenden Accounts.
