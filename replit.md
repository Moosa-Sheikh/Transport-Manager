# Overview

This project is a pnpm monorepo using TypeScript, designed for a Pakistan-based transport logistics business. The primary goal is to provide a Transport Management System (TMS) that is simple, practical, fast, and reliable for daily operations.

The system initially operates on a single local computer as a web application and is designed to scale to 2-3 users without significant rework. Future plans include migration to an online web-based application, requiring a flexible database and system structure.

Core operations include managing city-to-city trips, accommodating multiple loads per trip, flexible driver-to-truck assignments, and using 'Bilty numbers' for load referencing. Key functionalities include comprehensive expense tracking, trip profit calculation, and robust data filtering capabilities across various dimensions like truck, driver, date, customer, trip ID, and Bilty number.

The project encompasses a complete TMS with features spanning authentication, master data management (customers, drivers, trucks, cities, expense types), trip management, multi-load handling, expense tracking per trip, profit calculation, payments, cash book management, and a suite of financial reports (Trip, Driver, Truck, Cash Flow, Profit).

# User Preferences

I prefer iterative development.
I want to be asked before you make any major changes to the codebase.
I prefer to use simple language.
I prefer detailed explanations for complex logic.

# System Architecture

The project is structured as a pnpm workspace monorepo.

## Technology Stack

-   **Monorepo Tool**: pnpm workspaces
-   **Node.js**: 24
-   **Package Manager**: pnpm
-   **TypeScript**: 5.9
-   **API Framework**: Express 5
-   **Database**: PostgreSQL with Drizzle ORM
-   **Validation**: Zod (`zod/v4`), `drizzle-zod`
-   **API Codegen**: Orval (from OpenAPI spec)
-   **Build Tool**: esbuild (ESM bundle)
-   **Frontend**: React 19 + Vite + Tailwind CSS
-   **Authentication**: `express-session` + `connect-pg-simple` (PostgreSQL session store) + `bcrypt`

## Monorepo Structure

The monorepo is organized into `artifacts/` for deployable applications, `lib/` for shared libraries, and `scripts/` for utility scripts.

-   **`artifacts/api-server`**: Express API server.
-   **`artifacts/tms-web`**: React + Vite frontend.
-   **`lib/api-spec`**: OpenAPI specification and Orval codegen configuration.
-   **`lib/api-client-react`**: Generated React Query hooks for API interaction.
-   **`lib/api-zod`**: Generated Zod schemas for API validation.
-   **`lib/db`**: Drizzle ORM schema and database connection.
-   **`scripts/`**: Contains various utility scripts.

## TypeScript Configuration

All packages use `composite: true` and project references for efficient type checking and build management. `.d.ts` files are emitted only during type checking; actual JavaScript bundling is handled by esbuild/Vite.

## UI/UX Decisions

-   **Frontend Framework**: React 19 with Vite.
-   **Styling**: Tailwind CSS for utility-first styling.
-   **UI Primitives**: Custom minimal set including card, polished-button, polished-input, toast, toaster, tooltip.
-   **Routing**: `wouter` for client-side routing.
-   **Forms**: `react-hook-form` integrated with Zod for validation.
-   **Authentication**: Session-based authentication with a login page, protected dashboards, and PostgreSQL session storage.
-   **Layout**: Collapsible sidebar navigation for main modules (Dashboard, Masters, Trips, Finance, Due Amounts, Reports).
-   **Interactive Elements**: Delete confirmation dialogs, success messages, dynamic filtering interfaces.
-   **Reporting**: Dedicated reports hub, CSV export functionality, and print-specific CSS for clean printed outputs.
-   **Color Scheme**: Uses color-coded cards for financial summaries (e.g., green for profit, red for loss).

## Technical Implementations & Features

