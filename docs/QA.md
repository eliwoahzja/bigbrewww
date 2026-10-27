# Verification report

Run date: 2026-10-27. Environment: Linux container, Node 24, Chromium 1248 (Playwright 1.49 headless shell), local HTTP server on `127.0.0.1`.

> **Current state:** the tables below describe the refinement pass, which ran 27/27 browser checks in this repository. Two later passes — the live database layer and the AJONAI anti-slop pass — added 10 API tests and reworked parts of the stylesheet. Their results, and a Chromium fault in this VM that now blocks the browser suite, are recorded in the **Addendum** at the end of this file. Where the two disagree, the addendum is the later record.

Every result below comes from a command in this repository. Nothing is inferred from reading code.

## Commands and results

| # | Command | Result |
| --- | --- | --- |
| 1 | `npm run build` | **PASS** — `tsc` strict compile, 6 modules emitted, `public/` regenerated, source hash recorded |
| 2 | `npm test` | **PASS** — 14/14 domain tests |
| 3 | `node scripts/ui-qa.mjs` | **PASS** — 27/27 browser checks |
| 4 | Clean copy: `npm ci && npm run build && npm test` | **PASS** — 6 packages installed, build and 14 tests pass |
| 5 | ZIP-style copy without `node_modules`, `npm start` | **PASS** — `/` and `/dist/main.js` return 200 |
| 6 | `public/` served as static files, loaded in Chromium | **PASS** — title, diagnostics, navigation and dialog work; no console errors, no 4xx |

Asset and timing measurements from the same run (uncompressed, local):

| Measurement | Value |
| --- | --- |
| CSS transferred | 67 KB |
| JavaScript transferred | 110 KB across 6 modules |
| First contentful paint | 164 ms |
| Section switch (click → two frames painted) | 17–37 ms across six sections |

## Domain regression suite (`tests/domain.test.mjs`)

14 tests, all passing:

1. Sample versus empty workspace initialization and mode flags.
2. Receipts and waste update balances, write one audit record each, leave the original database untouched.
3. Physical counts record the signed variance; zero counts are allowed; consuming more than is on hand throws.
4. Verifier must differ from the preparer; verification is only legal while the order awaits a check.
5. A failed verification is recorded and feeds both the issue rate and the first-check rate.
6. Payback uses only saved scenario inputs and reports no payback at zero benefit.
7. Multi-item order creation keeps every line and moves into the check queue.
8. A failed check returns the order for correction, then a fresh check completes it while both checks remain.
9. Cancellation requires a reason, is refused after completion, and leaves the verified denominator.
10. Checklist lifecycle: unknown template rejected, partial runs cannot be signed off, signed runs are frozen.
11. Training assignment is unique per open module, completable once, and stamps a completion time.
12. Stock ledger keeps the previous balance, the actor, and the timestamp for each movement.
13. Storage round-trip: `blank()`, `sample()`, reload of stored schema, quarantine of unreadable payloads, schema rejection.
14. Number validation, CSV quote escaping, and spreadsheet-formula neutralisation.

## Browser suite (`scripts/ui-qa.mjs`)

The suite starts the real server, drives the served app in Chromium, and fails the process on any assertion.

| Check | Assertion |
| --- | --- |
| Shell | Title, heading, desktop rail visible, mobile dock/menu/drawer-close hidden at 1440 px |
| Sections | All six render their own `<h1>` with zero horizontal overflow |
| Screenshots | Six desktop section captures written to `artifacts/qa/` |
| Stock receipt | Balance increases by the entered amount, exactly one ledger record is written |
| Negative stock | Consuming 9 999 units is refused with an inline "Insufficient stock" message |
| Physical count | The counted quantity replaces the balance and the variance appears in the ledger |
| Low-stock filter | Filter narrows the table, then restores it |
| Multi-item order | Both lines stored, quantities preserved, order moves to the check queue |
| Self-check | No verify action is offered to the preparer; a "Change checker" affordance appears instead |
| Second-person check | Another employee completes it; checker differs from preparer; one pass recorded |
| Failed check | Empty issue is refused; a category and note return the order to correction with the reason on the card |
| Correction loop | Reprepare and re-verify completes the order while the earlier failure stays in history |
| Cancellation | Requires a reason, stores it, keeps the cancelled record |
| Filters and search | Open filter narrows the list, search does not widen it, clearing restores every order |
| Checklist | Sign-off disabled until every step is ticked, then enabled and listed as completed with a stored sign-off |
| Employee | Added, edited, and deactivated; the row reports Inactive |
| Training | Assignment stored, completed, completion date shown, action removed |
| Exports | JSON backup parses with schema version 1; stock CSV header and neutralised `=SUM(...)` note; orders CSV carries the cancellation reason |
| Payback | 1 500 upfront ÷ 700 monthly net = 2.14 months, and the value survives a reload |
| Persistence | Order, ingredient, and mode survive a reload through `bigbrew-branchwork-v1` |
| Viewports | 320, 360, 390, 430, 768, 1024, 1440, 1920 px × 6 sections: zero horizontal overflow, zero console errors |
| Mobile dock | Dock visible at 390 px, rail off-canvas, dock targets ≥ 44×44 px, body copy ≥ 15 px |
| Mobile dialog | Fits the viewport width and does not start above the top edge |
| Dialog focus | Escape closes and returns focus to the trigger; Tab stays inside the dialog for 24 presses |
| Drawer keyboard | Opens, traps focus, Escape closes |
| Reduced motion | With `prefers-reduced-motion: reduce`, no transition or animation exceeds 1 ms |
| axe-core | Six sections scanned with WCAG 2.0/2.1/2.2 A and AA rules: no violations reported |
| Console | No console error, page error, or HTTP ≥ 400 during the whole flow |

