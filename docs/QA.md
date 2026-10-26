# Verification report

## PASSED

- TypeScript compilation with `tsc -p tsconfig.json`.
- Node domain suite: 7/7 passing, using `node --test`.
- Example mode versus empty local mode.
- Stock receive/waste changes, ledger snapshots, immutability.
- Physical-count variances, zero counts and negative-stock rejection.
- Two-person order verification and legal state transitions.
- Failed-order error indicators with real denominators.
- Cost scenario payback and zero-benefit handling.
- Number validation and CSV quote/formula escaping.
- Local Node HTTP server responds with HTTP 200 for the app entry point.

## BLOCKED

- Full browser navigation and automated screenshot-based review: the environment refused the browser's HTTP and file navigations with `ERR_BLOCKED_BY_ADMINISTRATOR`.
- As a result, UI-level smoke tests for form completion, mobile overflow, keyboard focus, and screen-reader interaction were not independently verified in a running browser.

## UNVERIFIED

- Cross-device/browser visual parity and deployment to a hosting service.
- True multi-user concurrency and identity verification. These are **not provided** by this local-only prototype.

## Manual acceptance checklist for your machine

1. Start the app, reload, and confirm sample mode is still clearly labeled.
2. Create one order, mark prepared as one employee, switch acting employee, verify all four checks, and complete the order.
3. Fail a second order check with a note, correct and reprepare it, then verify with a different employee.
4. Receive, waste, and physically count an ingredient; verify each ledger record and updated balance.
5. Complete the opening checklist and verify a sign-off record appears.
6. Assign and complete training, refresh the browser, and confirm state persists.
7. Enter cost assumptions, confirm updated output, and export JSON/CSV records.
8. On a roughly 390px mobile viewport, check the side drawer, form layout, responsive cards and horizontally scrollable tables.

## Product design refinement — 2026-10-27

- Replaced promotional hero and four equal KPI cards with a shift brief, a state-derived next action, an order handoff queue, a per-ingredient replenishment view, a routine shortcut, and small secondary indicators. This is presentation-only: values remain derived from `getStats`, orders, checklists, inventory and movement records.
- Added a five-item mobile quick-navigation dock (Overview, Orders, Stock, Checklists, More) with a full drawer for Training and Insights, and labelled mobile record views for Inventory and Training; desktop sidebar remains.
- CSS keeps Com warm snow/coffee/blue direction. The reference Gilroy font files and usage license were not supplied; the existing safe fallback stack remains in use.
- **PASSED locally:** `npm run check` (TypeScript + 7 existing domain tests); 57 Chromium UI assertions at 390×844 and 1440×900 including navigation, modals, extra order items, page structure, touch-target geometry, and horizontal overflow across all six pages. Chromium screenshots were captured before and after.
- **ENVIRONMENT LIMITATION:** Chromium rejected actual `http://127.0.0.1` navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. UI assertions and screenshots instead used real headless Chromium with the compiled application bundled into an in-document preview via `page.set_content`. This verifies DOM interactions and responsive rendering, but is **not** a full deployed-site navigation or real browser-storage persistence test.
- Not modified: domain logic, sample data, data version, browser storage keys, forms and core workflows.
