# Design and engineering review

Three independent reviews of the delivered application, plus a critical anti-slop score. Scores are subjective judgements supported by the referenced evidence, not measurements.

## Review A — Senior engineer

**Architecture.** Business rules now live in `src/domain.ts` as pure functions returning a new database; the controller cannot mutate state directly, and every workflow goes through one of `stockChange`, `createOrder`, `prepareOrder`, `verifyOrder`, `cancelOrder`, `startChecklist`, `toggleChecklistItem`, `completeChecklist`, `assignTraining`, `completeTraining`. Validation throws typed, human-readable errors that the UI renders in one place. `src/store.ts` owns the storage key, schema guard, and quarantine of unreadable payloads. `src/views.ts` is pure template rendering with escaping at every interpolation; `src/main.ts` owns UI state, delegated listeners, focus return, and the drawer/modal keyboard contract.

**Dependencies.** No runtime dependency was added. Playwright and axe-core are dev-only, used by the browser suite. TypeScript is the only build tool. The stack was not migrated.

**State transitions.** Illegal transitions are unreachable from the UI and refused in the domain: verifying an order that is not awaiting a check, completing a checklist with an open step, cancelling a completed order, assigning a duplicate open module, or preparing an order twice. The two-person rule surfaces as a **Change checker** affordance rather than a dead end.

**Scope.** Presentation and business rules were kept separate: the CSS rewrite and template changes never touched the transition rules, and the domain changes were the extraction of transitions that previously lived in click handlers.

**Deployment reproducibility.** One build produces `dist/` and regenerates `public/` after deleting it, verifies every module emitted, verifies every relative import resolves, and verifies every asset `index.html` references exists. `dist/build-info.json` stores a hash of the sources; the server warns on a mismatch. A ZIP-style copy without `node_modules` starts and serves the app. The original defect — a root `dist/` containing only `views.js` while the working build sat under `public/dist/`, with a README instructing manual copying — is structurally impossible now.

**Tests.** 14 domain tests cover the rules; 27 browser checks cover the workflows end to end, including negative paths. The browser suite fails the process on any failed assertion and prints each result as it completes, so an interrupted run cannot look green.

**Remaining concerns.** `views.ts` is still one 420-line template module; splitting it per page would add files without reducing coupling, so it was left whole with a clear section per page. `styles.css` is a single 1 800-line stylesheet with numbered sections and one responsive ownership block; a CSS split would create ordering risk for no measured benefit.

## Review B — Senior product designer

**Screen purpose.** Each page answers one question. Shift desk answers “what needs a decision now?” and names exactly one next action, with the reason on screen. Inventory answers “what is short and what just moved?”. Orders answers “what is on the pass and who can check it?”. Checklists answer “what routine is open?”. People answers “who can act and who is trained?”. Insights answers “what do the records actually show, and what are the assumptions?”.

**Hierarchy.** One display heading per page, one section kicker per block, sentence-case labels instead of uppercase eyebrows. The shift brief and the next action are the only two-equal panel on the page; everything below is deliberately quieter. Both desk columns now end at roughly the same height, which removed the dead half-screen that the previous layout left under the handoff queue.

**Primary actions.** Every record has a single primary action derived from its state (`Mark prepared`, `Change checker`, `Verify order`, `View record`, `Reprepare`). Secondary actions are text-weight. The two-person rule is explained at the point where it matters, not in a legend.

**Visual system.** Warm paper `#FAF6F0`, white raised surfaces, coffee ink `#251508`, action blue used only for primary buttons and selection, ochre for section kickers, and small radii (3–12 px). Numeric columns are tabular. Status is carried by label plus dot and colour, never by colour alone.

**Mobile.** The drawer, the five-item dock, the labelled record cards, and the dialog geometry were all measured rather than assumed. The dock keeps 44 px targets, the body copy stays at 16 px, and the page reserves space for the dock.

**Café fit.** The language is operational: handoff, checker, replenishment, reorder point, routine, sign-off. Nothing claims a POS, printer, payment, or customer account. The sample workspace is labelled on every page.

**Feedback.** Toasts for committed actions, an inline alert for validation, disabled sign-off until the last step, a correction note carrying the failed check's category, and focus returning to the control that opened a dialog.

## Review C — Independent AI-slop critic

| Category | Before | After | Evidence for the change |
| --- | --- | --- | --- |
| Generic dashboard patterns | 6 | 8 | KPI card row and dashboard-style panels replaced by a state-derived brief and one next action |
| Repetitive composition | 5 | 8 | Removed the numbered `01 / 02 / 03` kickers and the duplicate headline-plus-subhead pairs (`Orders to move forward` over `Handoff queue`) |
| Visual identity | 6 | 8 | Warm paper, coffee ink, ochre kickers, serif display face reserved for page titles and headline figures |
| Decorative elements without purpose | 4 | 8 | Removed the decorative “Independent capstone” rail card and the numbered `01`–`04` list markers on routines |
| Inconsistent structures | 5 | 8 | One status vocabulary, one table treatment, one empty-state pattern, one dialog shell |
| Spacing and alignment | 6 | 8 | Spacing scale applied; the dead region under the handoff queue was closed by moving the activity ledger into the left column |
| Typography | 5 | 8 | Body copy 15–16 px, secondary labels no lighter than 5.1:1, tabular numerals, uppercase limited to status and short meta |
| Excessive explanatory copy | 5 | 8 | Section subtitles cut to one line; the Insights panel states denominators instead of persuasive prose |
| Interaction polish | 5 | 8 | Drawer and dialog transitions, focus return, Escape handling, corrected state affordances, reduced-motion support |
| Plausible product detail | 8 | 9 | Two-person check enforced in the UI, physical counts recorded as balances, storage quarantine notice |
| **Overall** | **5.4** | **8.1** | |

**What still reads as machine-made.** The serif display face plus ochre kicker is a recognisable editorial pairing, and a reviewer could call it a trend rather than a brand. The sample inventory (tea concentrate, tapioca, lids) is realistic but still invented. The empty states are solid but wordier than a shipping product would need. These are craft limits, not correctness defects.

**What was fixed because of this review, not before it.**
- Three mobile-only controls (dock, drawer close, menu button) rendered at desktop width because `.icon-btn` was declared after the responsive hints; ownership moved to matching specificity.
- `--faint` sat at 4.39:1 on the warm panel; darkened to 5.17:1, fixing the only axe contrast failure.
- Native `required` bubbles bypassed the dialogs' own alert region, so two dialogs failed silently apart from a transient browser tooltip; modal forms now use `novalidate` and report through the announced alert.
- The failed-check dialog's issue and note fields now expose `aria-required` instead of relying on native validation.
- The overview's left column was half empty at 1440 px; the activity ledger moved under the handoff queue.
