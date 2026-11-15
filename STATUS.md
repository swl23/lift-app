# Status

Last updated: 2026-11-15

A short snapshot of where the project stands, so a new chat can pick up without
rereading the whole repo. Claude updates this file as part of any commit that
changes status.

## Phase

Phase 2: Core logic (plain JS functions with tests). Started 2026-11-15.

Phase 1 is done: requirements (`docs/requirements.md`) and data model
(`docs/data-model.md`, `docs/schema.sql`) agree, and `docs/schema-tests.sql`
passes 44 use-case checks on PostgreSQL 16.

Decided at kickoff:

- Tests: Node's built-in `node:test`, no dependencies (`npm test`). Revisit
  Vitest when React arrives in Phase 3.
- Node 24 (pin `engines` in package.json).
- Workflow: Claude writes each spec in `docs/specs/<name>.md` plus its test
  file; I write the code until the tests pass; Claude reviews.
- Code in `src/core/`, tests next to it as `*.test.js`.
- Function inputs use the table column names (`next_day_id`, `position`) so
  Phase 4 database rows drop in unchanged.

Order:

1. Setup (Claude): package.json, `src/core/`
2. Next-day logic (007, 010)
3. Progression suggestion (006, 009)
4. Confirm-screen rules (req 24–26)
5. Workout lifecycle: start, resume, finish, discard, submit
6. Guards and program edits (rest of data-model.md's app list)
7. Checkpoint: review records and requirements, TypeScript question, README

## Next step

Claude writes the setup, `docs/specs/next-day.md` and
`src/core/nextDay.test.js`, and shows them before committing. Sketch:

- `getSuggestedDay(program, days)`: the day matching `next_day_id`; falls back
  to the lowest position if empty or deleted (010); `null` if no days.
- `getNextDayId(program, days, workout)`: after a submitted `program` workout,
  the day after the one run, wrapping (req 14); other kinds leave it unchanged
  (req 20).
- Edge cases: position gaps, unordered days, one-day program, the day that was
  run has been deleted.

## Where things are

- `docs/requirements.md`: what v1 must do (27 numbered requirements).
- `docs/data-model.md`: the nine tables, which rules the database enforces and
  which the app must (the app list becomes Phase 2 tests).
- `docs/schema.sql`, `docs/schema-tests.sql`: exact Postgres schema and its
  use-case tests. Needs PostgreSQL 15+.
- `docs/decisions/`: records 001–011. Latest: 011, the database enforces
  cross-table rules.
- `docs/later.md`: deferred features (offline sync, tags, timed progression,
  progress charts, TypeScript, hiding exercises).
- `examples/current-program.md`: my 4-day split, used as example data only.
- The "Lift App Data Model" artifact is the interactive ERD.

## Open items

- None blocking.
