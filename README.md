# The Gridiron Oracle League — Web-App

Eigenständige Next.js-Web-App für deine Solo-Fantasy-Football-Liga. Läuft
unabhängig vom Claude-Chat, mit Cloud-Sync über Supabase — du kannst vom Handy
weiterdraften, wo du am Laptop aufgehört hast.

## Was funktioniert (Phase 1)

- **Draft Room** (`/draft`): Live-Snake-Draft, 9 KI-Manager mit eigener
  Persönlichkeit (regelbasiert, kein API-Key nötig), Roster- und Pick-Historie.
- **Liga-Setup** (`/setup`): Draft-Reihenfolge frei zuordnen, bestehenden
  Draft-Stand importieren, alles zurücksetzen.
- **Cross-Device-Sync**: Mit Supabase-Konfiguration synct der State in
  Echtzeit über alle Geräte, auf denen du die App öffnest. Ohne Supabase läuft
  die App lokal im Browser (localStorage) — funktioniert, aber ohne Sync.

## Bekannte Lücken (ehrlich, für den nächsten Ausbauschritt)

1. **Bye-Wochen** sind für 168 der 207 Spieler noch nicht erfasst (`bye: 0`
   in `data/players.json`) — die Quelle, aus der der Datensatz stammt, hat
   keine Bye-Woche mitgeliefert. Die 39 ursprünglichen Spieler haben echte
   Werte.
2. **Team-Zuordnung bei Trades/Signings während der laufenden Saison** kann
   sich ändern — der Datensatz ist ein Schnappschuss vom 26.08.2026.
3. **Season-Engine** (Matchups, Scoring, Standings) und **Waiver/Trades**
   sind noch nicht gebaut (Phase 2/3).

## Datenquelle

`data/players.json` enthält 207 Spieler:
- **Rang 1–200**: Offense-Skillpositionen (QB/RB/WR/TE), Quelle: Rotoworld /
  NBC Sports Consensus Rankings, Stand 26.08.2026 (cross-checked gegen CBS
  Sports Consensus Rankings, gleicher Stand).
- **Rang 201–207**: DST + Kicker, aus der ursprünglichen Projekt-Stichprobe
  übernommen (Rotoworld-Liste deckt keine DST/K ab).
- 39 Spieler haben handgeschriebene Scouting-Notizen (`curated: true`), der
  Rest hat automatisch aus Rang/Position berechnete proj/floor/upside/radar-
  Werte (`curated: false`) — transparent gekennzeichnet, keine erfundenen
  Scouting-Aussagen.

---

## Deployment (kostenlos, ca. 15–20 Minuten)

### Schritt 0: Google-Login einrichten (Multi-User-Modus)

Seit Phase 4 unterstützt die App Google-Anmeldung — jeder Google-Account
bekommt automatisch seine eigene, komplett getrennte Liga (per Row-Level-
Security in Supabase abgesichert, keine zusätzliche Schema-Änderung nötig).

