# The enhancement flow

Parlance improves itself on a schedule: new lessons and stories, new kinds of exercises, UX fixes, and the changes learners ask for. Opus plans and judges; Sonnet and Haiku build. Matt hears about each release and is asked only when something crosses a line in [POLICY.md](POLICY.md).

## A cycle

The scheduled task **Parlance flow cycle** runs the `flow-cycle` skill (`.claude/skills/flow-cycle/SKILL.md`) in a fresh cloud session in the **Default** environment, Sundays and Wednesdays at 8:53am New York time. That environment holds the network secrets the flow needs (the Google Text-to-Speech key for recorded voices). One cycle ships at most one release; if a cycle is cut short (a usage limit, a lost session), the next one finishes its shipping first.

| Stage | Who | Model | What happens |
|---|---|---|---|
| 0. Preflight | orchestrator | Opus | Current `main`, `npm ci`, stop if paused, resume an unfinished plan, `node dev/flow.js snapshot` |
| 1. Intake | orchestrator | Opus | Open notes and proposals from both homes (Supabase, ArtifactData) into a private digest |
| 2. Plan | `parlance-planner` | Opus | Picks 1–3 work packages and writes `plans/<date>-<slug>.md` from [the template](plans/TEMPLATE.md), detailed enough to build without design decisions |
| 3. Plan gate | orchestrator | Opus | Applies POLICY.md: Green and Amber are approved, Red goes to Matt as a pending proposal in Studio; approves the learner proposals it builds |
| 4. Build | `parlance-content` (one per language, in parallel), `parlance-builder`, `parlance-illustrator` | Sonnet | Each builds its package in its own worktree, with tests |
| | `parlance-chores` | Haiku | Voices (`dev/voices.js`, within the free monthly cap), counts, mapping |
| 5. Verify | `parlance-verifier` | Sonnet | Tests, the guard, picture check, 412px screenshots in light and dark, every acceptance criterion with evidence |
| 6. Review | `parlance-reviewer` | Opus | Fresh eyes on the whole diff: zone, language quality, ground rules, screenshots. SHIP, FIX, DROP or ESCALATE |
| 7. Ship | orchestrator | Opus | Version and release notes, `main`, the artifact, `latest` in both homes, thanks to the learners whose notes were built |
| 8. Report | orchestrator | Opus | Plan outcome, roadmap and [LOG.md](LOG.md) updated; a short message to Matt |

Failures loop back to the agent that owns the file, at most twice; then the package is dropped and the rest ships if it stands alone.

## The safety net

- **[POLICY.md](POLICY.md)** says what the flow may approve itself (Green, Amber) and what only Matt decides (Red: money, anything that could lose progress, accounts and privacy, the look and the birds, taking features away, the automation itself).
- **`node dev/flow.js guard`** checks every release against `main` mechanically: lesson and story ids that disappeared, review-card keys that would be orphaned, the languages' shape, the storage key and schema migrations, protected files, new outside hosts, literal colors, Spain-only Spanish, straight apostrophes, version and release notes, Recraft spend. STOP means Matt decides; FIX means the builder fixes it first.
- `npm test` must end with `FAIL 0`, and an Opus reviewer that didn't build anything must say SHIP.
- Undo: `git revert` on `main`, bump the patch version, republish, set `latest` (POLICY.md, "Undoing a release").

## How Matt steers

- **Studio** (Me → Studio → Proposals): questions from the flow arrive as pending proposals marked as from the flow. Approve one and the next cycle builds it; reject it and it never comes back. Approve learner proposals there as before; the flow also approves pending ones that are clearly Green, and marks them `decidedBy: "flow"`.
- **[ROADMAP.md](ROADMAP.md):** add, reorder, or `parked` a row.
- **[policy.json](policy.json):** `paused`, `focus`, `avoid`, the release size limits, which model does which job, and `budgets.recraftUnitsPerMonth` (0: never spends on Recraft without asking).
- **The scheduled task** in the Claude app: run it now, change the days, or turn it off.
- **Any Claude Code session:** `/flow-cycle` runs a full cycle; `/flow-cycle plan-only` stops after the plan gate; `/flow-cycle dry-run` builds and reviews without shipping; `/flow-cycle build flow/plans/<file>.md` builds a plan that's already written.

## Files

| Path | What it is |
|---|---|
| `.claude/skills/flow-cycle/SKILL.md` | The cycle, step by step (the orchestrator follows it) |
| `.claude/agents/parlance-*.md` | Each agent's job, model and rules |
| `flow/POLICY.md`, `flow/policy.json` | What may ship without Matt; his switches (only he edits these) |
| `flow/ROADMAP.md` | The backlog |
| `flow/plans/` | One plan per cycle, from `TEMPLATE.md`, with its outcome |
| `flow/LOG.md` | One line per cycle |
| `flow/shots/` | Screenshots (not committed) |
| `dev/flow.js` | `snapshot`, `guard`, `shots` |
| `dev/feedback.js` | `open`, `close`, `approve`, `escalate`: SQL for the web home |

Nothing in `flow/` or `.claude/` is published: `dev/files.js` lists only what the app needs.
