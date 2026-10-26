# Branchwork: BigBrew operational-management capstone prototype

Independent educational prototype. Not created for, endorsed by, or connected to BigBrew. No official or live store data is included.

This project turns the uploaded *Feasibility Study on Operational Management Improvement for BigBrew* into a working offline operations workspace using the uploaded Com `DESIGN.md` as its visual design reference.

## Start the app

**Requirements:** Node.js 18 or newer. No web accounts, API keys, external service, or framework installation is required to run the included build.

1. Extract the entire project ZIP.
2. Open a terminal in the `bigbrew-operations` folder.
3. Run `npm start` or `node server.mjs`.
4. Open **http://localhost:4173** in a browser.

The first visit loads **clearly identified example records**. Select **Start with empty data** to begin using the app with your own local records. Add an employee first, then choose the acting operator in the top bar.

Data persists in that browser's `localStorage`. Clearing browser site data, using a different browser/device, or replacing a sample workspace discards the local records. Export records before doing this.

### Edit the TypeScript source

The app is built with strongly typed TypeScript and native browser ES modules. The `dist/` folder is precompiled and included, so no installation is required for the first run.

To edit and rebuild from the sources:

```bash
npm install
npm run build
npm test
npm start
```

The prototype intentionally uses **no React/Vite runtime**. A native TypeScript module structure allows this prebuilt capstone to run without downloading framework dependencies or configuring a backend. The choice differs from the fallback stack suggested in the brief, but preserves its requirements for modularity, accessible HTML, responsive design, and no hidden services.

## Implemented sections

| Page | Working functionality |
| --- | --- |
| Overview | Calculated operational snapshot, replenishment list, open orders, recent activity |
| Inventory | Add/edit/archive ingredients, search/filter, thresholds, receive/consume/waste, physical counts, per-item history |
| Orders | Multi-line drink orders, channel, preparation status, two-person verification, recorded issues, correction/reverification, cancellations |
| Checklists | Standard opening, closing, stock-count, and order-quality templates; progress and sign-off logs |
| People & training | Add/edit employee profiles, activate/deactivate, assign foundational/operations/quality modules, record completion |
| Insights | Record-driven order issue rate, first-check pass rate, count discrepancy rate, waste cost, category breakdown, what-if payback scenario, CSV/JSON exports |

**Stock ledger:** A movement records the before/after stock, quantity difference, reference note, acting employee, timestamp, and then-current unit cost. Physical counts set the *actual balance* rather than applying a delta.

**Verification:** The acting verifier must be different from the employee who prepared the order. Successful verification requires confirmation of drink items, modifiers, seal, and labels. Failures require an issue category and description; the order returns for correction.

**Payback:** Enter one-time setup/training costs, monthly tool cost, and expected monthly improvements. Payback = (setup + training) / (estimated monthly waste reduction + refund savings + added margin - recurring tool cost). Results are scenarios, not demonstrated impact.

**Exports:** Download CSV stock movement history, CSV order records, or a JSON snapshot. CSV export sanitizes spreadsheet-formula prefixes in text values. There is no automatic cloud backup or JSON-import feature.

## Architecture

```text
bigbrew-operations/
├── index.html               # HTML entry point
├── server.mjs               # Self-contained static development server
├── package.json
├── tsconfig.json
├── src/
│   ├── domain.ts            # Typed entities, validation and pure business rules
│   ├── seed.ts              # Identified sample data and empty database
│   ├── store.ts             # Versioned localStorage persistence
│   ├── format.ts            # Safe escaping and Philippine-localized formatting
│   ├── views.ts             # Semantic view templates and reusable controls
│   ├── main.ts              # App state, event delegation and workflows
│   └── styles.css           # Com-inspired tokens, responsive layouts and motion
├── dist/                    # Precompiled ES modules, committed for instant startup
├── tests/
│   └── domain.test.mjs      # Node's built-in test runner, no test dependencies
└── docs/
    ├── SOURCE_MAP.md        # Capstone-to-feature mapping
    └── QA.md                # Test report and limitations
```

## Data and integrity limitations

- The demo is for **one locally managed branch**. Staff names, inventory levels, orders, and prices in sample records are illustrative.
- The employee selector identifies the person recording a local action, but **is not authentication, authorization, or a real electronic signature**. Do not use the demo as a secure audit system.
- There is **no synchronized multi-user database**, supplier API, payment gateway, POS integration, sales ingestion, or automated inventory deduction from recipes. Stock usage must be entered explicitly.
- Ingredient-level “best before” dates are informational; this prototype does not track separate lots or automate FIFO/FEFO allocation.
- Order error rates use verified orders with at least one failed check divided by all orders with a check, excluding cancelled orders. First-pass rate uses first passed verification divided by checked orders.
- Count discrepancy rate uses count events with a nonzero adjustment divided by all physical-count events; mixed units are not summed.
- The PDF proposes field surveys, interviews, pilots, and cost-benefit assessment. This prototype does **not** assert those activities were conducted.

## Validation

`npm run build` and `npm test` pass in the delivery environment (7 domain tests). See `docs/QA.md` for the exact test boundaries. Automated in-browser layout and end-to-end tests were **blocked by this environment's browser navigation policy**, so these items are not claimed as verified.

## Deploy on Vercel from GitHub

The repository includes `vercel.json` and a precompiled `public/` website.
Link the GitHub repository to a Vercel project named `bigbrewww` with the
project root at the repository root. Vercel will publish only the `public/`
directory; the `src/`, `tests/`, and `docs/` folders remain in the repository
for maintainability and auditability. Runtime dependencies and secrets are not
required. If `bigbrewww.vercel.app` is available, it can be the project's
production domain.

To refresh the published files after editing TypeScript, run `npm run build`,
then copy `dist/*.js` into `public/dist/`; to publish stylesheet changes,
copy `src/styles.css` to `public/src/styles.css`. Commit those generated files
alongside source changes.
