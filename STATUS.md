# Status

Last updated: 2026-11-15

A short snapshot of where the project stands, so a new chat can pick up without
rereading the whole repo. Claude updates this file as part of any commit that
changes status.

## Phase

Phase 2: Core logic (plain JS functions with tests). Not started.

Phase 1 is done: requirements (`docs/requirements.md`) and data model
(`docs/data-model.md`, `docs/schema.sql`) agree, and `docs/schema-tests.sql`
passes 44 use-case checks on PostgreSQL 16.

## Next step

Start Phase 2 with questions (per CLAUDE.md), then Claude writes the first spec.
Candidate first functions: next-day logic (007, 010 fallback) and the
progression suggestion for the confirm screen (006, 009).

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
