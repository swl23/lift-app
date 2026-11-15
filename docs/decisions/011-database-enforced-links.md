# 11. The database enforces cross-table rules

Date: 2026-11-15\

## Context

Several rules span two tables: a slot's track must be in the day's program, a
program's next day must be one of its own days, a logged exercise must match its
slot's exercise, and no row may point at another user's row. If only the app
checks these, one bug can quietly file sets under the wrong exercise or link to
another user's data, and history is read by exercise (010). Phase 4's row-level
security controls what a user can read, but a foreign key check doesn't go
through it.

## Decision

- Links between user-owned rows are composite: the child stores the parent's id
  plus `user_id` (or `program_id`, `exercise_id`, `measurement_type`), and the
  database checks the pair against the parent.
- Where a link must empty when its parent is deleted (010), it uses
  `ON DELETE SET NULL (column)`, which empties only that column. This needs
  PostgreSQL 15 or later.
- Measurement-type rules are checked by copying the type onto tracks, workout
  exercises and sets, rather than by a trigger.
- `workouts.program_id` is dropped. The day already says which program it came
  from.
- Rules that depend on time or on several steps (next-day fallback, deleting a
  track with its last slot, confirm before submit) stay in the app and get Phase
  2 tests.

## Alternatives considered

- **App-only checks:** fewer columns, but a bug writes bad data silently.
- **Triggers:** can check anything, but hide logic in the database where it's
  harder to read and test.

## Consequences

- A few repeated columns (`slots.program_id`, `slots.exercise_id`, the
  `measurement_type` copies). The database keeps them in sync or refuses the
  write, so they can't drift.
- The database must be PostgreSQL 15+, which narrows the Phase 4 choice.
  Supabase and Neon both qualify.
- Inserts must supply the copied columns. A wrong value fails loudly instead of
  saving bad data.
- `docs/schema-tests.sql` checks these rules and should run against the Phase 4
  database.
