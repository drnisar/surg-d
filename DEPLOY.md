# Deploying to Vercel + TiDB Cloud

The web app and the API run on **Vercel**. The API is the same Express app, served as one function through `api/index.js`. The database is **TiDB Cloud**, which speaks MySQL, so the code and migrations are unchanged. Both live in Singapore, the closest region to Peshawar and to the hospital bed feed.

> **Before going live:** get sign-off for keeping patient data on these services. The database holds patient MR numbers and task notes. It also holds the last bed list from the hospital feed (patient names, MR numbers, consultants) in `beds_cache`.

## 1. Check the hospital bed feed is reachable from outside

Vercel calls `BEDS_API_URL` (`http://182.188.28.220:8034/...`) from Singapore. If the hospital firewall only lets in local addresses, the Ward page will show "Could not load beds". Ask hospital IT whether that address accepts connections from the internet, or from Vercel's Singapore region. Everything else in the app works without it.

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

## 3. Create the Vercel project

1. Commit and push the code to GitHub (`drnisar/surg-d`).
2. On vercel.com: **Add New → Project**, then import the repository.
   - Leave **Root Directory** as the repository root.
   - The build settings come from `vercel.json`: it runs `npm run build`, serves `client/dist`, and sends `/api/*` to the function in Singapore.
3. Under **Settings → Environment Variables**, add these for Production:

   | Name | Value |
   |---|---|
   | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | same as `.env.production` |
   | `DB_SSL` | `true` |
   | `JWT_SECRET` | a long random string, e.g. the output of `openssl rand -base64 48` |
   | `JWT_EXPIRES_IN` | `12h` |
   | `ALLOW_IMPERSONATION` | `false` (turns off Switch user) |
   | `BEDS_API_URL` | the hospital feed URL from `server/.env` |
   | `BEDS_CACHE_SECONDS` | `300` |
   | `BEDS_EXCLUDE` | `ORHB-1` |

4. Deploy, then check:
   - `https://<your-app>.vercel.app/api/health` returns `{"ok":true}`.
   - You can log in with the admin MR number `K0360000000001` and `ADMIN_PASSWORD`.
   - The Ward page lists beds. If it doesn't, see step 1.

## Later changes

- **Code:** pushing to `main` redeploys automatically.
- **Database changes:** a new file in `server/db/migrations/` must also be applied to the cloud database. Run `npm run db:migrate:prod` before or right after the deploy that needs it.

## Good to know

- **Plans:** Vercel's free Hobby plan is meant for personal, non-commercial use. A hospital deployment may need the Pro plan, so check their terms. The TiDB Starter free tier is ample for one ward.
- **Bed list after a pause:** each fresh start of the API reads the last bed list from the database, so the Ward page only waits for the hospital feed when that list is older than `BEDS_CACHE_SECONDS`.
- **Local development** is unchanged: `npm run dev` still uses `server/.env` and your local MySQL.
