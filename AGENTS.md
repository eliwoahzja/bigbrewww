# BigBrew (BBOMS) — agent notes

A standalone PHP 8.x + MySQL app (XAMPP/KSWEB). The app itself has no Node build
step. See `README.md` for install and demo accounts.

## Installed skill: Stageshow

`.agents/skills/stageshow/` holds benjitaylor's **Stageshow** skill (v1.1.1, MIT),
installed for agents that read `AGENTS.md` instead of Claude Code's
`.claude/skills/`. It builds faux product UI — stills, feature cards, cursor
walkthroughs, bento grids — in React and plain CSS, and films the result to
check it.

Read `.agents/skills/stageshow/SKILL.md` before any illustration or product-demo
work, then only the references it points at:

- `references/framing.md` — how the screen sits in its space (layout table).
- `references/craft.md` — the still-frame rules (restraint, type, spacing).
- `references/motion.md` — story, loops, cursor, drags.
- `references/kit.md` — every kit part and its props.
- `references/rehearse.md`, `references/verify.md`, `references/review.md` — filming and hand-over.
- `references/looks.md` — mapping a product's tokens onto the kit.

Use it when asked for a mock/faux UI, a product shot, a hero or feature-card
illustration, an animated cursor demo, or a phone/notification/bento scene.
Do not use it for live browser automation: scenes are authored scripts.

### Running it

Node 20.19+ (this workspace has Node 26). From `.agents/skills/stageshow`:

```sh
npm ci                 # deps are not restored with the workspace
npm run dev            # playground; Vite prints the URL (Portless on Linux)
npm run typecheck      # tsc over the playground
npm run check:css      # class-clash check
node scripts/film.mjs 'http://127.0.0.1:5173/?capture=<scene>' --select '#example' --gate
```

`npm run dev` needs `portless` (an optional dep). If it is missing, use Vite
directly: `npx vite playground --config playground/vite.config.ts --host 0.0.0.0`.

`film.mjs` needs Chrome (`CHROME_PATH` or a local install). Without one, render
the scene in the Cloud browser and screenshot it instead; say that the film gate
did not run rather than claiming it passed.

### Working conventions here

- Add a scene at `.agents/skills/stageshow/examples/<name>/index.tsx` (plus its
  own `.css`); the playground auto-loads it and `?capture=<name>` films it.
  Import the kit with `../../kit`. Keep each scene's CSS scoped under its root
  class, as the examples do.
- The kit is copy-in code: for a React host outside the playground, copy
  `kit/` into that project and import from `kit/index.ts`.
- BigBrew's own look lives in `public/assets/styles.css`; map it as described in
  `references/looks.md`:
  - `--ss-accent: #8b542e` (coffee brown), `--ss-canvas: #f4efe8` (cream),
    `--ss-surface: #fff`, `--ss-line: #e6d9c8`, text `#3a2a1c` / `#6b6056`,
    alert `#a33d30`, success stays green.
  - Type: Georgia for headings/figures, `system-ui` for UI text.
  - Shape: 12px radius on panels and cards, 8px on controls, 10px window.
  - Currency is the peso, formatted `₱1,234.00` (`money()` in `app/view.php`).
- Keep design work under `.agents/skills/stageshow/` (or a dedicated `design/`
  folder if one is added) and never wire React/Node into the PHP pages.
- The applied BigBrew scene is `examples/bigbrew/`: the dashboard hero where a
  sale is recorded and today's total rolls, with a 960-wide design and a
  358-wide compact crop. Its stills are `design/out/bigbrew-wide.png` and
  `design/out/bigbrew-compact.png`; re-film with
  `?capture=bigbrew&still=1` on the playground server.
- `node_modules/` is git-ignored; generated stills belong in a `design/out/`
  folder, not in `public/` unless the page actually uses them.

### Notes on the port

The upstream skill ships `CLAUDE.md` (`@AGENTS.md`) and a `npx skills add`
installer for Claude Code. Here the same folder is discovered through this file;
the kit, references, examples and scripts are unchanged. Scenes in `examples/`
written for Claude Code (for instance `hero-demo`'s Claude Code welcome box) stay
as upstream specimens.
