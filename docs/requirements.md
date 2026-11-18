# Requirements (v1)

Status: Phase 1, complete. Describes what v1 must do, not how it's built. The
data model (`data-model.md`) satisfies everything here.

Related records: 002, 003, 005, 006, 007, 008, 009, 010, 011.

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
   type. A reps exercise also needs a lowest weight: Bodyweight, or a weight
   such as the bar's. There's no default; the user picks one. Targets can't go
   below it; logged sets can, so the log records what was actually done.
2. The measurement type applies everywhere the exercise is used.
3. The measurement type can't be changed once the exercise has any logged sets.
   To measure a movement another way, the user creates a new exercise.

## Building a program

4. The user creates a program with a name and an ordered list of days.
5. The user adds exercises to a day as slots, in order.
6. Every slot has a set count of at least 1, whatever its measurement type.
7. Each slot sets its targets in its exercise's unit. Different programs can set
   different targets for the same exercise.
   - Reps: a rep range or an open target (AMRAP), plus a starting weight, or no
     weight if the exercise's lowest weight is Bodyweight.
   - Time: a target duration per set, or open-ended (go until failure).
   - Done: no target beyond the set count.
8. Each slot gets its own track by default. The user can make slots in the same
   program share one track (see 006). When a new track is created for an
   exercise that's already on another track, the new one is pre-filled from the
   track most recently moved by a submitted workout: its target, rep range and
   increment. If no track exists for the exercise (it's new, or its programs
   were deleted) but it has logged sets, the new track is pre-filled with the
   weight and reps of its most recent set in a submitted workout. An exercise
   with neither starts with empty values. Either way the increment defaults to
   5 lb, and the user can change everything before saving the program.
9. Each track has a progression rule. v1 has three:
   - **Single progression:** reps exercises with a fixed rep target and no
     range. Hitting the target on all sets adds the track's weight increment
     next time; the rep target stays the same.
   - **Double progression:** reps exercises with a rep range only. Every set
     uses the same weight and rep target, starting at the bottom of the range.
     Hitting the target on all sets adds 1 rep per set next time. Hitting the
     top of the range on all sets adds the track's weight increment next time
     and drops back to the bottom of the range. Each track has its own
     increment, set when the user adds the exercise to a program. It defaults to
     5 lb.
   - **None:** the target changes only when the user edits it. Used for AMRAP,
     all timed exercises, and all done exercises in v1.

## Programs

10. A user can have several programs saved, and can edit or delete any of
    them, including their days and slots. Deleting never removes logged sets:
    past workouts keep their exercises and sets, but lose their link to the
    deleted program, day or slot (010).
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
    program, starts an off-program workout, or edits a program, the app first
    asks the user to finish or discard the open workout.

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
23. When the last planned set of an exercise in a program workout is logged, the
    app shows a confirm screen with next time's target. If every set hit its
    target, the suggestion follows the track's rule. Otherwise it's the same
    target again. A short message says which ("Nice, you did all your sets.
    Confirm progression for next time." or "You didn't complete all your sets.
    Try this again next time."), and any values that changed are briefly
    highlighted. Timed and done exercises have no confirm screen in v1. A set
    hits its target when its reps and weight are at least the target; an empty
    target (AMRAP or bodyweight) accepts any value.
24. The confirm screen has a weight row and a reps row, each with − and +
    buttons, and an OK button. The user can change either value before tapping
    OK (see 009):
    - Tapping either value lets the user type one. The buttons change it by
      2.5 lb or 1 rep from whatever it is now.
    - Weight can't go below the exercise's lowest weight (1). If that's
      Bodyweight, the row shows "Bodyweight," + adds weight, and − from 2.5 lb
      or less returns to Bodyweight. There's no upper limit.
    - Reps go from 1 to 200, regardless of the rep range.
    - AMRAP lifts show only the weight row.
    - The set count isn't on this screen. It's changed in the program editor.
25. Tapping OK saves the values with the open workout. They're written to the
    track only when the workout is submitted. Discarding a workout never changes
    a track.
26. An exercise with all its sets logged can't stay unconfirmed. If the user
    leaves before tapping OK, the screen comes back on Resume, and Finish
    workout shows it before submitting.
27. Only workouts run from the active program move tracks.

## Checked against the example split

Every lift in `current-program.md` fits these requirements:

- Rep-range lifts: reps, with weight, double progression.
- Seated calf raise: reps, AMRAP, rule none, with a track shared across both
  lower days.
- Dips: reps, AMRAP, no weight, rule none.
- Lateral raise machine: reps, double progression, with a track shared across
  both upper days.

The example split has no timed or done exercises yet.

## Later

Ideas for future versions live in `docs/later.md`.
