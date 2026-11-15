# Status

Last updated: 2026-11-15

A short snapshot of where the project stands, so a new chat can pick up without
rereading the whole repo. Claude updates this file as part of any commit that
changes status.

## Phase

Phase 1: Requirements and data model.

- Requirements: drafted, no open questions (`docs/requirements.md`).
- Data model: reviewed as an interactive ERD (nine tables) in chat. Not yet
  written to the repo.

## Next step

Write `docs/data-model.md` from the ERD, including the decisions made during
review (`confirmed_at` on `workout_exercises`, real deletes per 010). Then
check that requirements and the data model agree, and close out Phase 1.

## Where things are

- `docs/requirements.md`: what v1 must do (27 numbered requirements).
- `docs/decisions/`: records 001–010. Latest: 010, deleting plan rows.
- `docs/later.md`: deferred features (offline sync, tags, timed progression,
  progress charts, TypeScript).
- `examples/current-program.md`: my 4-day split, used as example data only.

## Open items

- None blocking.
