# Source-to-implementation traceability

## Research basis: uploaded Mini Capstone PDF

| Location in PDF | Proposal or operational issue | Implemented workflow | Evidence classification |
| --- | --- | --- | --- |
| pp. 1–2, inventory discrepancies, stockouts, overstock, waste | Normalize inventory tracking | Ingredient catalog, reorder points, stock ledger, counts, waste cost | Directly motivated by study; UI/data rules are implementation decisions |
| pp. 1–2, wrong orders, toppings, leaking lids | Standardize order accuracy | Multi-line order entry, staged preparation, distinct verifier, four quality checks, logged failure reasons | Directly motivated by study; concrete screen design inferred |
| p. 4, standardized opening/closing and count SOPs | Formalize shift execution | Opening, closing, inventory count and quality checklist runs, stored sign-offs | Checklist categories supported by text; individual steps are illustrative |
| p. 4, tiered onboarding/refresher training | Record employee readiness | Staff directory, three training modules and assignments | Training approach supported by text; module titles are proposed examples |
| p. 4, compare development/training costs against avoided waste, refunds, added margin | Support ROI assessment | Scenario entry with explicit formula and optional expected benefits | Formula applies study's framework; *no measured benefits or research findings are claimed* |
| p. 3–4, proposed employee questionnaire, interviews, delivery review analysis, pilot validation | Research methodology | **Not represented as completed application research** | Excluded to preserve academic integrity |

## Supplied design system

`DESIGN.md` identifies warm off-white #FAF6F0, raised white surfaces #FFFFFF, strong coffee text #251508, body #61554A, and interactive blue #0D6EFD. The application adopts these values, mostly 8–16px radii, restrained shadows, typography hierarchy, and short UI transitions.

The referenced Gilroy font files were **not provided**. CSS specifies the original face names first, followed by locally available system fallback fonts. No Gilroy license or installed font is claimed.

## Local prototype design decisions

- Versioned `localStorage` database instead of inventing a cloud integration.
- Local acting-employee selector rather than a deceptive login form.
- Example data visibly labeled on every page until reset.
- Per-line order details entered by staff rather than claiming access to BigBrew's official menu or recipes.
- No branches, payments, or automatic purchasing workflows because the capstone does not substantiate those integrations.
