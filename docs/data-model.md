# Data model (v1)

Status: Phase 1, complete. Describes the tables that store everything in
`requirements.md`. The exact definitions are in `schema.sql`, and
`schema-tests.sql` checks them against the use cases below. The interactive
diagram is the "Lift App Data Model" artifact.

Related records: 005, 006, 008, 009, 010, 011.

## The big idea

- **The plan** is what you intend to do: `programs`, `days`, `slots`.
- **The log** is what you actually did: `workouts`, `workout_exercises`, `sets`.
- **Shared** tables sit between them: `exercises` (the movement) and `tracks`
  (its progression in one program).

The log only points at the plan through links that can be empty. A freeform
workout, a skipped set or a deleted slot never bends the plan, and deleting part
of a plan never deletes logged sets (010).

## Conventions

- Every id is a random UUID.
- Every table has a `user_id`. Every link between two user-owned rows also
  carries `user_id`, so the database refuses a link to another user's row (011).
- Weights are lb, stored as exact decimals (`numeric(6, 2)`), so 42.5 stays
  42.5. An empty weight means bodyweight.
- Fixed lists (kind, status, rule, measurement type) are text with a check,
  which is easier to extend than a Postgres enum.
- Times are `timestamptz`.
- Empty links are SQL `null`.

## Tables

### exercises

A movement you define once and use in any program or freeform workout.

| Column             | Notes                                         |
| ------------------ | --------------------------------------------- |
| `id`, `user_id`    |                                               |
| `name`             | Unique per user, ignoring case and spaces     |
| `measurement_type` | `reps`, `time` or `done`. Locked once logged  |
| `lowest_weight_lb` | Reps only. Targets' floor. Empty = Bodyweight |
| `created_at`       |                                               |

### programs

| Column          | Notes                                             |
| --------------- | ------------------------------------------------- |
| `id`, `user_id` |                                                   |
| `name`          |                                                   |
| `is_active`     | At most one active program per user               |
| `next_day_id`   | One of this program's days. Empty = the first day |
| `created_at`    |                                                   |

### days

| Column          | Notes                                 |
| --------------- | ------------------------------------- |
| `id`, `user_id` |                                       |
| `program_id`    |                                       |
| `name`          | e.g. "Upper 1"                        |
| `position`      | Rotation order, unique in the program |

### tracks

The current target for one progression, and the rule that moves it (006).

| Column               | Notes                                                     |
| -------------------- | --------------------------------------------------------- |
| `id`, `user_id`      |                                                           |
| `program_id`         | A track belongs to one program                            |
| `exercise_id`        |                                                           |
| `measurement_type`   | Copy of the exercise's type, kept in sync by the database |
| `rule`               | `single`, `double` or `none`                              |
| `rep_min`, `rep_max` | Required for `double`. Empty for `single`                 |
| `target_reps`        | Required for `single`, `double`. Empty = AMRAP            |
| `weight_lb`          | Reps tracks only. Empty = bodyweight                      |
| `target_seconds`     | Timed tracks only. Empty = open-ended                     |
| `increment_lb`       | Single and double progression step, default 5             |

The type copy lets the database check each column against the type: a timed
track must have empty reps and weight, so an empty `weight_lb` always means
bodyweight.

### slots

An exercise placed on a day.

| Column          | Notes                                                  |
| --------------- | ------------------------------------------------------ |
| `id`, `user_id` |                                                        |
| `program_id`    | Copy of the day's program, so the track can be checked |
| `day_id`        |                                                        |
| `track_id`      | Must be in the same program                            |
| `exercise_id`   | Copy of the track's exercise, checked by the database  |
| `position`      | Order within the day, unique in the day                |
| `set_count`     | At least 1                                             |

### workouts

| Column          | Notes                                                    |
| --------------- | -------------------------------------------------------- |
| `id`, `user_id` |                                                          |
| `kind`          | `program`, `off_program_day` or `freeform` (008)         |
| `status`        | `open` or `submitted`. At most one open workout per user |
| `day_id`        | Empty for freeform, or after the day is deleted (010)    |
| `started_at`    | Time of the first logged set                             |
| `submitted_at`  | Filled exactly when submitted                            |

There's no `program_id`. The day already says which program it came from, and
after the day is deleted, history by program isn't kept (010).

### workout_exercises

One exercise inside one workout.

