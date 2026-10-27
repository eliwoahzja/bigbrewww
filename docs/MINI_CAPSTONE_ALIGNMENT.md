# BBOMS — Mini Capstone Requirements Alignment

> **Authoritative specification:** `Copy of MINI CAPSTONE (2).pdf`, 33 pages, particularly §§ 4.2, 4.5, 5.1–5.4 and Chapter 6.
>
> **Status:** Requirements audit and implementation plan only. This document does **not** assert that the current application meets BBOMS requirements. Existing production behavior has not been altered by this audit.

## Scope and identity

The specified system name is **BigBrew Operational Management System (BBOMS)**. It is a branch-level, mobile-first tool for staff and managers, **not** a POS, payment gateway, ERP, CRM, supplier procurement tool, or delivery-platform integration (§ 4.2.3). It should remain explicitly an independent educational capstone prototype, with no claims of official BigBrew endorsement, real financial performance, or fieldwork verification.

The **five required Phase 1 modules** (§ 4.2.2):
1. Authentication and User Management
2. Inventory Management
3. Shift Log
4. Sales Management
5. Dashboard and Reporting

The working code currently centers on Overview, Inventory, Orders, Checklists, People/Training, and Insights. Keep tested code where reusable, but align top-level navigation and user workflows with the five required modules. Treat advanced order verification and training as optional extension or Phase 2 features rather than substitutes for Shift Log or Sales.

## Compliance gap matrix

| Capstone requirement and reference | Current application evidence | Status / acceptance requirement |
| --- | --- | --- |
| Login with username, bcrypt-hashed password, session/logout; Manager vs Staff (§§ 4.2.2, 5.4.2) | `src/views.ts` renders one **branch access key** gate, and `src/domain.ts` has employee names/roles; acting-as selector is not verified identity. | **Missing**. Build actual user authentication and server-enforced authorization, not CSS-only role hiding. |
| Manager-only user management and inventory deletion; Staff inventory counts, shift entries, sales entries (§§ 4.2.1–4.2.2, 5.4.1) | Current actions rely on selected employee; role values are metadata. | **Missing**. Enforce permissions in API and persistent storage. |
| Inventory items with category, quantity, unit, par, unit cost; updates, low stock, counting (§§ 4.2.2, 5.2.2, 5.4.4) | `src/domain.ts`, `src/views.ts`, `src/main.ts` already implement most inventory and stock movement logic. | **Partly present**. Preserve and adapt; verify manager-only destructive actions. |
| Shift handover logs: date, Opening/Mid/Closing, 1–2000-char notes, submitting user, last 50 and filtering (§§ 4.2.2, 5.4.5) | No dedicated `shift_logs` entity or page. Checklists are not shift handover notes. | **Missing**. Add typed model, server persistence, mobile form, history/filter and tests. |
| Simple manual sales: date, positive amount, optional note up to 255 characters, user attribution, seven-day totals, last 50 (§§ 4.2.2, 5.4.6) | Order records exist; they are **not** sales transactions or sales-entry records. | **Missing**. Add sales ledger and derived summaries; no POS/payment processing. |
| Dashboard: today's sales, current month's sales, low-stock details, five recent shift logs (§§ 4.2.2, 5.4.3) | Shift desk prioritizes verification/replenishment/checklists, no actual recorded-sales aggregation or shift-log list. | **Missing core KPIs**. Recompose around source-defined information; only actual entered or clearly identified sample data. |
| Relational data model `users`, `inventory`, `shift_logs`, `sales`, foreign keys, 3NF (§§ 5.2.2–5.3.1) | Live storage uses one revisioned JSONB `bigbrew_workspace` row; no per-user relational identities. | **Architecture mismatch**. Requires schema migration; preserve existing records with an explicitly tested backfill path. |
| Mobile-first low-bandwidth screens, >=44 px controls, phone/tablet/desktop breakpoints (§§ 5.4.1, 5.4.7–5.4.8) | Existing responsive design targets mobile and desktop and was tested previously, but the five-module navigation differs. | **Partly present**. Retest at 390px and 1440px after functional changes; verify keyboard navigation, accessibility, and page weight. |
| PHP 8.x, MySQL 8.x, Apache shared hosting; vanilla HTML/CSS/JS (§§ 4.2.4, 5.1.3, Chapter 6) | Current production is TypeScript/Node Vercel serverless and Supabase PostgreSQL. | **Does not match stated stack**. If the submission must match it literally, a separately tested PHP/MySQL implementation and a compatible host are needed. Do not claim Supabase/Vercel compliance by renaming components. |

## Specification tension to resolve honestly

- § 3.4 proposes dual-signature order verification as an intervention; **§ 4.5.4 expressly says full dual-signature order verification is planned for Phase 2**, not a Phase 1 feature. Use the detailed Phase 1 system specification in §§ 4.2.2 and 5.4 as the acceptance baseline, not a speculative addition.
- The paper describes several BigBrew branches while the current live workspace is one branch row. Multi-branch support must be scoped and permission-isolated before claiming cluster-wide visibility.
- All sample numbers in screen mockups or research tables are **specification examples or reported study claims**, not actual measured results of this deployment. Never insert them as genuine sales or performance data.
- The PDF mandates PHP/MySQL; current user-selected infrastructure is Vercel/Supabase. These are mutually different implementations. **Record the stack deviation for the academic adviser or migrate deliberately**, but do not silently change the paper or claim exact conformance.

## Safe delivery sequence

1. **Baseline & backup**: snapshot current `main` and export any existing live data. Record tests and API contracts; never overwrite production workspace data implicitly.
2. **Auth & relational schema**: implement genuine user sessions, Manager/Staff roles, server-checked permissions, relational `users`, `inventory`, `shift_logs`, `sales`, migrations and rollback path. For Supabase, prefer Supabase Auth + secure RLS or server-side session API; do not trust the acting-as dropdown for authorization.
3. **Shift Log**: add opening/mid/closing entries with date validation (no future dates), 1–2000 chars, user attribution, and last-50 history with filtering.
4. **Sales**: add amount >0, date <= today, optional <=255-character notes, attributed transactions, seven-day totals, monthly figures and history.
5. **Dashboard & navigation**: primary nav Dashboard / Inventory / Shift Log / Sales plus account/logout; display sales and low stock and recent handovers based only on saved data; label any sample data. Keep optional Orders/Checklists/Training as separate extensions.
6. **Inventory & roles**: reuse ledger validation; restrict item deletion, user management and management reporting to Manager. Verify staff allowed workflows.
7. **QA & release**: run schema migration tests, role-access tests (including unauthorized API writes), date/amount validation, real shared-data read/write across devices, 390px/1440px browser checks, regression and deployment smoke tests. Only promote a validated release.

## Definition of done

- A Staff account cannot self-assign Manager privileges or delete inventory/users.
- A Manager can manage accounts and inventory; credentials are never stored in plaintext or in public source.
- Shift Log and Sales can be created and read across devices; records preserve user IDs, timestamps, and appropriate business rules.
- Today's/monthly totals are derived from dated sales entries and do not merge unrelated order amounts.
- Database constraints and foreign keys are actually implemented and tested.
- Dashboard displays low stock and recent shift logs even with zero sales; empty states are accurate.
- No functional regression in retained stock handling; demo data is never passed off as real branch activity.
- The documented implementation stack matches the delivered system **or** the architectural deviation is explicitly approved and written into the submitted capstone.

**This file is an alignment plan, not evidence of implementation, testing, security verification, or deployment.**
