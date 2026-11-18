# Status

Last updated: 2026-11-17

A short snapshot of where the project stands, so a new chat can pick up without
rereading the whole repo. Claude updates this file as part of any commit that
changes status.

## Phase

Phase 2: Core logic (plain JS functions with tests). Started 2026-11-15.

Phase 1 is done: requirements (`docs/requirements.md`) and data model
(`docs/data-model.md`, `docs/schema.sql`) agree, and `docs/schema-tests.sql`
passes 48 use-case checks on PostgreSQL 16.

Decided at kickoff:

- Tests: Node's built-in `node:test`, no dependencies (`npm test`). Revisit
  Vitest when React arrives in Phase 3.
- Node 24 (pin `engines` in package.json).
- Workflow: Claude writes each test file, opening with a short spec comment; I
  write the code until the tests pass; Claude reviews.
- Code in `src/core/`, one module per topic, tests next to it as `*.test.js`
  (colocation). Feature folders get revisited at Phase 3 kickoff.
- Function inputs use the table column names (`next_day_id`, `position`) so
  Phase 4 database rows drop in unchanged.

Order:

1. Setup (Claude): package.json, `src/core/`
2. Next-day logic (007, 010): done
3. Progression suggestion (006, 009): done
4. Confirm-screen rules (req 24–26): done
5. Workout lifecycle: start, resume, finish, discard, submit
6. Guards and program edits (rest of data-model.md's app list)
7. Checkpoint: review records and requirements, TypeScript question, README

## Next step

Step 5, workout lifecycle, is in discussion (started 2026-11-17). Next, I answer
the open questions below. Then Claude records any decisions and writes
`src/core/workout.test.js`.

Already settled by requirements, so not up for discussion: a workout starts at
its first logged set (13); submit moves next day and copies confirmed targets to
tracks only for program workouts (16, 25, 27); confirm screens come first on
Resume and Finish (26, done in step 4).

Open questions (Claude's recommendation in brackets):

1. Resume, partial exercise: I did 2 of 3 bench sets and closed the app. Does
   Resume land on bench, or the next untouched exercise? [Bench: the first
   exercise, by position, with fewer sets logged than planned.]
2. Resume, freeform: there's no plan. Where does it land? [The last exercise I
   logged a set for.]
3. Finish message: bench has 2 of 3 sets and rows has 0 of 3. Does "N exercises
   not logged" say 1 or 2? [2: any exercise missing a planned set counts.]
4. Discard: it deletes every logged set. Ask "Are you sure?" first? [Yes, with
   the set count, e.g. "Delete this workout and its 9 sets?"]
5. Machine taken mid-workout: can I add an exercise that isn't on the day to a
   program workout? [Not in v1; add it to `docs/later.md`.]

## Where things are

- `docs/requirements.md`: what v1 must do (27 numbered requirements).
- `docs/data-model.md`: the nine tables, which rules the database enforces and
  which the app must (the app list becomes Phase 2 tests).
- `docs/schema.sql`, `docs/schema-tests.sql`: exact Postgres schema and its
  use-case tests. Needs PostgreSQL 15+. Local install: Homebrew `postgresql@16`,
  keg-only, so binaries are in `/opt/homebrew/opt/postgresql@16/bin`.
- `docs/decisions/`: records 001–011. Latest: 011, the database enforces
  cross-table rules. 006 amended 2026-11-17 to add single progression; 009
  amended 2026-11-17 to add typed values and lowest weight.
- `docs/later.md`: deferred features (offline sync, tags, timed progression,
  progress charts, TypeScript, hiding exercises).
- `examples/current-program.md`: my 4-day split, used as example data only.
- The "Lift App Data Model" artifact is the interactive ERD.

## Open items

- None blocking.
