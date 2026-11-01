# <Plan title: what learners get, in a few words>

<!-- The planner (Opus) copies this file to flow/plans/<YYYY-MM-DD>-<slug>.md and fills every section.
     The test of a good plan: a Sonnet agent that has read only CLAUDE.md, its own agent file and its work package
     can build the package without making a single design decision, and the verifier can tell pass from fail
     without judgment calls. If a step says "decide", "choose", "something like" or "as appropriate", it isn't done.
     Delete these comments when filling it in. -->

- **Cycle:** <YYYY-MM-DD>
- **Status:** draft | approved | building | shipped (<version>) | dropped
- **Release:** <X.Y.Z> (minor for new content or features, patch for fixes only)
- **Base:** `main` at <short sha>
- **Proposals built:** <proposal ids and which home, or "none">
- **Roadmap items:** <R-ids, or "new">

## Why this, why now

<3–6 sentences. What learners get and the evidence: feedback note ids, snapshot numbers, screenshots in flow/shots/,
roadmap ids. Why it beats the other open roadmap items this cycle.>

## Gate

| Package | Zone | Why | Extra checks (Amber) |
|---|---|---|---|
| WP1 | Green / Amber / Red | <the POLICY.md line that applies> | <what the reviewer must confirm> |

<Red packages are not built: say which question goes to Matt (flow/POLICY.md "Asking Matt").>

## Work packages

<!-- One package per independent piece of work, at most policy.json maxPackagesPerCycle. Order them so later packages
     only depend on earlier ones. Say which can run in parallel (separate worktrees, disjoint files). -->

### WP1 — <name>

- **Agent:** parlance-content | parlance-builder | parlance-illustrator | parlance-chores
- **Model:** sonnet | haiku
- **Runs:** first | after WP<n> | in parallel with WP<n> (worktree)
- **Owns (may edit):** <exact paths; nothing outside this list>
- **Reads first:** <exact files and functions, e.g. `buildLesson()` in js/core/engine.js, de-31-1 in content/de-4-a2.js as the model>
- **Must not touch:** <shared files another package or the integration step owns>

**Spec.** <Everything the agent needs, concretely:
- content: per language, each lesson's id, title, level, unit and its position in the course, the grammar idea of the tip
  in one sentence, the 6–8 target words (with gender), the sentence themes, the blank targets; story ids, cast, plot beats,
  the questions. Write German, Spanish and Italian lists out, not "the equivalent".
- code: the function names and signatures, the data shapes, where each is called from, the exact copy strings, the
  tokens and icons to use, edge cases (no tutor, signed out, web version, small screens, dark mode, reduced motion),
  and a sketch of the code for anything non-obvious.
- pictures: the concepts to decide, which to draw, which to mark "-" and why.>

**Steps.**
1. <imperative, one action each, with file paths>
2. …

**Acceptance criteria** (each one checkable by a command, a test or a screenshot):
- [ ] <e.g. `npm test` ends with FAIL 0, with N new checks named "<…>" in dev/test.js>
- [ ] <e.g. `node dev/flow.js shots --steps "js:startLesson('de-40-1');wait:900;click:Start lesson;wait:800;shot:de-40-1"` shows the new card with no sideways scroll, light and dark>
- [ ] <e.g. es lessons use ustedes; it elisions use ’>

**Stop and report if:** <conditions under which the agent must stop instead of improvising, e.g. "the change needs a new
field in saved state", "a word has no clear translation in one language">

### WP2 — …

## Integration

<!-- The orchestrator does this after merging the packages, or hands it to one builder. Shared files go here. -->
- [ ] `index.html`: <script tags to add, and where>
- [ ] `dev/test.js`: <counts to update, e.g. lesson count 468 → 492, stories 27 → 30>
- [ ] `CLAUDE.md` and `docs/ARCHITECTURE.md`: <shape numbers, new sections>
- [ ] `js/core/art.js`: <unit signs for new unit titles>
- [ ] Word pictures (parlance-illustrator) and voices (parlance-chores: `node dev/voices.js --dry`, then `node dev/voices.js`)

## Release notes

<!-- Written here by the planner, in Parlance's voice: plain, warm English in sentence case, for learners, no jargon.
     1 title of at most 4 words and 1–3 notes. The orchestrator pastes this into RELEASES. -->
- **Title:** <…>
- **Notes:**
  - <…>

## Verification plan

- Commands: `npm test` (FAIL 0), `node dev/flow.js guard` (no STOP, no FIX), `node design/pictures/tools.js check` (ok) if pictures changed.
- Screens (`node dev/flow.js shots`, 412px, light and dark): <exact --steps strings for each changed screen>
- Spot checks for the reviewer: <e.g. read de-40-2, es-40-2, it-40-2 side by side; play the new exercise type twice>

## Risks and rollback

<What could go wrong for learners, how the tests catch it, and how to undo it (git revert + patch release).>

## Outcome

<!-- Filled in by the orchestrator at the end of the cycle. -->
- **Shipped:** <version, commit> | **Dropped:** <packages and why> | **Escalated:** <proposal ids>
- **Notes for the next cycle:** <what was learned, follow-ups added to the roadmap>
