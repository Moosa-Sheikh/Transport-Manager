# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Frontend**: React 19 + Vite + Tailwind CSS
- **Auth**: express-session + connect-pg-simple (PostgreSQL session store) + bcrypt

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── tms-web/            # TMS React + Vite frontend (served at /)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

---

## Business Context

**Pakistan-based transport logistics business** operating ~30 trucks.

### Deployment Context
- Initially runs on a **single local computer** (local web app in browser, hosted locally)
- Designed to support **2–3 users** in future without major rework
- May later be migrated to an **online web-based application** — database/structure must support easy migration

### Core Operations
- Trips are **city-to-city** (origin → destination)
- One trip can carry **multiple loads** (different customers on the same trip)
- Drivers may **change trucks** (driver is not permanently tied to one truck)
- **Bilty number** = a waybill/consignment note number, used as a key reference for loads

### Driver Payments
- Fixed salary
- Fixed per-trip commission
- Occasional advances

### Customer Payments
- Can be **delayed** or **monthly** (not always immediate)
- Can be **partial** payments
- Always linked to **specific trips**

### Key System Priorities (IMPORTANT)
1. **Expense tracking** — per trip, operational costs
2. **Trip profit calculation** — revenue minus expenses per trip
3. **Data filtering** — critical feature, must work on:
   - Truck
   - Driver
   - Date range
   - Customer
   - Trip ID
   - Bilty number

### Design Principles
- Keep it **simple and practical** — no unnecessary enterprise features
- Clean, fast, reliable for **daily operational use**
- Avoid over-engineering

---

## Application

### Transport Management System (TMS)

#### Phase 1 — Complete
- Login page at `/` with username/password form (default admin: admin / admin123)
- Protected dashboard at `/dashboard` with sidebar navigation
- Session-based authentication stored in PostgreSQL via `connect-pg-simple`
- Automatic admin seed: if no users exist, `admin/admin123` is created on startup

#### Phase 2 — Complete (Masters Module)
- **Sidebar layout**: Collapsible sidebar with Dashboard, Masters submenu (Customers, Drivers, Trucks, Cities, Expense Types), and logout
- **5 master tables** with full CRUD (Create, Read, Update, Delete):
  - `customers` — name, company_name, phone
  - `drivers` — name, phone, salary, trip_commission
  - `trucks` — truck_number (unique), owner_type (Owned/Rented), model
  - `cities` — name (unique)
  - `expense_types` — name (unique)
- **Search/filter**: Server-side ILIKE search on each master list
- **Validation**: Unique constraints enforced (trucks, cities, expense types), empty name prevention
- **UX**: Delete confirmation dialog, success messages after add/update/delete
- All routes protected by `requireAuth` middleware
- Frontend pages at `/masters/customers`, `/masters/drivers`, `/masters/trucks`, `/masters/cities`, `/masters/expense-types`
- API endpoints at `/api/masters/{entity}` (GET list, POST create), `/api/masters/{entity}/:id` (PUT update, DELETE)

#### Planned Tables (Future Phases — NOT YET BUILT)
- **trips** — origin city, destination city, date, truck_id, driver_id, status
- **loads** (trip lines) — trip_id, customer_id, bilty_number, weight/description, freight_rate, freight_amount
- **trip_expenses** — trip_id, category (fuel/toll/etc), amount, notes
- **customer_payments** — customer_id, trip_id (or load_id), amount, date, payment_type
- **driver_payments** — driver_id, trip_id (optional), type (salary/commission/advance), amount, date

---

## Packages

### `artifacts/tms-web` (`@workspace/tms-web`)

React + Vite TMS frontend served at `/`. Two pages: login and dashboard.

- Routing: wouter
- Forms: react-hook-form + zod
- API: `@workspace/api-client-react` generated hooks (React Query)
- Auth hook: `src/hooks/use-auth.ts`
- UI primitives: card, polished-button, polished-input, toast, toaster, tooltip (minimal set)

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, seeds DB, then starts Express
- App setup: `src/app.ts` — mounts CORS (localhost + REPLIT_DOMAINS), session middleware, JSON parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` and `src/routes/auth.ts`
- Auth routes: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Session: express-session + connect-pg-simple (PostgreSQL), 7-day cookie, httpOnly
- SESSION_SECRET: required in production (fail-fast); dev falls back to random with warning
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.mjs`)

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/users.ts` — `usersTable` (id, username, password, created_at)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec. Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec. The custom fetch in `src/custom-fetch.ts` sends `credentials: "include"` for session cookie support.

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
