# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Surgical D Ward

Ward routine and task management for Surgical D Unit, Khyber Teaching Hospital.

`surg-d.md` is the owner's requirements list. Read it at the start of any feature work. Don't edit it unless asked; point out where the app and the spec differ instead.

## Commands

```bash
npm install          # once, from the repo root (installs all workspaces)
npm run dev          # API on :4000 (node --watch) + web on :5173 (Vite picks the next free port if taken)
npm test             # server + shared unit tests (node:test)
npm run build        # client production build (the only build step)
npm run db:migrate   # apply new files in server/db/migrations
npm run db:seed      # create the initial admin (employee code 1, password from server/.env)
npm run db:migrate:prod / db:seed:prod   # same, against the cloud DB in server/.env.production

# Single test file / tests matching a name — run from server/
# (a pattern passed through `npm test --` is ignored)
node --test test/tasks.test.js
node --test --test-name-pattern="phone" "test/**/*.test.js"
```

- There is no linter or formatter configured. Match the existing style: ES modules, 2-space indent, single quotes, short comments only where the reason isn't obvious.
- Local MySQL runs as `root`. Credentials are in `server/.env` (git-ignored; copy from `server/.env.example`). `docker-compose.yml` offers a MySQL 8.4 alternative.
- Tests are unit tests of pure validation and domain functions; they don't touch the database. To check an endpoint end to end, run `npm run dev` and use `curl` against `/api/...`. Delete any test rows afterwards.
  - Get a token from `POST /api/auth/login` with `{ identifier, password }`. `ADMIN_PASSWORD` in `.env` is only read by `db:seed` and may no longer match the admin's password. If it doesn't, sign a short-lived token with `jwt.sign({ sub: id, role }, config.jwtSecret)` from a script in `server/` run with `--env-file`, and delete the script afterwards.
- Starting the server outside npm needs `node --env-file-if-exists=.env src/index.js`, run from `server/`. Without the flag, `.env` isn't loaded. Don't `source` `server/.env`: some values are unquoted and contain spaces. Read single keys with `grep '^KEY=' server/.env | cut -d= -f2-`.

## Architecture

npm workspaces monorepo: `client/` (React 18, Vite 6, React Router 6), `server/` (Express 4, `mysql2/promise`, JWT), `shared/` (plain ES modules).

- **`shared/` is the source of domain rules.** It covers designations → roles, MR number build/parse, phone normalisation, shifts, places of duty, beds, task templates, and who may be rostered, assigned tasks or allocate beds. Both sides import it as `@surg-d/shared` straight from source; there's no build. A rule that both the UI and the API need goes here, so the client can preview what the server will enforce (e.g. the generated MR number, the derived role).
- **Request path:** the client calls `api('/path')` (`client/src/api.js`), which prefixes `/api` and adds the bearer token from `localStorage`. Vite proxies `/api` to `:4000`, so there's no CORS in dev.
- **Server structure:** each `server/src/routes/*.js` is an Express router mounted in `src/app.js`. Validation and row→DTO mapping live next to it in `src/employees.js`, `src/roster.js`, `src/tasks.js` and `src/bedAllocations.js`. Validators return `{ data, errors }`. Routes throw `HttpError(status, message, details)`, and `errorHandler` turns that into `{ error, details }`. A 422's `details` is keyed by request field name, and client forms show each message under its field. Duplicate-key MySQL errors are mapped to 409s in `errorHandler`.
- **Auth:** `requireAuth` sets `req.user = { id, role, impersonatedBy }` from the JWT, and `requireRole(...)` gates a route.
  - Role is never sent by the client. It is derived from designation when an employee is saved, and only the admin account has no designation.
  - Passwords: users change their own on Profile (`POST /api/auth/password`, which checks the current one and is refused while impersonating). The admin resets anyone's from Staff → Edit. `PASSWORD_MIN_LENGTH` in `shared/` applies to both.
  - On the client, `AuthProvider` (`auth.jsx`) holds the user.
  - `TaskBadgeProvider` (`taskBadge.jsx`) polls the unseen-task count. It is keyed by `user.id` in `App.jsx`, so switching user remounts every page.
- **Client structure:** `pages/` own data loading and state; `components/` are presentational and take props and callbacks. Dates are handled as local `YYYY-MM-DD` / `YYYY-MM` strings (`client/src/dates.js`), and the server returns `DATE` columns via `DATE_FORMAT`, so nothing shifts across timezones.
- **Deployment (see `DEPLOY.md`):** Vercel serves `client/dist` and runs the Express app as one function via `api/index.js`. `vercel.json` rewrites `/api/*` to it and everything else to `index.html`, and pins the function to `sin1`. The database is TiDB Cloud (MySQL-compatible, needs `DB_SSL=true`). `server/src/index.js` is only the local long-running entry, so don't put start-up work there that production needs. The bed list is also kept in `beds_cache`, so serverless cold starts don't wait on the hospital API.
- **Database:** `server/scripts/migrate.js` creates the database if it's missing, then applies `server/db/migrations/NNN_*.sql` in order. Each applied file is recorded in `schema_migrations`. Add the next numbered file for any schema change; never edit an applied one. Employees are soft-deleted (`is_active = 0`).

## Domain rules