-   **Authentication**: Username/password login, session-based authentication stored in PostgreSQL, automatic admin user seeding.
-   **Master Data Management**: Full CRUD operations for Customers, Drivers, Trucks, Cities, and Expense Types, with server-side `ILIKE` search and unique constraint validation.
-   **Trip Management**: Creation, listing, and detail views for trips, with filtering by date range, truck, driver, and status. Includes functionality to "close" trips.
-   **Multi-Load Handling**: Association of multiple loads with a single trip, tracking `bilty_number`, customer, item details, freight, and charges. Calculates net load income and aggregated trip income.
-   **Expense Tracking**: Per-trip expense recording by type, amount, date, and notes.
-   **Driver Commission**: Per-trip commission for `customer_trip` and `customer_shifting` only (stored on trips table, not drivers), editable on open trips via inline edit in trip detail. **In-house shifting has no driver commission.**
-   **In-House Shifting (Simplified)**: A per-trip log with single `cityId`, customer (=Company), driver, truck, date, notes. Multiple `trip_round_entries` (item + rate-per-round + rounds + entry_date + notes) capture the day-by-day work, each computing `revenue = ratePerRound × rounds`. CRUD on `/trips/{id}/round-entries` is restricted to in-house trips and blocked when closed. No warehouses, items on the trip itself, or commission. Migration `inhouse_redesign_purge_v1` (one-shot, marker in `_meta_migrations`) deleted legacy in-house trips on rollout.
-   **Profit Calculation**: Backend calculation of profit (`Income - Expenses`) and actual profit (`Income - Expenses - Advances`).
-   **Payments**: Management of customer payments (partial/delayed), driver advances, and driver salaries. All payment transactions are recorded in a cash book.
-   **Cash Book**: A running balance ledger with filters for date range and entry type, showing opening balance.
-   **Due Amounts & Loans**: Four due/loan types — Customer Dues (auto-generated on trip close), Driver Loans, Other Loans, Owner Loans. Each supports CRUD + repayment with automatic Cash Book entries. Repayments create IN entries (customer/driver/other) or OUT entries (owner). Dashboard shows outstanding totals for all four types. Owner Loans have optional `sourceType` (Customer/Driver/Other) and `sourceId` fields for tracking the loan source. Each due/loan type has a detail page (`/dues/{type}/{id}`) showing a transaction timeline of the original record and all repayments.
-   **Financial Dashboard**: Summary views of total income, expenses, advances, salary paid, cash flow, current cash balance, plus outstanding dues/loans totals.
-   **Reporting System**: Six types of reports (Trip, Driver, Truck, Cash Flow, Profit, Customer) with extensive filtering, aggregation, and CSV export. Driver report includes loan data columns (totalLoans, totalLoanReturned, outstandingLoanBalance). Customer report shows trip count, freight, payments, and outstanding balance per customer.
-   **API Design**: Express.js routes organized by domain, using generated Zod schemas for request/response validation.
-   **Database Interactions**: Drizzle ORM for type-safe database access and migrations. `ON DELETE RESTRICT` and `ON DELETE CASCADE` are used for referential integrity.
-   **Performance**: Database indexes applied to frequently queried columns (e.g., `trip_date`, `entry_date`).

# External Dependencies

-   **PostgreSQL**: Primary database for application data and session storage.
-   **Orval**: Used for generating API client code and Zod schemas from an OpenAPI specification.
-   **React Query**: Frontend library for data fetching, caching, and state management.
-   **`express-session`**: Middleware for managing user sessions in Express.
-   **`connect-pg-simple`**: PostgreSQL store for `express-session`.
-   **`bcrypt`**: For hashing user passwords securely.
-   **`zod`**: Schema declaration and validation library.
-   **`drizzle-zod`**: Integration between Drizzle ORM and Zod for schema validation.
-   **`wouter`**: A minimalist React router for the frontend.
-   **`react-hook-form`**: Library for building forms with React.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **Vite**: Frontend build tool.
-   **esbuild**: Used for bundling server-side JavaScript.