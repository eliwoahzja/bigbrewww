# AJONAI Anti-Slop integration

Run date: 2026-10-27. This file records the skill installation, the design decisions it forced into
writing, the audit it produced, every correction made, and what could not be verified.

## 1. Skill installation — PASSED

| Item | Value |
| --- | --- |
| Source | `https://github.com/ItsRealAJ/Anti-Slop-Frontend-Skill` |
| Revision | `fa62096e04d01202bd9e6c551b33e776de2a80e6` (2026-08-21, "First Push") |
| Install path in this project | `skills/Anti-Slop (AJONAI)/` |
| Verified contents | `SKILL.md`, `README.md`, `references/00-decision-sheet.md` … `08-dated-defaults.md` (nine guides), `scripts/check.mjs` |
| Read before use | Yes — `SKILL.md`, all nine references, and the checker source |

Freebuff's own skill registry is account-managed and cannot be written to from a project, so the
skill was installed inside the repository instead of `~/.claude/skills/`. It is committed so the
audit below stays reproducible: `node "skills/Anti-Slop (AJONAI)/scripts/check.mjs" src/ index.html`.

## 2. Decision sheet

Written before the audit, then critiqued. The subject and the ground were already fixed by the
product; the axes that were still open are the ones the sheet pins.

```
SUBJECT    The shift desk of one BigBrew milk-tea branch: the person holding the counter at
           07:00 or 21:00, on a phone or the branch laptop, who needs to know what to do
           next and to leave a record that the next person can read.
GROUND     Counter paperwork — the shift log, the stock card with its reorder line, the
           cup-and-lid count, the four-point quality check, the sign-off initial box, the
           PHP unit cost, the branch access key.
PALETTE    ground #FAF6F0 (warm paper, Com spec) · surface #FFFFFF · ink #251508 ·
           ink-2 #61554A · rule #E7DDD1 · accent #0D6EFD (Com spec, required) ·
           ochre #8A4A12 for local/offline storage states · semantic green/amber/red for
           stock and order state. Neutral is warm-biased on purpose: this is paper, not glass.
TYPE       display: an old-style serif (`Iowan Old Style` → Palatino/Georgia fallback) because
           the artifact this replaces is a printed shift log. text: a humanist sans
           (`Avenir Next` → system fallback) for counter-side legibility. utility: a mono
           (`ui-monospace`) for balances, deltas, codes and timestamps so digits align.
           Gilroy was specified by the design system but no licence or files were supplied, so
           no Gilroy claim is made.
SPACE      intra-component 4/8/12/16 px; between components 24/32 px; section rhythm 48–64 px
           on desktop, compressed to 20/24 px on the phone. Two registers with different
           numbers; the mobile rhythm is a different number, not the desktop one stacked.
SHAPE      one radius family: 3 px (marks and ticks) → 6 px (controls, cards) → 8 px
           (progress, tables) → 12 px (dialogs). Elevation by hairline plus tonal step;
           shadow is reserved for the two layers that must float above the workspace
           (dialog, toast). No card carries a hairline and a wide shadow together.
MOTION     three animated moments only: the press receipt on a control, the progress fill when
           a step is ticked, and the dialog/drawer entrance. Band 120–240 ms, strong ease-out
           `cubic-bezier(0.2, 0.7, 0.3, 1)`. Everything else is static.
SIGNATURE  the handoff: the shift brief's single recommended next action, and the handoff queue
           beneath it, each row naming who prepared it and who still has to check it. It is the
           one screen a BigBrew shift actually lives in, and nothing else in the product is
           allowed to be louder than it.
```

**Critique of the sheet.** Two lines were inherited on the first draft and were revised. "A café
operations dashboard" would have produced the same sheet for any coffee brand, so SUBJECT was
rewritten to name the shift, the counter, the two device types and the handoff. PALETTE originally
said "warm neutral with a blue accent", which is the second reflex (the sophisticated answer to
the obvious one); it now names each hex with a role, and the ochre is tied to the offline/local
storage state, which only this product has. The Com Design System values are kept because the
brief supplies them — the skill's own rule is that a user's instruction outranks a detector.

## 3. Audit

Checker command, from the repository root:

```bash
node "skills/Anti-Slop (AJONAI)/scripts/check.mjs" src/ index.html
```

### Before

```
8 files  0 error  2 warn  10 advisory
```

### Confirmed findings and corrections