- **MR number:** `K03` + `6` + `00` + employee code padded to 8 digits (`buildMrNumber`). Staff enter only the employee code; the login form also expands a bare code.
- **Phone:** stored as country code (`+92`) plus the number with one leading zero removed.
- **Adding staff:** the admin adds anyone. An Experiential Registrar may add Trainee Medical Officers and House Officers (`addableDesignations` in `shared/`, keyed by designation because ER and TR share the manager role). `POST /api/employees` looks up the caller's designation and ignores `role` from non-admins, so only the admin can create admin accounts. Editing and deactivating staff stay admin-only.
- **Roster:** Morning and Evening shifts × places of duty (Ward, SAU, OR, OPD).
  - An employee may be in only one place per shift. The unique key `(duty_date, shift, employee_id)` enforces this, and `PUT /api/roster/assignments` checks for conflicts inside a transaction (`SELECT … FOR UPDATE`) to return a readable 409.
  - Editors: admin, consultant, manager. Rostered: consultant, manager, doctor.
  - The page opens read-only, and editors get an Edit toggle.
  - Print calls `window.print()`. `RosterPrint` (a black-and-white A4 landscape grid, with designation abbreviations from `designationShort`) is hidden on screen, and the `@media print` block at the end of `styles.css` swaps it in for the page.
- **Tasks:**
  - Beds come from the hospital system (`BEDS_API_URL`, `GetDoctorAdmittedPatients`) via `server/src/hospitalBeds.js` and `GET /api/beds`.
    - Only occupied beds are listed, with codes like `K031539`. Each has patient name, MR number, consultant and unit.
    - The API takes ~10 s, so results are cached (`BEDS_CACHE_SECONDS`, default 300) and preloaded at server start. Concurrent requests share one fetch. If a refresh fails, the last list is served with `stale: true`.
    - `BEDS_EXCLUDE` (default `ORHB-1`, a holding area with ~80 stale admissions) drops pseudo-beds.
  - Tasks follow the patient. On create, the server looks up the bed in the cached list and stores `patient_mr`, never trusting the client for it. Ward and the bed dialog match tasks by `patient_mr`, falling back to `bed_code` for older rows without one.
  - Any signed-in user can assign tasks to a doctor (consultant, manager or doctor role), one or a batch of up to 20 saved in one transaction, and can complete any open task. `completed_by` records who completed it.
  - Tasks belong to the day they were created. Ward, the bed dialog, My tasks and the badge show only today's tasks. The Archive page (`/archive?status=&bed=&mine=1`) lists earlier days, undone by default, where they can still be completed.
  - "Today" is the browser's local day. The client sends `from`/`to` as epoch ms (`dayQuery()` in `dates.js`), and the server compares with `FROM_UNIXTIME(?)`, so it doesn't depend on the Node or MySQL timezone.
  - The badge counts today's open tasks assigned to me with `seen_at IS NULL`. Visiting My tasks marks them seen, and the client polls every 30 s.
- **Bed allocation:** a standing list of which doctors cover which beds (`bed_allocations`, `GET`/`PUT /api/beds/allocations`).
  - Keyed by bed code, not patient, so whoever is admitted to a bed falls under its doctors. Allocations stay put while a bed is empty. Several doctors may share a bed.
  - Editors are the roster editors (`BED_ALLOCATION_EDITOR_ROLES`), and only `TASK_ASSIGNEE_ROLES` can be given beds. `PUT` takes `bedCodes`, `employeeIds` and `mode` (`add`, or `replace`, where an empty list clears the beds).
  - Ward shows the responsible doctors on each bed and a "My beds" filter. Editors tick beds under "Allocate beds". Task assignment doesn't use it.
- **Switch user (testing aid):** on the Profile page the admin can act as any active user without their password (`POST /api/auth/impersonate`). This is the quickest way to test role-specific screens.
  - It issues a 2-hour token with an `imp` claim (the admin's id). Anything done meanwhile is saved as that user.
  - The admin token is kept in `localStorage` for "Return to admin". Switching again from an impersonated session is refused.
  - Controlled by `ALLOW_IMPERSONATION`; off by default when `NODE_ENV=production`.

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

| Library (installed) | Context7 ID                                                  |
| ------------------- | ------------------------------------------------------------ |
| React 18.3          | `/reactjs/react.dev`                                         |
| React Router 6.30   | `/websites/reactrouter_6_30_3`                               |
| Vite 6.4            | `/websites/v6_vite_dev`                                      |
| Express 4.22        | `/expressjs/express` (check examples are not Express 5-only) |
| mysql2 3.x          | `/sidorares/node-mysql2`                                     |
| MySQL 8 SQL         | `/websites/dev_mysql_doc_refman_8_0_en`                      |
| jsonwebtoken 9      | `/auth0/node-jsonwebtoken`                                   |

Keep `query` short and specific (e.g. `useEffect+cleanup`, `pool+transactions`). Pipe through `head -c` if you only need the first snippets.

## Task Management System

The owner's original brief for tasks, kept for reference. Parts are superseded: beds now come from the hospital API rather than hard-coded `SDW-` codes (see **Tasks** under Domain rules).

- We have a 56 bedded ward
- for now hard code the 56 beds as SDW-01 to SDW-52,
- later on we shall fetch from an api the beds, with patient's name, MR number and consultant's name
- In front of each bed, create a button that opens a dialog
- In the dialog a task is written or selected from predefined list and assigned to a specific doctor.
- On the doctor's personalized page, he she shall see his/ her own assigned tasks as well as tasks for the whole ward
- When somebody completes the task, mention the task to be completed and the name of the doctor written against that completed tasks
- A notification badge on top of each doctor's profile or page when a new task is assigned
