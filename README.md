# Branchwork: BigBrew operational-management capstone prototype

Independent educational prototype. Not created for, endorsed by, or connected to BigBrew. No official or live store data is included.

This project turns the uploaded *Feasibility Study on Operational Management Improvement for BigBrew* into a working offline operations workspace, using the uploaded Com `DESIGN.md` as its visual design reference.

## Start the app

**Requirements:** Node.js 18 or newer. No web accounts, API keys, external service, or framework installation is required to run the included build.

1. Extract the entire project ZIP.
2. Open a terminal in the project folder.
3. Run `npm start` (or `node server.mjs`).
4. Open **http://localhost:4173**.

`dist/` ships with the project, so the first run needs no install and no network. The server refuses to start with a readable message if a required file is missing, and warns when `dist/` no longer matches the sources.

The first visit loads **clearly identified example records**. Select **Start with empty data** to begin with your own records. Add an employee first, then choose the acting operator in the top bar.

Data persists in that browser's `localStorage` under `bigbrew-branchwork-v1`. Clearing site data, using another browser, or replacing a sample workspace discards local records. Export a JSON backup before doing any of those.

## Commands

| Command | What it does |
| --- | --- |
| `npm start` | Serves the app at `http://localhost:4173` (set `PORT` to change it) |
| `npm run build` | Compiles TypeScript into `dist/` **and** regenerates the `public/` deployment output |
| `npm test` | Builds, then runs the domain regression suite (14 tests, Node's built-in runner) |
| `npm run qa` | Builds nothing; drives the served app in Chromium and reports 27 end-to-end checks |
| `npm run check` | `npm test` followed by `npm run qa` |

`npm run qa` needs a Chromium build for Playwright: run `npx playwright install chromium` once, and install the shared libraries (`npx playwright install-deps chromium`, or the equivalent for your distribution). On minimal containers, a missing fontconfig or NSS library makes Chromium abort before any page loads; the suite reports that as a bootstrap failure rather than a product failure.

## Implemented sections

| Page | Working functionality |
| --- | --- |
| Overview (Shift desk) | Derived shift brief, one recommended next action, order handoff queue, replenishment watch, open routines, activity ledger, small record strip |
| Inventory | Add/edit/archive ingredients, search and below-threshold filter, receive/consume/waste, physical counts, per-item movement history |
| Orders | Multi-line orders, channel, preparation, two-person verification, recorded issues, correction and re-verification, cancellation with a reason |
| Checklists | Opening, closing, stock-count, and order-quality templates with per-step progress and named sign-off |
| People & training | Add/edit staff, activate/deactivate, assign modules, record completion |
| Insights | Order issue rate, first-check pass rate, count discrepancy rate, waste cost, issue categories, discrepancy register, payback scenario, CSV/JSON exports |

**Stock ledger:** every movement keeps the before/after balance, delta, reference note, acting employee, timestamp, and the unit cost in force at that moment. A physical count sets the observed balance instead of applying a delta. Negative balances are refused.

**Verification:** the checker must be a different active employee from the preparer. When the acting employee is the preparer, the interface replaces the verify action with **Change checker** instead of letting a self-check start. A pass requires all four quality checks; a failure requires an issue category and a note, and returns the order for correction with both checks kept on the record.

**Payback:** Payback = (setup + training) / (waste savings + refund savings + added margin − monthly tool cost). Results are scenarios derived from your own inputs, not measured outcomes.

**Exports:** stock-ledger CSV, orders CSV, and a JSON snapshot, generated in the browser. CSV cells that begin with `= + - @` are prefixed with an apostrophe so spreadsheets treat them as text. There is no cloud backup and no JSON import.

## Architecture

```text
.
├── index.html               # Entry point; loads /dist/main.js as a module
├── server.mjs               # Static server with MIME types, CSP, path containment
├── package.json
├── tsconfig.json
├── scripts/
│   ├── build.mjs            # Single build: validates output, regenerates public/
│   ├── source-hash.mjs      # Hash of sources, used to detect stale compiled files
│   └── ui-qa.mjs            # Real-browser regression suite (starts its own server)
├── src/
│   ├── domain.ts            # Types, validation, and every state transition (pure)
│   ├── seed.ts              # Identified sample data and the empty workspace
│   ├── store.ts             # Versioned localStorage persistence, backup of unreadable data
│   ├── format.ts            # Escaping and Philippine-localized formatting
│   ├── views.ts             # Semantic templates per page plus shared controls
│   ├── main.ts              # UI state, delegated events, focus management, rendering
│   └── styles.css           # Tokens, components, responsive ownership, motion
├── dist/                    # Compiled ES modules (generated; committed for instant start)
├── public/                  # Deployment output (generated; ignored by git)
├── tests/domain.test.mjs    # Pure business-rule regression tests
└── docs/
    ├── SOURCE_MAP.md        # Capstone-to-feature mapping
    ├── QA.md                # Verification report, gates, and limitations
    └── REVIEW.md            # Engineering, product, and anti-slop critique
```

`dist/` and `public/` are produced only by `npm run build`; nothing is copied by hand. `public/` is deleted and rebuilt on every build, so stale modules cannot survive. `dist/build-info.json` records a hash of the sources and `server.mjs` warns when the compiled files no longer match.

The prototype intentionally uses **no React/Vite runtime** and no backend. The choice differs from the fallback stack in the brief but preserves its requirements for modularity, accessible HTML, responsive design, and no hidden services.

## Data and integrity limitations

- One locally managed branch. Staff names, stock levels, orders, and prices in the sample are illustrative.
- The employee selector records **who is acting locally**. It is not authentication, authorization, or an electronic signature, and it must not be used as a secure audit system.
- There is no synchronized multi-user database, supplier API, payment gateway, POS integration, sales ingestion, or recipe-based deduction. Stock use is entered explicitly.
- “Best before” dates are informational; lots are not tracked and no FIFO/FEFO allocation happens.
- Order issue rate = orders with at least one failed check ÷ orders with at least one check, excluding cancelled orders. First-check pass rate uses the first recorded check only.
- Count discrepancy rate = physical counts with a nonzero adjustment ÷ all physical counts. Mixed units are never summed.
- The feasibility study proposes surveys, interviews, pilots, and cost-benefit assessment. This prototype does **not** claim those activities were conducted.

## Deploy on Vercel from GitHub

`vercel.json` runs `npm run build` and publishes only `public/`; `src/`, `dist/`, `tests/`, and `docs/` stay in the repository. No runtime dependency or secret is required.

After editing TypeScript or CSS, run `npm run build` once — it regenerates `public/` from `index.html`, `src/styles.css`, and the compiled modules, and fails if any referenced asset is missing. Do not copy files into `public/` manually.