## Quality gates

| Gate | Status | Evidence |
| --- | --- | --- |
| 1. Requirements preserved | **PASSED** | Every workflow in the brief is exercised by suite checks or domain tests |
| 2. Architecture coherent | **PASSED** | Pure transitions in `domain.ts`, persistence in `store.ts`, rendering in `views.ts`, interaction in `main.ts`; no new runtime dependency |
| 3. Fresh build | **PASSED** | Clean copy: `npm ci` → `npm run build` → 6 modules, no errors |
| 4. Startup | **PASSED** | ZIP-style copy without `node_modules` starts and serves `/` and `/dist/main.js`; server refuses to start with a named missing file |
| 5. Core workflows | **PASSED** | 27 browser checks including order, stock, checklist, staff, training, export flows |
| 6. Data integrity | **PASSED** | Domain tests for validation, immutability, negative stock, storage quarantine; persistence checked after reload |
| 7. Responsiveness | **PASSED** | Eight widths × six sections with measured overflow; mobile dock and dialog geometry asserted |
| 8. Accessibility | **PASSED** | axe scan clean for the configured WCAG tags, keyboard and focus assertions, contrast token corrected (`--faint` now ≥ 5.1:1 on warm panels) |
| 9. Visual quality | **PASSED** | Design-system review with screenshots at 1440 and 390; see `REVIEW.md` |
| 10. Interaction feedback | **PASSED** | Toasts, inline errors, disabled sign-off, correction notice, checker-change affordance all asserted |
| 11. Performance | **PASSED** | 164 ms FCP, 17–37 ms section switch, 177 KB uncompressed assets locally |
| 12. Maintainability | **PASSED** | Single build path, dead exports removed, one stylesheet with token ownership, no manual copy step |
| 13. Deployment | **PASSED (local static output only)** | `public/` served by a plain static server and exercised in Chromium; no Vercel publication was performed |
| 14. Evidence | **PASSED** | This file reports only executed commands |

## Not tested / out of scope

- **Firefox and Safari.** All browser evidence is Chromium. `dialog`-free custom modals, `inert`, and `prefers-reduced-motion` are supported in current Firefox/Safari, but were not exercised here.
- **Real screen readers.** Semantics, names, and live regions were checked structurally and with axe; no NVDA/JAWS/VoiceOver session was run.
- **Vercel publication.** `vercel.json` and the static output were verified locally; no project was linked or deployed.
- **Lighthouse / Core Web Vitals.** Only the local measurements above exist. No score is claimed.
- **Print, offline service worker, import, and multi-device sync.** Not implemented, so not tested.
- **Multi-user concurrency.** The app is single-browser by design; the acting-employee selector is not authentication.

## Manual acceptance pass (recommended on your machine)

1. `npm start`, open the app, confirm the sample banner and that Shift desk names one next action.
2. Start empty, add an employee, receive and count stock, confirm the ledger entries and balances.
3. Create a two-line order, mark it prepared, confirm the verify button becomes **Change checker**, switch staff, verify, and complete it.
4. Fail a second order check, correct it, re-verify as the other employee, and confirm both checks remain in the order record.
5. Run the opening checklist to sign-off, assign and complete training, then reload and confirm everything persisted.
6. Enter payback assumptions, export all three files, and open the CSVs in a spreadsheet.
7. Repeat steps 2–4 at 390 px wide, including the drawer and dialogs.