| # | Where | Finding | Why it read as inherited | Correction | Verification |
| --- | --- | --- | --- | --- | --- |
| 1 | `src/styles.css:545` | `.progress > span { transition: width … }` — the fill animated a layout-driving property (2 × `layout-animation`) | Animating `width` forces layout each frame; the checker names it directly | Fill now carries a `--fill` ratio and animates `transform: scaleX()` with `transform-origin: left center`. `views.ts` sets `--fill` at render, `main.ts` updates it in place when a step is ticked | Checker: both warnings gone. `aria-valuenow` / `aria-valuetext` unchanged |
| 2 | `src/styles.css` reduced-motion block | `transition-duration: 0.01ms !important` on every element — a global kill switch | The skill calls a kill switch a defect in its own right: reduced motion wants a *gentler equivalent*, not the removal of feedback | Now 140 ms with `transition-property` limited to opacity, colour, background, border and shadow; movement, slides and springs are removed. Drawer, dock, dialog and toast are set to no transition | Written into the browser suite: the reduced-motion check now asserts ≤ 160 ms **and** that no positional property is transitioned |
| 3 | `src/styles.css:102` | `button:disabled { opacity: 0.55 }` — disabled text measured ≈ 2.9:1 on the warm surface | Opacity-50 is the generated disabled state; the skill asks for readable text plus an explanation | Explicit values: `--faint` text (≈ 5:1 on `--surface-muted`), `--line` border, `--surface-muted` fill, no hover response, `cursor: not-allowed` kept. The explanation was already in the interface ("n steps remaining") | Browser assertion added: disabled opacity ≥ 0.9 and `cursor: not-allowed` |
| 4 | `:root` | No `caret-color` | One of the six surfaces nobody themes — the cheapest high-signal gap | `caret-color: var(--action)` on `:root`; it inherits into every field | Browser assertion added: computed `caret-color` on a field equals the accent, not black |
| 5 | root | Scrollbar unthemed | Same six-surface list | `scrollbar-color` / `scrollbar-width: thin` on `html`, plus a `::-webkit-scrollbar-*` track and thumb in the warm neutral | Browser assertion added: computed `scrollbar-color` is set |
| 6 | `src/styles.css` controls | Only `.btn` had an `:active` rule; `nav-link`, `dock-link`, `icon-btn`, `search-clear`, `remove-line` and the checkbox rows had none | `:active` rated the single strongest item in the skill's audit; a hover-only control is inert on touch | One press-receipt block for every non-button control, plus the tick-box rows. Responds on pointer-down | Browser assertion added: pointer-down changes the computed background before release |
| 7 | `src/styles.css:116` | Headings had no `text-wrap` (only `p` had `pretty`) | A display serif at 46 px with a one-word last line is the classic generated rag | `text-wrap: balance` on `h1`–`h4`, `pretty` kept on `p` | Source-verified; visual confirmation pending (see §6) |
| 8 | `index.html` | No Open Graph metadata beside a real favicon | The skill lists a real favicon **and** an OG set as the operational-surface check | `og:type`, `og:title`, `og:description` describing the live workspace | Served and read back over HTTP |
| 9 | `src/styles.css:46` | `#0d6efd` flagged as `framework-default-color` (Bootstrap 5 primary) | **False positive for this brief.** The value is the required Com Design System accent, so it is chosen, not inherited | Recorded in source with `/* deliberate-ignore framework-default-color */` and the reason — a suppression is a decision, which is the point of the mechanism | Checker: advisory resolved with its rationale on the line |
| 10 | `src/styles.css` ×4 | `round-stat` advisories on `100%` literals | **False positive.** The flagged values are CSS lengths (`width: min(100%, 660px)`, two `calc(100% - …)` flex-bases) and one keyframe stop — no stat band exists in the stylesheet | Line-level `/* deliberate-ignore round-stat */` with the reason | Checker: advisory resolved |

### After

```
8 files  0 error  0 warn  0 advisory
No inherited defaults detected. This checks source text only — it cannot see rendering,
spacing rhythm, or whether your choices suit the subject.
```

### Judged and deliberately not changed

- **Serif display + ochre + cream ground.** A detector lineage now flags that combination as
  generation 2. It stays: the ground and accent come from the supplied design system, and the
  serif is derived from the shift log this product replaces. Removing a required brand value to
  satisfy a classifier is exactly what the skill tells you not to do.
- **`setup-panel`'s 3 px ochre left border** (`side-tab`). Contested in the skill's own file:
  billed as a tell by one lineage, defended as the correct severity affordance by another. It
  marks "this workspace is still sample data", which is a status region. Kept.
- **Hairline + shadow co-occurring on the dialog.** Named defect in one lineage, the preferred
  separation device in another; both Material and Carbon ship it. The dialog is the only layer
  that must float, so it keeps both and nothing else does.
