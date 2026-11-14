# 7. How the next day is determined

Date: 2026-11-13\
Status: Accepted

## Context

The app opens to the user's active program and suggests which day to run next
based on which day they submitted last. That said, users sometimes have more
information about an injury or a time constraint or a piece of broken equipment
in the gym, all of which could mean they want to do a different day in their
program that day. Conversely, if a user does proceed with the app's expected
"next day," it's important to know that interruptions happen and minds change.
The app needs rules to govern when a day counts as done and what's next, and
these rules need to take into account the question not just of "day progression"
in the split but also the progression of exercises that were completed before a
workout was interrupted or ended early.

## Decision

- A workout is either **open** or **submitted**. It starts when the user logs
  their first set. Opening a day and logging nothing leaves no record.
- Each set is saved the moment the user confirms it. There's no Pause button and
  no manual save button: leaving the app in any way leaves the workout open,
  with its logged sets already saved.
- The user ends a workout with **Finish workout**. If any planned sets are
  unlogged, the app asks the user to confirm first. Finishing submits the
  workout. Unlogged sets count as skipped, and missed reps or sets still count.
- Submitting a workout from the active program moves that program's next day
  forward. Each program keeps its own next day, so switching from Program 1 to
  Program 2 and then back to Program 1 will always pick up where the user left
  off.
- When the user opens the app with an open workout, they choose **Resume**,
  **Finish** (submit, as above), or **Discard** (delete its logs; the next day
  stays where it was, so the same day is suggested again). There's no time
  limit.
- The user can manually choose to run any day of the active program. Next day
  then becomes the day after the one that was selected.
- Starting something else while a workout is open (a different day, another
  active program, an off-program workout) first makes the user finish or discard
  the open one.
- Off-program workouts never change any program's next day and never move a
  track. They follow the same open, finish, and discard rules as any workout
  (see 008).
- Track changes are saved only when a workout is submitted. Discarding a workout
  never changes a track.

## Alternatives considered

- **Move to the next day as soon as any set is logged:** one less tap, but a set
  logged by mistake uses up the day, and a workout has no clear end.
- **Always resume an unfinished day:** simple, but it traps the user in a day
  they might've given up on and makes a long gap awkward to reconcile.
- **Keep the suggested day in place when the user runs a different one:** keeps
  the rotation fixed, but isn't how people actually train (could incidentally
  stack like days next to one another). If users swap days, they want the
  rotation to follow what they did.
- **Require a Pause button to keep an unfinished workout:** phones reload pages
  without warning, so a forgotten tap silently loses training.
- **Save per exercise, plus a manual Save button:** a reload loses a whole
  exercise, a partly done exercise never triggers a save, and two save paths are
  confusing.
- **Offer Restart, and limit choices after 7 days (this record's first draft):**
  Restart did the same job as Discard followed by picking the day again, and the
  7-day cutoff added an exception to an otherwise single rule.

## Consequences

- The data model needs a workout record with a status (open or submitted), and a
  "next day" pointer stored on each program.
- Every confirmed set is its own database write. A failed save needs a visible
  error and a retry (002).
- Confirmed progression targets have to be held until the workout is submitted,
  not written to the track the moment the user confirms them.
- Discarding a workout deletes its logs, so a discarded workout leaves no
  history.
