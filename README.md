# Surgical D Ward

Ward routine and task management for Surgical D Unit, Khyber Teaching Hospital.
Single repo (npm workspaces) containing:

| Path      | What                                                              |
|-----------|-------------------------------------------------------------------|
| `client/` | React 18 + Vite front end                                         |
| `server/` | Express REST API backed by MySQL (`mysql2`)                       |
| `shared/` | Domain rules used by both: designations → roles, MR number, phone |

Requirements live in [`surg-d.md`](./surg-d.md).

## Getting started

```bash
npm install

# 1. MySQL — either use docker…
docker compose up -d
# …or an existing server:
#   CREATE DATABASE surg_d;
#   CREATE USER 'surgd'@'%' IDENTIFIED BY 'surgd';
#   GRANT ALL ON surg_d.* TO 'surgd'@'%';

# 2. Configure the API (already copied from .env.example on first setup)
cp server/.env.example server/.env   # then edit credentials / JWT_SECRET

# 3. Create/upgrade tables (server/db/migrations, each applied once) and the initial super admin
npm run db:migrate
npm run db:seed

# 4. Run API (http://localhost:4000) and web app (http://localhost:5173)
npm run dev
```

Log in with the seeded admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env`,
or its MR number `K0360000000001`). Users can log in with their MR number, email or official email.

## Domain rules

**Designations and roles** (`shared/src/designations.js`): role is always derived from designation.

| Designation | Role |
|---|---|
| Professor, Associate Professor, Assistant Professor | Consultant |
| Experiential Registrar, Trainee Registrar | Manager |
| Trainee Medical Officer, House Officer | Doctor |
| Nurse | Nurse |
| — (setup account) | Admin |

**MR number** (`shared/src/mrNumber.js`), 14 characters, e.g. `K0360000001100`:
hospital code `K03` + employee type `6` + self `00` + employee code zero-padded to 8 digits.
The admin enters only the employee code; the MR number is generated.

**Phone** (`shared/src/phone.js`): stored as country code (`+92`) + number with
a leading zero removed (`0300 1234567` → `+923001234567`).

## API

| Method | Path | Access |
|---|---|---|
| GET | `/api/health` | public |
| GET | `/api/meta` | public: designations, roles, hospital code |
| POST | `/api/auth/login` | public: `{ identifier, password }` → `{ token, user }` |
| GET | `/api/auth/me` | signed in |
| GET | `/api/employees?q=&designation=&role=&includeInactive=` | signed in |
| GET | `/api/employees/:id` | signed in |
| POST | `/api/employees` | admin |
| PUT | `/api/employees/:id` | admin |
| DELETE | `/api/employees/:id` | admin (soft delete, sets inactive) |
| GET | `/api/roster?month=YYYY-MM` | signed in |
| PUT | `/api/roster/assignments` | admin, consultant, manager: `{ dates, shifts, location, employeeIds, mode: 'replace' \| 'add' }` |

Send `Authorization: Bearer <token>`.

## Scripts

| Command | |
|---|---|
| `npm run dev` | API + client with reload |
| `npm test` | server/domain unit tests (`node:test`) |
| `npm run build` | production build of client into `client/dist` |
| `npm run db:migrate` / `npm run db:seed` | apply new migrations / create initial admin |

To change the schema, add the next numbered file to `server/db/migrations/` (e.g. `003_tasks.sql`) and run `npm run db:migrate`.
