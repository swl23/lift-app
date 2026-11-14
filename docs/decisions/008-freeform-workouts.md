# 8. Freeform workouts and managing unfinished workouts

Date: 2026-11-14\
Status: Accepted

## Context

Off-program workout logging initially meant just running a day from one of the
user's programs without affecting that program (i.e. outside the context of an
active program). But sometimes you might just want to walk into a gym and train
whatever you feel like that day and still be able to track your exercises.

I had also previously planned off-program workouts as only able to be thrown out
or submitted as done, i.e. not paused and returned to, like an in-progress
workout that is part of a program.

## Decision

- Off-program workouts come in two kinds:
  - **Off-program day:** a standalone instance of a day from any of the user's
    programs, logged against its slots and targets.
  - **Freeform:** a blank workout that the user populates as they go, selecting
    exercises a la carte and logging sets as they perform them, without targets
    or planned sets. The user can create a new exercise mid-workout, the same
    way as anywhere else, just defining a name and measurement type and then
    loading it into the active workout that day.
- Exercises performed in an off-program workout cannot change any program's next
  day, nor does it move a track or progress an exercise that is part of a
  program.
- Only one workout can be active at a time, meaning any workout, off-program or
  in-program, follows the same rule whenever it's left unfinished: the next time
  the app opens, the user chooses Resume, Finish, or Discard (see 007).
- A freeform workout starts with its first logged set, like any workout. Zero
  sets leaves no record. Finishing it skips the unlogged-sets confirmation,
  since nothing is planned. Discarding it deletes all its logs.

## Alternatives considered

- **No freeform workouts:** simpler, but the user has to have already built a
  program before they can log anything that doesn't match a saved day, which
  diminishes the flexibility of having standalone workouts.
- **Off-program workouts can't stay open:** a relic of an earlier vision for
  off-program workouts that I had settled on before I thought of different use
  cases for having off-program workout functionality. Also would make a phone
  reloading mid-session force a submit-or-discard choice instead of letting the
  user carry on.

## Consequences

- A workout needs to be of a kind (program, off-program day, or freeform); the
  values of "associated program" and "day in program" are empty for freeform
  workouts.
- A set belongs to a workout and an exercise. Its slot is empty in freeform
  workouts, so the set can't rely on a slot for its exercise or targets.
- Freeform sets have no targets, so they never feed progression.
