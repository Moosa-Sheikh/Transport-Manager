# In-House Shifting — Full System Plan

**File location:** `docs/in-house-shifting-plan.md`

---

## What Is In-House Shifting?

In-house shifting is when one of your own trucks moves goods internally — not for a paying customer, but for yourself or your business. Examples:

- Moving stock from one godown to another
- Shifting goods from a factory to a showroom
- Transporting material between two of your own yards or branches

The truck, driver, route, and expenses are all the same as a normal trip — but there is **no customer, no freight income, and no billing**. You are only tracking the internal cost.

---

## What We Are Building

We are NOT building a separate module. In-house shifting lives inside the existing **Trips** section. Every trip — whether a customer trip or an internal shift — is stored in the same table, and the same workflow applies. The only difference is a **Trip Type** label that controls what you see.

---

## The Two Trip Types

| | Customer Trip | In-House Shifting |
|---|---|---|
| Truck | Yes | Yes |
| Driver | Yes | Yes |
| From City | Yes | Yes |
| To City | Yes | Yes |
| Driver Commission | Yes | Yes |
| Loads (Bilty / Freight) | Yes | **No** |
| Customer Payments | Yes | **No** |
| Customer Dues | Yes | **No** |
| Expenses | Yes | Yes |
| Driver Advances | Yes | Yes |
| Notes / Purpose | Optional | Required |
| Income | Freight income | Zero |
| Profit tracked | Yes | No — only Total Cost |

---

## Database Changes (Minimal)

Only **2 new columns** are added to the existing `trips` table. No new tables.

| Column | Type | Default | Purpose |
|---|---|---|---|
| `movement_type` | text | `customer_trip` | Identifies trip type |
| `notes` | text | NULL | Purpose / material description for internal shifts |

All existing data automatically becomes `customer_trip`. Nothing breaks.

---

## Changes Section by Section

### 1. Create Trip Page

**Before:** One form — date, truck, driver, from city, to city, commission.

**After:** Same form, but with a **Trip Type toggle at the top**:

```
[ Customer Trip ]  [ In-House Shifting ]
```

- When **Customer Trip** is selected: everything works exactly as before.
- When **In-House Shifting** is selected:
  - A **Notes** field appears (required) — to describe what is being moved and why.
  - The from city = to city restriction is **relaxed** — because you might shift goods within the same city.
  - Everything else stays the same.

---

### 2. Trip List Page

**Before:** Lists all trips with filters for status, truck, driver, city, customer, profit.

**After:** Adds a **Trip Type filter**:

```
[ All ]  [ Customer Trips ]  [ In-House ]
```

- In-house trips show an **orange badge** "In-House" in the list.
- Customer trips show no badge (they look exactly as before).
- The profit column for in-house trips shows **"Cost: PKR X"** instead of a profit figure, since there is no income.

---

### 3. Trip Detail Page

This is the biggest visible change. When you open an in-house shifting trip:

**Shown (same as before):**
- Trip info bar (truck, driver, from → to city, date, status)
- Orange "In-House Shifting" banner at the top
- Notes section (showing purpose)
- Expenses section (fuel, labour, tolls, etc.)
- Driver Advances section
- Driver Commission field
- Close Trip / Delete Trip buttons

**Hidden (not relevant for internal shifts):**
- Loads section (no bilty, no customer, no freight)
- Customer Payments section
- Customer Dues section
- Profit summary → replaced with **Total Cost summary** (expenses + commission)

When you open a customer trip, everything looks exactly as it always did — nothing changes.

---

### 4. Sidebar Navigation

Two additions:

**Under Trips:**
- In-House Shifts (quick link — opens the trip list pre-filtered to in-house trips)

**Under Reports:**
- Shifting Report (new report page)

---

### 5. New Report: In-House Shifting Report

A dedicated report page (purple colour theme) showing only in-house shifting trips.

**Each row shows:**
- Date
- Truck number
- Driver name
- From City → To City
- Total Expenses
- Driver Commission
- Total Cost (expenses + commission)
- Notes
- Status (Open / Closed)

**Filters:**
- Date range (default: current month)
- Truck
- Driver
- Status (All / Open / Closed)

**Summary row at the bottom:**
- Total shifts, Total cost, Total commission

---

### 6. Dashboard

The dashboard currently shows:
- Total Trips, Open Trips, Closed Trips
- Total Income (from freight)
- Total Expenses

**After this change:**
- Total income is **not affected** — in-house trips have no loads, so they contribute zero income automatically.
- The trip counts (open/closed/total) will include in-house trips since they are real movements of your trucks.
- No change needed to the dashboard.

---

### 7. Existing Reports — Impact

| Report | Impact |
|---|---|
| Trip Report | Adds a movement_type filter (All / Customer / In-House) |
| Driver Report | In-house trips count towards driver's trips and expenses — correct behaviour |
| Truck Report | In-house trips count towards truck usage and expenses — correct behaviour |
| Customer Report | Not affected — in-house trips have no customer |
| Cash Flow Report | Not affected |
| Profit Report | Not affected |

---

## What We Are NOT Building

- No separate locations/godowns master table (we use existing Cities)
- No departments master table (we use a Notes text field instead)
- No separate internal details table (existing expenses table handles all costs)
- No separate module or section in the app — everything stays inside Trips

---

## Summary of All Files Being Changed

**Database:**
- Migration: 2 new columns on `trips` table

**Backend (API Server):**
- `trips.ts` — updated create, list, and get trip endpoints
- `reports.ts` — new shifting report endpoint

**API Spec & Generated Client:**
- `openapi.yaml` — updated Trip schemas + new shifting report endpoint
- Regenerated TypeScript client after spec change

**Frontend:**
- `create-trip.tsx` — type toggle + notes field
- `trip-list.tsx` — movement type filter + in-house badge
- `trip-detail.tsx` — conditional sections based on trip type
- `shifting-report.tsx` — new report page (purple theme)
- `layout.tsx` — sidebar links added
- `App.tsx` — new route registered

---

## The Full User Flow

1. You go to **Trips → Create In-House Shift** (or click Create Trip and select the type)
2. Select: Truck, Driver, From City, To City, Date, write the purpose in Notes
3. Save → trip is created, opens the detail page
4. Add expenses as normal (fuel, labour, tolls, etc.)
5. Give driver advance if needed
6. When the shift is done, close the trip
7. See all internal shifts in **Trips → In-House Shifts** or the **Shifting Report**

---

*Built on top of the existing Transport Management System — same stack, same patterns, minimal new code.*