---

# Addendum — live workspace and anti-slop pass (same date)

These two passes changed the storage layer and parts of the stylesheet. Results below are from
commands executed after those changes; the browser results from the refinement pass above are
not re-claimed for them.

## Commands and results after both passes

| # | Command | Result |
| --- | --- | --- |
| 1 | `npm run build` | **PASSED** — strict `tsc`, 6 modules, `public/` deleted and regenerated with `assets/` |
| 2 | `npm test` | **PASSED** — 24/24: 14 domain tests + 10 live-workspace API tests |
| 3 | `node "skills/Anti-Slop (AJONAI)/scripts/check.mjs" src/ index.html` | **PASSED** — 0 error, 0 warn, 0 advisory (was 0/2/10) |
| 4 | `npm run qa` | **BLOCKED** — Chromium in this VM crashes; reproduction below |
| 5 | `npm run qa:live` | **BLOCKED** — same browser dependency |
| 6 | Served-app HTTP smoke (`npm start`, then `curl`) | **PASSED** — `/`, `/dist/main.js`, `/src/styles.css`, `/assets/bigbrew-mark.png`, `/api/config` all return 200 with correct types |

## New tests added by the live-workspace pass

`tests/live-api.test.mjs` drives the real `/api/state` handler — routing, authentication,
validation, and concurrency — against an injected repository:

1. `GET /api/state` creates the workspace on first read and returns revision 1.
2. A `PUT` without the branch access key is refused with 401 and changes nothing.
3. A `PUT` with a malformed workspace payload is refused with 422 before storage.
4. A `PUT` missing a positive revision is refused with 400.
5. A write at the current revision is accepted and bumps the revision.
6. A stale write is refused with 409 and returns the current workspace instead of overwriting it.
7. Unsupported methods are reported (405) rather than silently ignored.
8. The file repository keeps the same revision contract as the database one.
9. `/api/config` advertises live storage only when both a store and an access key are present.
10. The workspace guard accepts the live mode and rejects schema drift.

## Anti-slop corrections verified by build, tests, and the checker

| Correction | Verified by |
| --- | --- |
| Checklist progress fill animates `transform: scaleX()` instead of `width` | Checker warnings gone; `aria-valuenow` / `aria-valuetext` unchanged; domain tests unaffected |
| Reduced motion is a 140 ms opacity/colour equivalent instead of a 0.01 ms kill switch | New browser assertion written (≤ 160 ms, no positional property transitioned) — **not executed here**, see blocker |
| Disabled controls use readable tokens instead of `opacity: 0.55` | New browser assertion written (opacity ≥ 0.9, `cursor: not-allowed`) — **not executed here** |
| `caret-color` and themed scrollbar added | New browser assertions written — **not executed here** |
| `:active` press receipt on nav, dock, icon, search-clear, remove-line and tick rows | New browser assertion written (pointer-down changes computed background) — **not executed here** |
| `text-wrap: balance` on headings | Source-verified only |
| Open Graph metadata added | Served and read back over HTTP |
| Six deliberate-ignore suppressions, each with its reason on the line | Checker output clean |

## Browser blocker in this VM

After a runner restart, Chromium began crashing with a `SIGTRAP` inside the renderer
(`dmesg`: `traps: ThreadPoolForeg… trap int3`), which Playwright reports as
`Target page, context or browser has been closed`.

Bisected to the insertion of the application markup: the page survives with `/dist/main.js`
blocked, each ES module imports on its own, busy JavaScript, fonts, `localStorage`, `fetch`,
`Intl` `en-PH` and a large `innerHTML` all survive — but `app.innerHTML = appView(…)` crashes it,
and so does the same page served with the previous pass's stylesheet. Both the Playwright headless
shell and a freshly downloaded full Chromium build (missing shared libraries restored into
`/tmp/chromium-libs`) crash identically. That points at a VM renderer fault, not at this
repository. `docs/ANTI-SLOP.md` §7 records the full bisect table.

**Consequence:** every browser claim in this file except the addendum belongs to the refinement
pass, which ran before the restart. The anti-slop pass is verified by build, 24 node tests, the
static checker and an HTTP smoke test; its visual and interactive assertions are written into
`scripts/ui-qa.mjs` and remain **unexecuted** until they run on a healthy machine with
`npm run qa`.