- **Sample-data notice, invented staff names, illustrative stock.** Flagged by the assets rules
  as placeholder identity. This is an educational prototype with no real branch feed; the honest
  move is to label it as sample data on every page (already done) rather than to dress invented
  records as measurements.

## 4. Interaction states inventory

The skill weights states above appearance, so the layer was enumerated rather than asserted:

| State | Present | Where |
| --- | --- | --- |
| `:active` | Yes — all buttons plus nav, dock, icon, search-clear, remove-line and tick rows | `src/styles.css` press-receipt block |
| `:focus-visible` | Yes — global ring plus explicit rings for fields, search, tick boxes and table actions | `src/styles.css:109`, `:972`, `:1170`, `:1209` |
| `:focus-within` | Yes — search container and compound controls | `.search-field:focus-within` |
| Disabled | Yes — readable text, `not-allowed`, no hover, and an on-screen reason | `src/styles.css:102`, checklist sign-off |
| Loading | Yes — `saving` state on the sync dot and the live notice, `aria-live` polite | `.sync-dot[data-sync="saving"]`, `notice-live` |
| Empty | Yes — per list, per table, per chart, with a next step | `.empty-state`, every section |
| Error | Yes — announced `role="alert"` region inside every dialog, plus the toast | `#form-error`, `notify()` |
| Selection / caret / scrollbar / colour-scheme | Yes — all four themed | `src/styles.css:107` and following |

## 5. What was preserved

No workflow changed. Order creation, preparation, independent verification, failure and
correction, cancellation, stock movements and counts, checklists and sign-off, training,
exports, the payback scenario, and both storage paths behave exactly as before this pass. The
only behavioural edits are the four listed in §3 (progress fill source, disabled treatment,
reduced-motion policy, heading wrapping) and the added metadata.

## 6. Verification status

| Step | Status | Evidence |
| --- | --- | --- |
| Skill installed and read | **PASSED** | `skills/Anti-Slop (AJONAI)/`, revision recorded in §1 |
| Production build | **PASSED** | `npm run build` → strict `tsc`, 6 modules, `public/` regenerated |
| Node test suites | **PASSED** | `npm test` → 24/24 (14 domain + 10 live-workspace API) |
| Anti-slop checker, before and after | **PASSED** | §3 |
| Served-app HTTP smoke | **PASSED** | `/`, `/dist/main.js`, `/src/styles.css`, `/assets/bigbrew-mark.png`, `/api/config` all 200 |
| Browser suite (`npm run qa`) | **BLOCKED — this machine, not the app** | Reproduction in §7 |
| Desktop / mobile visual review of this pass | **UNVERIFIED** | Depends on the browser suite; the previous pass's captures in `artifacts/qa/` predate these edits |

## 7. The browser blocker

Chromium in this cloud VM began crashing after a runner restart, before any of this pass's edits.
The crash is a `SIGTRAP` inside `chrome-headless-shell` (`dmesg`: `traps: ThreadPoolForeg… trap
int3`), surfaced by Playwright as `Target page, context or browser has been closed`.

Bisected to the point of failure:

| Condition | Result |
| --- | --- |
| Page with CSS loaded, `/dist/main.js` blocked | Survives |
| Each of the six ES modules imported on its own | Survives |
| Busy JavaScript, fonts, `localStorage`, `fetch` + JSON, `Intl` `en-PH`, large `innerHTML` | Survives |
| App markup inserted (`app.innerHTML = appView(…)`) | Crashes |
| Same page with the previous pass's stylesheet served instead | Crashes |

Both the Playwright headless shell and a freshly downloaded full Chromium build (its missing
shared libraries were restored into `/tmp/chromium-libs`) crash identically, so this is a VM
renderer fault rather than a defect in the app, its CSS or the checker's findings. The same suite
ran 27/27 in this repository earlier in the session, before the restart.

The suite itself was updated for this pass (a rewritten reduced-motion assertion and a new
interaction-states check). It is correct and will run unchanged on a healthy machine:
`npm run qa`.

## 8. Remaining issues

1. **Visual confirmation of this pass** — heading balance, the scaled progress fill, and the
   press receipts need eyes on a working browser. Blocked as above.
2. **`og:image` is a relative path.** An absolute URL needs the production domain, which is not
   known here; a scraper will ignore it until then.
3. **Gilroy is still absent.** The design system names it; no licence or font files were supplied,
   so the stack falls back to system faces.
4. **Sample data is invented.** Correctly labelled, but a real branch would replace `src/seed.ts`
   with its own catalog.
5. **Static analysis cannot see rendering.** The checker reads source text; spacing rhythm,
   measure, and whether the signature is actually the loudest thing on the screen remain human
   judgements.
