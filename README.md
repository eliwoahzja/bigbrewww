# Branchwork: BigBrew operational-management capstone prototype

Independent educational prototype. Not created for, endorsed by, or connected to BigBrew. No official or live store data is included.

This project turns the uploaded *Feasibility Study on Operational Management Improvement for BigBrew* into a working shift operations workspace, using the uploaded Com `DESIGN.md` as its visual design reference. It runs offline in a single browser, and — when a branch database is configured — as one shared workspace that every device in the branch reads and writes.

## Start the app

**Requirements:** Node.js 18 or newer. No framework installation is required to run the included build.

1. Extract the entire project ZIP.
2. Open a terminal in the project folder.
3. Run `npm start` (or `node server.mjs`).
4. Open **http://localhost:4173**.

`dist/` ships with the project, so the first run needs no install and no network. The server refuses to start with a readable message if a required file is missing, and warns when `dist/` no longer matches the sources.

With no database configured, the app opens in the clearly labelled **offline workspace** and keeps records in that browser's `localStorage` under `bigbrew-branchwork-v1`. The first offline visit loads example records; choose **Start with empty data** to begin with your own. Add an employee first, then select the acting operator in the top bar.

### Live branch workspace (Postgres)

Set two environment variables — in `.env` for local use, or in Vercel → Settings → Environment Variables for a deployment:

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string (pooled). Queried over HTTP, so no connection pool is exhausted by serverless invocations. |
| `BRANCHWORK_ACCESS_KEY` | Long passphrase shared with the branch. Every API request must carry it; the browser only ever receives it from staff typing it into the unlock screen. |
| `BRANCHWORK_WORKSPACE_ID` | Optional. One database can hold more than one branch row; defaults to `main`. |

Then create the table once:

```bash
npm run db:migrate        # applies db/schema.sql through DATABASE_URL
```

With both variables set, the app reports **Live branch workspace**, asks for the access key before showing any record, and saves every change to one `branchwork_workspace` row. Writes are optimistic: the client sends the revision it read, the update applies only if that revision is still current, and a conflict makes the browser adopt the newer server copy instead of overwriting another device. Losing the database drops the app back into the labelled offline workspace rather than failing.

`.env.example` lists every variable. Never commit `.env`.

## Commands

| Command | What it does |
| --- | --- |
| `npm start` | Serves the app at `http://localhost:4173` (set `PORT` to change it) |
| `npm run build` | Compiles TypeScript into `dist/` **and** regenerates the `public/` deployment output |
| `npm test` | Builds, then runs 24 tests: 14 domain rules and 10 live-workspace API tests |
| `npm run qa` | Drives the served app in Chromium and reports every end-to-end check |
| `npm run qa:live` | Same, against a live workspace (file-backed test store or a real database) |
| `npm run db:migrate` | Applies `db/schema.sql` using `DATABASE_URL` |
| `npm run check` | `npm test`, then `npm run qa`, then `npm run qa:live` |
| `node "skills/Anti-Slop (AJONAI)/scripts/check.mjs" src/ index.html` | Static anti-slop audit of the front-end source |

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

**Exports:** stock-ledger CSV, orders CSV, and a JSON snapshot, generated in the browser. CSV cells that begin with `= + - @` are prefixed with an apostrophe so spreadsheets treat them as text. There is no JSON import.

## Architecture

```text
.
├── index.html               # Entry point; loads /dist/main.js as a module
├── server.mjs               # Static server with MIME types, CSP, path containment,
│                            #   and the /api routes for live storage
├── server/workspace.mjs     # Live backend: auth, validation, optimistic revisions,
│                            #   Neon (HTTP) and file repositories
├── api/config.js            # Vercel function: is live storage configured?
├── api/state.js             # Vercel function: GET/PUT the branch workspace
├── db/schema.sql            # One-row-per-branch Postgres table
├── assets/
│   ├── bigbrew-mark.png     # Brand emblem used in the shell and unlock screen
│   └── favicon.png          # Real emblem, transparent, no frame
├── vercel.json              # Builds on deploy and publishes only public/
├── tsconfig.json
├── scripts/
│   ├── build.mjs            # Single build: validates output, regenerates public/
│   ├── source-hash.mjs      # Hash of sources, used to detect stale compiled files
│   ├── migrate.mjs          # Applies db/schema.sql through DATABASE_URL
│   ├── ui-qa.mjs            # Real-browser regression suite (starts its own server)
│   └── live-qa.mjs          # Same suite against a live workspace
├── src/
│   ├── domain.ts            # Types, validation, and every state transition (pure)
│   ├── seed.ts              # Identified sample data and the empty workspace
│   ├── store.ts             # Storage layer: live workspace, offline fallback, sync status
│   ├── format.ts            # Escaping and Philippine-localized formatting
│   ├── views.ts             # Semantic templates per page plus shared controls
│   ├── main.ts              # UI state, delegated events, focus management, rendering
│   └── styles.css           # Tokens, components, responsive ownership, motion
├── dist/                    # Compiled ES modules (generated; committed for instant start)
├── public/                  # Deployment output (generated; ignored by git)
├── skills/
│   └── Anti-Slop (AJONAI)/  # Third-party design audit skill, vendored for reproducibility
├── tests/
│   ├── domain.test.mjs      # Pure business-rule regression tests
│   └── live-api.test.mjs    # Live workspace API, auth, and concurrency tests
└── docs/
    ├── SOURCE_MAP.md        # Capstone-to-feature mapping
    ├── QA.md                # Verification report, gates, and limitations
    ├── ANTI-SLOP.md         # Design decision sheet and anti-slop audit
    └── REVIEW.md            # Engineering, product, and design critique
```

