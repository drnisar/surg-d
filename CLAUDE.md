# Surgical D Ward

Ward routine and task management for Surgical D Unit, Khyber Teaching Hospital.

`surg-d.md` is the owner's requirements list. Read it at the start of any feature work. Don't edit it unless asked; point out where the app and the spec differ instead.

## Layout

npm workspaces monorepo:

- `client/` — React 18 + Vite 6 + React Router 6. `pages/` hold data loading and state; `components/` are presentational and take props (`RosterTable`, `RosterPicker`, `ShiftDutyCards`, `DayToolbar`, `LoginForm`, `EmployeeForm`). Plain CSS in `src/styles.css`.
- `server/` — Express 4 + `mysql2/promise` (named placeholders), JWT auth. Routes in `src/routes/`, validation/DTO helpers in `src/employees.js` and `src/roster.js`.
- `shared/` — domain rules used by both sides: designations → roles, MR number, phone normalisation, shifts, places of duty, roster eligibility. Put a rule here if both client and server need it.

## Commands

```bash
npm run dev          # API on :4000 + web on :5173 (Vite picks the next free port if taken)
npm test             # server unit tests (node:test)
npm run build        # client production build
npm run db:migrate   # apply new files in server/db/migrations
npm run db:seed      # create the initial admin (employee code 1)
```

- Local MySQL runs as `root`. Credentials are in `server/.env` (git-ignored).
- To change the schema, add the next numbered file to `server/db/migrations/`. Never edit an applied migration.
- Use ES modules everywhere. Match the existing style: 2-space indent, single quotes, short comments only where the reason isn't obvious.

## Domain rules

- **Role:** always derived from designation (`roleForDesignation`). Only the admin account has no designation.
- **MR number:** `K03` + `6` + `00` + employee code padded to 8 digits (`buildMrNumber`).
- **Roster:** Morning and Evening shifts × places of duty (Ward, SAU, OR, OPD).
  - An employee may be in only one place per shift. This is enforced by a unique key and checked in the API.
  - Editors: admin, consultant, manager. Rostered: consultant, manager, doctor.

## Up-to-date library docs (Context7)

Before writing or changing code that uses a library API, check the current docs through Context7 instead of relying on memory. The API key is `CONTEXT7_KEY` in `.env.secrets` at the repo root (git-ignored). Load it into the shell; never print it, echo it, or commit it.

```bash
set -a; . ./.env.secrets; set +a

# Find a library ID
curl -s "https://context7.com/api/v2/search?query=react-router" \
  -H "Authorization: Bearer $CONTEXT7_KEY"

# Fetch docs for a topic
curl -s "https://context7.com/api/v2/context?libraryId=/websites/reactrouter_6_30_3&query=protected+routes&type=txt" \
  -H "Authorization: Bearer $CONTEXT7_KEY"
```

Library IDs for this project. Prefer docs that match the installed major version:

| Library (installed) | Context7 ID |
|---|---|
| React 18.3 | `/reactjs/react.dev` |
| React Router 6.30 | `/websites/reactrouter_6_30_3` |
| Vite 6.4 | `/websites/v6_vite_dev` |
| Express 4.22 | `/expressjs/express` (check examples are not Express 5-only) |
| mysql2 3.x | `/sidorares/node-mysql2` |
| MySQL 8 SQL | `/websites/dev_mysql_doc_refman_8_0_en` |
| jsonwebtoken 9 | `/auth0/node-jsonwebtoken` |

Keep `query` short and specific (e.g. `useEffect+cleanup`, `pool+transactions`). Pipe through `head -c` if you only need the first snippets.
