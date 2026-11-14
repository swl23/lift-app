# Requirements (v1)

Status: Draft, Phase 1. Describes what v1 must do, not how it's built. The data
model comes next and must satisfy everything here.

Related records: 002 (no offline sync), 003 (installable web app), 005
(multi-user at small scale), 006 (progression tracks), 007 (how the next day is
determined), 008 (freeform workouts and unfinished workouts).

## Concepts

- **Exercise:** a movement the user defines. A name plus a measurement type.
  There is no preloaded exercise library.
- **Measurement type:** how an exercise's sets are recorded. One of:
  - **Reps:** reps per set, with an optional weight (no weight means
    bodyweight).
  - **Time:** duration per set.
  - **Done:** each set is marked done or not done.
- **Program:** a user's split. An ordered list of days that repeats.
- **Active program:** the one program the app opens to and tracks the next day
  for.
- **Day:** an ordered list of slots.
- **Slot:** an exercise placed on a day, with a set count and targets for that
  program.
- **Set:** one round of an exercise, logged in a workout. It records whatever
  its exercise's measurement type calls for: reps and an optional weight, a
  duration, or done or not done. A set in a planned workout belongs to a slot; a
  set in a freeform workout belongs only to its exercise.
- **Track:** the progression state a slot points to (see 006).
- **Workout:** one session of logging. It's either open (in progress) or
  submitted (logged). There are three kinds:
  - **Program workout:** a day of the active program.
  - **Off-program day:** a day from any of the user's programs, run without
    affecting that program.
  - **Freeform:** no day and no plan. The user adds exercises and sets as they
    go.

  Program workouts and off-program days are planned workouts: their sets come
  from a day's slots.

- **Log:** what the user actually did. Logged sets record actual values,
  whatever the target was.

## Exercises

1. The user creates an exercise by giving it a name and choosing a measurement
   type.
2. The measurement type applies everywhere the exercise is used.
3. The measurement type can't be changed once the exercise has any logged sets.
   To measure a movement another way, the user creates a new exercise.

## Building a program

4. The user creates a program with a name and an ordered list of days.
5. The user adds exercises to a day as slots, in order.
6. Every slot has a set count of at least 1, whatever its measurement type.
7. Each slot sets its targets in its exercise's unit. Different programs can set
   different targets for the same exercise.
   - Reps: a rep range or an open target (AMRAP), plus a starting weight or no
     weight.
   - Time: a target duration per set, or open-ended (go until failure).
   - Done: no target beyond the set count.
8. Each slot gets its own track by default. The user can make slots in the same
   program share one track (see 006).
9. Each track has a progression rule. v1 has two:
   - **Double progression:** reps exercises with a rep range only. Every set
     uses the same weight and rep target, starting at the bottom of the range.
     Hitting the target on all sets adds 1 rep per set next time. Hitting the
     top of the range on all sets adds weight next time and drops back to the
     bottom of the range.
   - **None:** the target changes only when the user edits it. Used for AMRAP,
     all timed exercises, and all done exercises in v1.

## Programs

10. A user can have several programs saved.
11. Exactly one program is the user's active program. The app opens to it. The
    user can change which program is active at any time.
12. Each program remembers which of its days is next. Switching away and back
    picks up where it left off.

## Workouts

13. A workout starts when the user logs its first set. Opening a day and logging
    nothing leaves no record.
14. The app suggests the active program's next day. The user can run a different
    day of the active program instead. Next day then becomes the day after the
    one they ran.
15. The user ends a workout with "Finish workout." For every kind of workout,
    the app first shows a screen asking the user to confirm, then submits. If
    any planned sets are unlogged, that screen also says so ("End workout? N
    exercises not logged"). Unlogged sets count as skipped, and missed reps and
    missed sets still count.
16. Submitting a workout from the active program moves that program's next day
    forward.
17. There's no pause or save button. Logged sets are already saved (22), so
    leaving the app in any way leaves the workout open. The next time the user
    opens the app, it offers, for any kind of workout and however long it's
    been:
    - **Resume:** pick up at the first unlogged exercise.
    - **Finish:** submit the workout, as in 15.
    - **Discard:** delete the workout and all its logs. The next day doesn't
      change, so the same day is suggested again.
18. If a workout is open and the user picks a different day, changes the active
    program, or starts an off-program workout, the app first asks the user to
    finish or discard the open workout.

## Off-program logging

19. From the main screen, the user can start an off-program workout of either
    kind:
    - **Off-program day:** any day of any of their programs, logged against that
      day's slots and targets.
    - **Freeform:** a blank workout. The user picks an exercise and logs each
      set as actually performed, with no targets or planned sets, and adds sets
      and exercises freely. The user can also create a new exercise (name and
      measurement type) mid-workout.
20. Off-program workouts never change any program's next day and never move a
    track.
21. Off-program workouts follow the same rules as any other workout: they start
    with the first logged set, can be left open and resumed (17), and end with
    Finish or Discard. Finishing a freeform workout asks the user to confirm, as
    in 15, without the unlogged-sets message, since nothing is planned.

## Logging and progression

22. The user logs a set by entering its actual values and confirming it. Each
    confirmed set is saved right away and shows a small saved mark. If a save
    fails, the app shows an error and lets the user retry (002). Values entered
    but not confirmed aren't saved and are lost if the page reloads.
23. A track moves only when every planned set of that exercise hit its target.
    Otherwise the target stays the same next time.
24. When the user finishes an exercise on a track with double progression, the
    app shows the next programmed target (for example, 3×8 @ 50 lb in a 6–8
    range → 3×6 @ 55 lb) and asks the user to confirm it.
25. A confirmed target is saved to the track only when the workout is submitted.
    Discarded workouts never change a track.
26. Only workouts run from the active program move tracks.

## Checked against the example split

Every lift in `current-program.md` fits these requirements:

- Rep-range lifts: reps, with weight, double progression.
- Seated calf raise: reps, AMRAP, rule none, with a track shared across both
  lower days.
- Dips: reps, AMRAP, no weight, rule none.
- Lateral raise machine: reps, double progression, with a track shared across
  both upper days.

The example split has no timed or done exercises yet.

## Open questions

- How much weight double progression adds, and whether it's set per track.
- When a new program uses an exercise, does its track start fresh or carry over
  the last numbers? (from 006)
- At the confirm step (24), can the user edit the suggested target, or only
  accept or skip it?
- Where do confirmed targets (24) wait until the workout is submitted: stored on
  the open workout, or recomputed from its logged sets at submit? (for the data
  model)

## Later

Ideas for future versions live in `docs/later.md`.
