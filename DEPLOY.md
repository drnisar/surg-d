# Deploying to Vercel + TiDB Cloud

The app runs as two Vercel projects, both deploying the `main` branch of `drnisar/surg-d`:

| Project | Root Directory | Preset | URL |
|---|---|---|---|
| **server** | `server` | Express | https://server-five-lac-66.vercel.app |
| **client** | `client` | Vite | https://surg-d.vercel.app (also https://client-three-kohl-90.vercel.app) |

- **server** runs the Express API from the default export of `server/src/app.js`. `server/vercel.json` runs it in Singapore (`sin1`), close to the database and the hospital feed.
- **client** serves the built web app. `client/vercel.json` forwards every `/api/...` request to the server and sends every other path to `index.html`. The browser only ever talks to the client's address, so no CORS setup is needed. If the server's URL changes, update it in `client/vercel.json`.
- The database is **TiDB Cloud**. It speaks MySQL, so the code and migrations are the same as locally.

> **Before going live:** get sign-off for keeping patient data on these services. The database holds patient MR numbers and task notes. It also holds the last bed list from the hospital feed (patient names, MR numbers, consultants) in `beds_cache`.

## 1. Check the hospital bed feed is reachable from outside

The server calls `BEDS_API_URL` (`http://182.188.28.220:8034/...`) from Singapore. If the hospital firewall only lets in local addresses, the Ward page will show "Could not load beds". Ask hospital IT. Everything else in the app works without it.

## 2. Create the database (TiDB Cloud)

1. Sign up at tidbcloud.com and create a **Starter** (free) cluster in **AWS Singapore (ap-southeast-1)**.
2. Open **Connect**, choose "General" / Node.js, and generate a password. Note these four values:
   - host, e.g. `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`
   - port `4000`
   - user, e.g. `xxxxxxxx.root`
   - password
3. Create `server/.env.production` on your computer. It's git-ignored, so it stays private.

   ```bash
   DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
   DB_PORT=4000
   DB_USER=xxxxxxxx.root
   DB_PASSWORD=...
   DB_NAME=surg_d
   DB_SSL=true

   ADMIN_EMPLOYEE_CODE=1
   ADMIN_NAME=System Administrator
   ADMIN_EMAIL=you@example.com
   ADMIN_PASSWORD=<a strong password>
   ```

4. Create the tables and the admin account:

   ```bash
   npm run db:migrate:prod
   npm run db:seed:prod
   ```

## 3. Environment variables on the **server** project

In Vercel, open **server → Settings → Environment Variables** and add these for Production. The client project needs none.

| Name | Value |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | same as `.env.production` |
| `DB_SSL` | `true` |
| `JWT_SECRET` | a long random string, e.g. the output of `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | `30d` (how long a sign-in lasts) |
| `ALLOW_IMPERSONATION` | `false` (turns off Switch user) |
| `BEDS_API_URL` | the hospital feed URL from `server/.env` |
| `BEDS_CACHE_SECONDS` | `300` |
| `BEDS_EXCLUDE` | `ORHB` (a group: also hides `ORHB-1`, `ORHB-5`, …) |

Environment variables only take effect on the next deployment, so redeploy the server after changing them.

## 4. Check

- `https://server-five-lac-66.vercel.app/api/health` returns `{"ok":true}`.
- `https://surg-d.vercel.app/api/health` returns the same, which shows the client forwards requests to the server.
- On https://surg-d.vercel.app, you can log in with the admin MR number `K0360000000001` and `ADMIN_PASSWORD`, and the Ward page lists beds. If beds don't load, see step 1.

## Later changes

- **Code:** pushing to `main` redeploys both projects.
- **Database changes:** a new file in `server/db/migrations/` must also be applied to the cloud database. Run `npm run db:migrate:prod` before or right after the deploy that needs it.

## Good to know

- **Plans:** Vercel's free Hobby plan is meant for personal, non-commercial use. A hospital deployment may need the Pro plan, so check their terms. The TiDB Starter free tier is ample for one ward.
- **Bed list after a pause:** each fresh start of the API reads the last bed list from the database, so the Ward page only waits for the hospital feed when that list is older than `BEDS_CACHE_SECONDS`.
- **Local development** is unchanged: `npm run dev` still uses `server/.env` and your local MySQL.
