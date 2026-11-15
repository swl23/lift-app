# 10. Deleting plan rows; history is kept by exercise

Date: 2026-11-15\

## Context

Logged workouts point at the plan they came from: a workout points at its
program and day, and each exercise in it points at its slot. Users will edit
their programs over time, dropping exercises, days or whole programs. The data
model needs a rule for what happens to those links when a plan row goes away.

I'll mostly look back at progress by exercise ("my lateral raise over time"),
not by program or day ("everything I did on Upper 2 in October").

## Decision

- Programs, days, slots and tracks are really deleted. Deleting a program
  deletes its days, slots and tracks with it.
- Past workouts lose their link to whatever was deleted (the link becomes
  empty), but keep every exercise and set. Each exercise in a workout stores
  its exercise directly, so history by exercise is unaffected.
- Freeform workouts are still the only ones created without a day or slot.
  After a delete, a program workout can also have an empty day or slot; its
  kind still says how it was run.
- If the deleted day was a program's next day, the app falls back to the
  program's first remaining day.
- Carry-over (006) falls back to the exercise's most recent logged set when no
  track exists for it, so deleting an old program doesn't lose working weights.
- A program can't be edited while a workout is open. The user finishes or
  discards it first.

## Alternatives considered

- **Archive instead of delete:** plan rows with history get an "archived" mark
  and are hidden, so old workouts stay fully linked to their day and slot. Best
  for history by program or day, but every editor query and uniqueness rule has
  to skip archived rows, for a view I don't expect to use.
- **Block deleting anything with history:** simplest for the database, but a
  program could never be cleaned up once it had been used.

## Consequences

- Rules that said "a program workout always has a day" and "only freeform
  exercises have no slot" are loosened in the data model.
- `workout_exercises.exercise_id` must stay, even though it repeats what the
  slot's track says: it's what keeps history after a slot is deleted.
- Looking back at old workouts by program or day is unreliable after edits. If
  that's ever wanted, archiving can be added later.
- Carry-over gets a second source (logged sets), which Phase 2 logic has to
  cover.