| Column             | Notes                                              |
| ------------------ | -------------------------------------------------- |
| `id`, `user_id`    |                                                    |
| `workout_id`       |                                                    |
| `exercise_id`      | Always filled. History is read by exercise (010)   |
| `measurement_type` | Copy of the exercise's type. Locks it once logged  |
| `slot_id`          | Empty for freeform, or after the slot is deleted   |
| `position`         | Order within the workout, unique in the workout    |
| `next_reps`        | Confirmed next reps, 1–200. Empty for AMRAP (009)  |
| `next_weight_lb`   | Confirmed next weight, above 0. Empty = bodyweight |
| `confirmed_at`     | When OK was tapped. Empty = not confirmed yet      |

When `slot_id` is filled, `exercise_id` must match the slot's exercise.

### sets

One logged set: its target at the time, and what you actually did.

| Column                                              | Notes                                               |
| --------------------------------------------------- | --------------------------------------------------- |
| `id`, `user_id`                                     |                                                     |
| `workout_exercise_id`                               |                                                     |
| `measurement_type`                                  | Copy of the type, to check the columns below        |
| `set_number`                                        | Unique within the workout exercise                  |
| `target_reps`, `target_weight_lb`, `target_seconds` | Copied when logged. Empty in freeform and for AMRAP |
| `reps`, `weight_lb`                                 | Reps sets. Empty weight = bodyweight                |
| `seconds`                                           | Timed sets                                          |
| `done`                                              | Done sets                                           |
| `logged_at`                                         |                                                     |

Each type has exactly its own columns filled: a reps set has `reps` and no
`seconds` or `done`, and so on.

## Who enforces what

### The database refuses

- Any link to another user's row.
- A slot whose track is in a different program, or whose exercise differs from
  its track's.
- A logged exercise that differs from its slot's exercise.
- A next day from another program.
- A second active program, or a second open workout.
- Duplicate exercise names, duplicate positions, duplicate set numbers.
- Changing an exercise's measurement type once it's logged (req 3). Before that,
  its tracks follow the change.
- Columns that don't fit the measurement type, on exercises, tracks and sets.
- Double progression without a rep range and target.
- Single progression without a target, or with a rep range.
- A freeform workout with a day; a submitted time on an open workout.
- Deleting an exercise that has logs or is on a program.
- Deleting a track a slot still uses.

### The app is responsible for (Phase 2 tests)

- Treating an empty `next_day_id` as the program's first day by position. That
  covers both a new program and a deleted next day (010).
- Deleting a track in the same step as its last slot (010).
- A logged slot being on the workout's day.
- Starting a `program` or `off_program_day` workout with its day filled.
- Requiring OK on the confirm screen before submitting (req 26).
- Blocking program edits while a workout is open (req 18).
- Picking a new active program when the active one is deleted.
- Copying confirmed targets to tracks only on submit, and only for `program`
  workouts (req 25, 27).
- Keeping targets at or above their exercise's lowest weight, and allowing a
  bodyweight target only when the lowest weight is Bodyweight (req 1, 24).
  Logged sets aren't limited (009).
- Requiring a lowest weight choice when a reps exercise is created (req 1).
  Empty is a valid choice (Bodyweight), so the database can't tell it from "not
  chosen".

## What deleting does

| Delete   | Effect                                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| Program  | Deletes its days, slots and tracks. Workouts keep their sets                                                               |
| Day      | Deletes its slots. Workouts that ran it get an empty `day_id`; a program whose next day it was gets an empty `next_day_id` |
| Slot     | Logged exercises from it get an empty `slot_id`                                                                            |
| Track    | Refused while a slot uses it                                                                                               |
| Exercise | Refused while it has logs or tracks                                                                                        |
| Workout  | Deletes its workout exercises and sets (Discard)                                                                           |
| Account  | Deletes everything the user owns                                                                                           |

## Write order and multi-row changes

- **New program:** insert the program with no next day, then its days, then set
  `next_day_id`. No special handling is needed.
- **Reordering days, slots or workout exercises:** do it in one transaction.
  Position uniqueness is checked at commit, so swapping two positions works.
- **Switching the active program:** clear the old one first, then set the new
  one, in one transaction. The one-active rule is checked row by row.
- **Changing an exercise's type before it's logged:** clear the track targets
  that don't fit the new type in the same transaction.

## Phase 4 notes

- Needs PostgreSQL 15 or later (011).
- `users` stands in for the auth provider's user table. Every `user_id` link to
  it deletes on cascade, which Supabase recommends for `auth.users`.
- `schema.sql` already indexes every link column and every `user_id`. Postgres
  doesn't index the referencing side of a link by itself, and row-level security
  filters every query on `user_id`.
- Row-level security policies should compare `user_id` to the signed-in user on
  every table. The composite links stop a row from pointing at another user's
  data, which policies alone don't do.
- Run `schema-tests.sql` against the real database before building on it.