`dist/` and `public/` are produced only by `npm run build`; nothing is copied by hand. `public/` is deleted and rebuilt on every build, so stale modules cannot survive. `dist/build-info.json` records a hash of the sources and `server.mjs` warns when the compiled files no longer match.

The interface is dependency-free TypeScript compiled to ES modules — no React, no bundler, no runtime package on the client. The only runtime dependency is `@neondatabase/serverless`, used server-side for live storage.

## Data and integrity limitations

- Sample records are illustrative. Staff names, stock levels, orders, and prices in the seed data are not BigBrew measurements.
- The employee selector records **who is acting**. It is not authentication, authorization, or an electronic signature, and it must not be used as a secure audit system. In live mode the branch access key protects the workspace as a whole, not individual people.
- Live mode shares one workspace; it is not a permissioned multi-user system. There is no supplier API, payment gateway, POS integration, sales ingestion, or recipe-based deduction. Stock use is entered explicitly.
- “Best before” dates are informational; lots are not tracked and no FIFO/FEFO allocation happens.
- Order issue rate = orders with at least one failed check ÷ orders with at least one check, excluding cancelled orders. First-check pass rate uses the first recorded check only.
- Count discrepancy rate = physical counts with a nonzero adjustment ÷ all physical counts. Mixed units are never summed.
- The feasibility study proposes surveys, interviews, pilots, and cost-benefit assessment. This prototype does **not** claim those activities were conducted.

## Design and anti-slop review

The interface follows the supplied Com design system: warm paper ground `#FAF6F0`, coffee ink `#251508`, supporting text `#61554A`, interactive blue `#0D6EFD`, mostly 8–16 px radii, restrained shadows. Gilroy is named by that system but no licence or font files were supplied, so the type stack falls back to system faces and no Gilroy claim is made.

The [AJONAI Anti-Slop skill](https://github.com/ItsRealAJ/Anti-Slop-Frontend-Skill) is vendored in `skills/` and was used to audit the front end. `docs/ANTI-SLOP.md` records the decision sheet it forced into writing, every finding with its file and line, the corrections made, and what was deliberately left alone.

## Deploy on Vercel from GitHub

`vercel.json` runs `npm run build` and publishes only `public/`; `src/`, `dist/`, `tests/`, and `docs/` stay in the repository. No runtime dependency is required for the offline workspace.

To publish the shared branch workspace, add `DATABASE_URL` and `BRANCHWORK_ACCESS_KEY` in Vercel → Settings → Environment Variables, run `npm run db:migrate` once against that database, and redeploy. Without them the deployment still works and reports the labelled offline workspace.

After editing TypeScript or CSS, run `npm run build` once — it regenerates `public/` from `index.html`, `src/styles.css`, `assets/`, and the compiled modules, and fails if any referenced asset is missing. Do not copy files into `public/` manually.

## Supabase deployment (BigBrew)

The BigBrew live workspace uses the isolated RLS-protected `public.bigbrew_workspace` table and a private access-key digest in `bigbrew_private.access_config`. It does not touch unrelated tables. `db/supabase.sql` contains the database setup; the shared key and its hash must never be committed.

Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `BRANCHWORK_ACCESS_KEY` on the Vercel server, optionally `BRANCHWORK_WORKSPACE_ID` (default `main`). The backend calls Supabase PostgREST with the publishable key and the shared key header, and PostgreSQL RLS checks the shared key against its privately stored digest. The browser only calls the application's `/api/state` endpoint. Supabase's service-role or secret key is not required.

The original Neon backend is retained for existing local deployments where Supabase is not configured. The legacy `npm run db:migrate` uses a Neon-specific HTTP driver; for Supabase apply `db/supabase.sql` using the Supabase migration workflow instead.