1. **Google Cloud Console** → [console.cloud.google.com](https://console.cloud.google.com)
   → Neues Projekt (oder bestehendes nutzen) → **APIs & Services → Credentials**
   → **Create Credentials → OAuth client ID** → Application type: **Web application**.
2. Bei **Authorized redirect URIs** einfügen:
   `https://DEIN-PROJEKT.supabase.co/auth/v1/callback`
   (die genaue URL findest du gleich in Supabase, Schritt 4).
3. Client ID und Client Secret kopieren.
4. In Supabase: **Authentication → Providers → Google** → aktivieren → Client ID
   und Secret einfügen → Speichern. Die Redirect-URL für Schritt 2 steht direkt
   auf dieser Seite.
5. In Supabase: **Authentication → URL Configuration** → **Site URL** auf deine
   Vercel-URL setzen, und unter **Redirect URLs** zusätzlich
   `http://localhost:3000/auth/callback` für lokale Tests eintragen.

Ohne diesen Schritt läuft die App weiter im bisherigen Solo-Modus (mit oder
ohne Supabase) — Login ist nur aktiv, wenn Google als Provider konfiguriert
ist und `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` gesetzt sind.

### Schritt 0b: Discord-Login zusätzlich einrichten (optional)

Analoges Prinzip wie bei Google:

1. [discord.com/developers/applications](https://discord.com/developers/applications)
   → **New Application** → Namen vergeben.
2. Links **OAuth2** → bei **Redirects** dieselbe URL wie bei Google eintragen:
   `https://DEIN-PROJEKT.supabase.co/auth/v1/callback`
3. Auf derselben Seite **Client ID** kopieren, bei **Client Secret** auf
   "Reset Secret" (falls noch keins sichtbar) und kopieren.
4. In Supabase: **Authentication → Providers → Discord** → aktivieren →
   Client ID + Secret einfügen → Speichern.

Der Discord-Button erscheint auf der Login-Seite automatisch, sobald der
Provider in Supabase aktiv ist — kein Code-Änderung nötig.

### Schritt 0c: Magic Link (E-Mail-Login ohne OAuth-Setup)

Braucht keine externe App-Konfiguration — der "Email"-Provider ist in
Supabase standardmäßig aktiv. Einfach E-Mail eingeben, Link im Postfach
öffnen, fertig. Gut geeignet, wenn du OAuth-Apps (Google/Discord) grundsätzlich
skeptisch gegenüberstehst oder sie einfach noch nicht eingerichtet hast.

### Sicherheitshinweis zu Row-Level-Security

Die Policies für `leagues`/`league_members` sind bewusst eng gehalten: Nur
Mitglieder einer Liga dürfen deren Zeilen direkt lesen. Der Invite-Flow (eine
Liga per Code finden, bevor man Mitglied ist) läuft ausschließlich über zwei
`security definer`-Postgres-Funktionen (`get_invite_preview`, `join_league`),
die gezielt nur die für die Einladung nötigen Felder zurückgeben bzw. das
Beitreten atomar (inkl. Race-Condition-Schutz durch den `unique(league_id,
team_id)`-Constraint) durchführen — kein pauschales "jeder eingeloggte Nutzer
darf alles lesen" mehr.

### Schritt 1: Supabase-Projekt anlegen (überspringen, falls schon vorhanden)

1. Gehe zu [supabase.com](https://supabase.com) → "Start your project" → mit
   GitHub oder E-Mail registrieren (kostenlos, keine Kreditkarte nötig).
2. "New Project" → Namen vergeben (z.B. `gridiron-oracle`), Datenbank-Passwort
   setzen, Region wählen → "Create new project" (dauert ~2 Min).
3. Im Projekt: **SQL Editor** (linke Seitenleiste) → "New query" → Inhalt von
   `supabase/schema.sql` einfügen → "Run".
4. **Project Settings** (Zahnrad unten links) → **API** → dort findest du:
   - `Project URL` → das ist dein `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` Key → das ist dein `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Schritt 2: Lokal testen (optional, aber empfohlen)

```bash
cd gridiron-oracle
cp .env.local.example .env.local
# .env.local öffnen und die beiden Werte aus Schritt 1 eintragen
npm install
npm run dev
```

Öffne `http://localhost:3000` — die App sollte laufen und mit deiner Supabase-
Datenbank synchronisieren.

### Schritt 3: Auf Vercel deployen (macht die App von überall erreichbar)

**Variante A — mit GitHub (empfohlen für spätere Updates):**
1. Lade den Ordner `gridiron-oracle` als neues Repository zu GitHub hoch
   (z.B. via GitHub Desktop oder `git init && git add . && git commit -m "init" && git push`).
2. Gehe zu [vercel.com](https://vercel.com) → mit GitHub anmelden → "Add New
   Project" → dein Repository auswählen.
3. Bei "Environment Variables" die beiden Werte aus Schritt 1 eintragen
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. "Deploy" klicken. Nach ~1 Minute bekommst du eine echte URL
   (`https://gridiron-oracle-xyz.vercel.app`) — die kannst du von jedem
   Gerät öffnen (zum Homescreen hinzufügen für App-Gefühl auf dem Handy).

**Variante B — ohne GitHub, direkt per CLI:**
```bash
npm install -g vercel
cd gridiron-oracle
vercel
# Folge den Prompts, dann:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

### Schritt 4: Bestehenden Draft-Stand übernehmen

Öffne die deployte App → `/setup` → trage deine reale Draft-Reihenfolge ein
(du bist laut letztem Stand auf Pick 3) und importiere die bereits gemachten
Picks (R1 Bijan Robinson, R2 Saquon Barkley, R3 Nico Collins) über das
Import-Textfeld im Format `pick:rang`. Die Ränge findest du in
`data/players.json` oder direkt in der Spielerliste im Draft Room.

---

## Projektstruktur

```
app/
  page.tsx          Dashboard
  setup/page.tsx    Liga-Setup (Reihenfolge, Import, Reset)
  draft/page.tsx    Draft Room (Kernstück)
  globals.css       Design-System (1:1 aus draftboard-2026.html)
lib/
  types.ts          Zentrale TypeScript-Typen
  teams.ts           10 Team-Konfigurationen inkl. KI-Persönlichkeiten
  personas.ts        Persona-Katalog für die Setup-Zuordnung
  players.ts          Spieler-Pool-Zugriff + Fallback-Generator
  draftEngine.ts       Snake-Order, Roster-Tracking, KI-Entscheidungslogik
  supabaseClient.ts   Supabase-Verbindung
  useLeagueState.ts    React-Hook: Laden/Speichern/Realtime-Sync
data/
  players.json         207 Spieler (siehe oben)
supabase/
  schema.sql            Datenbank-Schema zum Ausführen in Supabase
```

## Nächste Ausbauschritte (Phase 2/3, nicht in diesem Build enthalten)

- Season-Engine: Matchups, wöchentliches Scoring, Standings
- Waiver Wire mit FAAB-Gebotslogik
- Trade-Center mit KI-Verhandlung pro Persönlichkeit
- Optional: Anthropic API für dynamische Kommissar-Kommentare/Trade-Talk
  statt der statischen Zitate in `lib/teams.ts`
- Bye-Wochen für die 168 nicht-kuratierten Spieler nachpflegen
