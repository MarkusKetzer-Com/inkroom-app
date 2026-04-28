# AI Development & Workflow Notes

Dieser Leitfaden dient als "Gedächtnis" für zukünftige Chat-Sitzungen mit der KI (Antigravity), damit gängige Workflows nicht jedes Mal neu herausgefunden werden müssen.

## Git & GitHub Authentifizierung
- **Verbindung:** Das Repository ist auf SSH-Authentifizierung umgestellt (`git@github.com:MarkusKetzer-Com/inkroom-app.git`).
- **Berechtigung:** Der SSH-Schlüssel (`id_ed25519`) wurde mitsamt seinem Passwort dauerhaft im macOS-Schlüsselbund (Keychain) hinterlegt (`ssh-add --apple-use-keychain`).
- **KI-Fähigkeit:** Die KI kann den Befehl `git push` (sowie pull, fetch etc.) ab sofort **selbstständig im Hintergrund ausführen**. Es poppen keine störenden Authentifizierungsfenster mehr auf, und es kommt nicht mehr zum "Device not configured"-Fehler.

## Cloudflare Deployment
- **Produktion:** Um die App auf Cloudflare (Workers) zu deployen, reicht es, den lokalen Befehl `npm run deploy` auszuführen. Dieser greift direkt auf Wrangler zurück.
- Die KI kann Deployments eigenständig via Skript-Befehl triggern.

## Datenbank- & Schema-Dateien
- Anpassungen am Datenbankschema (`schema.sql`) sowie an den zugrundeliegenden JSON-Konfigurationen (`benchmarks_schema.json`, `jobs_schema.json`, etc.) sollten vor einem Push immer lokal committet werden, damit Code und Datenbankstruktur konsistent in der Versionskontrolle liegen.
