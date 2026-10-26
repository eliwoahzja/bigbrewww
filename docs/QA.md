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
