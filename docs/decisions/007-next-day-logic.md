# 7. How "next day" pointer is determined

Date: 2026-11-13\
Status: Proposed

## Context

The app opens to user's active program and suggests which day to run next based
on which day they submitted last. That said, users sometimes have more
information about an injury or a time constraint or a piece of broken equipment
in the gym, all of which could mean they want to do a different day in their
program that day. Conversely, if a user does proceed with the app's expected
"next day," it's important to know that interruptions happen and minds change.
The app needs rules to govern when a day counts as done and what's next, and
these rules need to take into account the question not just of "day progression"
in the split but also the progression of exercises that were completed before a
workout was interrupted or ended early.

## Decision

- A workout is either **open** or **submitted**. It starts when a user logs
  their first set. Opening a day and logging nothing leaves no record.
- User ends a workout with **Finish workout**. If every exercise is logged or
  marked skipped, the workout is submitted. Missed reps or sets still count.
- Submitting a workout from the active program moves that program's next day
  forward. Each program keeps its own next day, so switching from Program 1 to
  Program 2 and then back to Program 1 will always pick up where user left off.
- If user stops workout early through a **Pause workout** functionality and
  comes back to app within 7 days, user chooses **Resume**, **Restart** (that
  day in split), or **Move on** (next day moves forward, with user first
  choosing to **Submit** or **Discard** the partial day).
- After 7 or more days, the only choices a user gets for a paused/in-progress
  workout are Restart, or Move on and Submit.
- User can manually choose to run any day of the active program. Next day then
  becomes the day after the one that was selected.
- Starting something else while a workout is open (a different day, another
  active program, an off-program workout) first makes user submit or discard the
  open one.
- Off-program workouts never stay open, never change any program's next day, and
  never move a track. User basically only has the option to submit an
  off-program workout.
- Track changes are saved only when a workout is submitted. Restarting or
  discarding a workout never changes a track.

## Alternatives considered

- **Move to the next day as soon as any set is logged:** one less tap, but a set
  logged by mistake uses up the day, and a workout has no clear end.
- **Always resume an unfinished day:** simple, but it traps user in a day they
  might've given up on and makes a long gap awkward to reconcile.
- **Keep the suggested day in place when I run a different one:** keeps the
  rotation fixed, but isn't how people actually train (could incidentally stack
  like days next to one another). If users swap days, they want the rotation to
  follow what they did.

## Consequences

- The data model needs a workout record with a status (open or submitted), and a
  "next day" pointer stored on each program.
- Confirmed progression targets have to be held until the workout is submitted,
  not written to the track the moment I confirm them.
- Discarding a workout or Restarting a workout both delete logs, so a discarded
  workout leaves no history.
- The 7-day cutoff for users being able to resume a workout is fixed for now but
  could become a setting later.
