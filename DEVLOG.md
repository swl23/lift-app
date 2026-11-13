# Devlog

## 2026-11-12: Phase 1 begins, progression tracks

- Walked Claude through my current 4-day upper/lower split as example data.
  Most lifts use double progression: add a rep to every set until the top of
  the rep range, then add weight and drop back to the bottom.
- Decided the app shouldn't be built around my split. Users define their own
  programs, and my split is just example data to test the model against.
- Added decision record 006: progression state lives in tracks. Slots can share
  a track (the same exercise on two days progresses together), and the same
  exercise in different programs progresses independently.
- AMRAP sets have no automatic progression: you enter the reps you got and
  change the weight by hand. Sets can have no weight (bodyweight dips).
- Described how users build a program: create a split, add exercises (each one
  is a name plus how it's marked complete: sets × reps × weight, time, or a
  simple done/not done), and set each exercise's progression defaults during
  setup. When you finish an exercise, the app shows the programmed progression
  (for example, 3×8 at 50 lb in a 6–8 range → 3×6 at 55 lb) and asks you to
  confirm it.
- Claude proposed, not yet decided:
  - Logged sets: one table with optional weight/reps/duration/done columns and
    a measurement type, rather than a separate table per type.
  - The database stores each track's rule settings (rule type, rep range,
    increment); plain Phase 2 functions apply the rules. v1 supports two rules:
    double progression and none.

Next: answer two open questions, then Claude drafts `docs/requirements.md`.

1. Does the measurement type belong to the exercise or to the track?
2. Do timed exercises progress automatically in v1, or use rule "none"?

Still open after that: missed reps, whether a new program's track starts fresh
or carries over, whether one-off lifts can affect a track, and how the app knows
which day is next (likely decision record 007).

## 2026-11-12: CLAUDE.md and backfilled decisions

- Added CLAUDE.md with how I want Claude to help, project conventions, and when
  to suggest decision records and devlog entries.
- Moved the remaining working agreement from the original planning doc into
  CLAUDE.md (per-phase workflow, free tiers by default, TypeScript check-in at
  the end of Phase 2), so the repo is now the single source of truth.
- Backfilled decision records for earlier choices: 003 (installable web app),
  004 (React), and 005 (multi-user at small scale).

Next: Phase 1, starting with my current upper/lower split as real data.

## 2026-11-12: Phase 0 cleanup

- Added `.gitignore` (node_modules, .DS_Store, .env files).
- Matched the editor ruler to Prettier's 80-column wrap.
- Fixed the date/status lines in decision record 001.
- Added decision record 002: no offline sync. Revised its alternatives and
  consequences to put the data-collision risk where it belongs.
- Added a VS Code snippet for new decision records.
- Skipped a decision record for "one app folder." It's too small to need one.

Phase 0 complete. Next: Phase 1, requirements and data model.

## 2026-11-12: Planning and repo setup

- Developed project plan with Claude: phases, scope, key decisions.
- Core data modeling idea: keep program (the plan), log (what I did), and
  exercise (the movement) separate, so one-off lifts don't disrupt the split.
- Decided: plain JS, one app folder, no offline sync.
- Set up repo, README, first decision record, and development log.

Next: use my own current workout split and progression to create data model and
map core application logic.
