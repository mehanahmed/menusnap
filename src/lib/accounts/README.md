# Accounts Module — MenuSnap

> **Pro-only** financial management module: expenses, vendor payables, staff payroll, and overview reports.

---

## File Map

| File / Path | Purpose |
|---|---|
| `src/app/actions/accounts.ts` | **All server actions** (MySQL queries, Pro gating, data isolation) |
| `src/lib/accounts/helpers.ts` | Utility: `formatCurrency`, `formatAccountDate`, `getPagination`, `softDeleteFilter`, `tenantFilter` |
| `src/lib/accounts/migration.sql` | Full SQL DDL — run once to create all tables |
| `src/lib/accounts/README.md` | This file |
| `src/components/accounts/AccountsGate.tsx` | Wrapper: shows "Upgrade to Pro" for free users, renders children for Pro |
| `src/components/accounts/AccountsSubNav.tsx` | Sub-navigation bar: Overview → Expenses → Vendors → Staff → Reports |
| `src/app/(app)/accounts/page.tsx` | Root `/accounts` redirect → `/accounts/overview` |
| `src/app/(app)/accounts/overview/page.tsx` | **Step 5** — Charts, stat cards, date filter, recent txns, top vendors |
| `src/app/(app)/accounts/expenses/page.tsx` | **Step 2** — CRUD expenses, category manager, CSV export, receipt upload |
| `src/app/(app)/accounts/vendors/page.tsx` | **Step 3** — Vendor list, bills, payments, ledger dialog, overdue badges |
| `src/app/(app)/accounts/staff/page.tsx` | **Step 4** — Staff directory, daily attendance, salary generation & payment |
| `src/app/(app)/accounts/reports/page.tsx` | **Step 5** — 4-tab report tables: Expenses / Vendors / Staff / Payment Methods + CSV export |
| `src/context/PreferencesContext.tsx` | EN + BN translations for all Accounts module labels |

---

## Database Tables & Relationships

```
accounts_settings          expense_categories         payment_methods
─────────────────          ──────────────────         ───────────────
restaurant_id (PK tenant)  id (PK)                    id (PK)
currency                   restaurant_id              name  (Cash/bKash/Nagad/Bank/Card)
financial_year_start       name
                           type (income/expense)
                           is_default

expenses
────────
id ──────────────────────────────────────────────────────────────┐
restaurant_id (tenant)                                           │
date, amount                                                     │
category_id ──→ expense_categories.id                           │
payment_method_id ──→ payment_methods.id                        │
vendor_id (nullable) ──→ vendors.id                             │
staff_id  (nullable) ──→ staff.id                               │
description, attachment, created_by                             │
deleted_at (soft delete)                                        │

vendors                     vendor_bills                vendor_payments
───────                     ────────────                ───────────────
id ◄──┬─────────────────── vendor_id                   vendor_id ──→ vendors.id
restaurant_id               restaurant_id               restaurant_id
name, phone, address        bill_date, due_date          date, amount
category (Grocery/Meat/…)   bill_no, total_amount        payment_method_id
opening_balance             note, deleted_at             bill_id (nullable)
is_active, deleted_at                                    note, deleted_at
                                                         [auto-creates expense entry]

staff                       staff_attendance            staff_salary_records
─────                       ────────────────            ────────────────────
id ◄──┬──────────────────── staff_id                    staff_id ──→ staff.id
restaurant_id               date                        restaurant_id
name, phone, role           status (present/absent/…)   month (YYYY-MM)
joining_date                note                        base_salary, bonus, overtime
salary_type, base_salary                                deduction, advance_adjusted
is_active, deleted_at                                   net_payable, paid_amount
                                                        status (unpaid/partial/paid)
                            staff_advances              paid_date, payment_method_id
                            ──────────────              deleted_at
                            staff_id ──→ staff.id       [auto-creates expense entry on pay]
                            date, amount
                            adjusted_amount, note
                            deleted_at
```

### Key Auto-Sync Rules

| Trigger | Auto-creates Expense |
|---|---|
| `createVendorPaymentAction` | Expense with `vendor_id`, category "Procurement" |
| `paySalaryAction` | Expense with `staff_id`, category "Staff Salary" |
| `createStaffAdvanceAction` | Expense with `staff_id`, category "Staff Advance" |

---

## Pro Gating

All server actions call `verifyProUser(restaurantId)` before any DB query.  
`verifyProUser` checks `clients` table: `is_subscriber = 1` OR `subscriptionPackage` contains `pro | agency | enterprise | lifetime | premium`.  
Free users see `<AccountsGate>` → "Upgrade to Pro" message; no data is returned.

## Data Isolation (Multi-Tenant)

Every SQL query is scoped with `restaurant_id = ?` using the client's `id` or `businessName`.  
No cross-tenant data leakage is possible — each user only sees their own records.

## Step Summary

| Step | Feature | Status |
|---|---|---|
| 1 | Foundation: DB tables, Pro gate, helpers, SubNav | ✅ Done |
| 2 | Expenses: CRUD, filters, CSV export, receipt upload | ✅ Done |
| 3 | Vendors: bills, payments, ledger, overdue | ✅ Done |
| 4 | Staff: attendance, salary generation, advances | ✅ Done |
| 5 | Overview charts, Reports (4 types), CSV export | ✅ Done |
