# 9. Editable confirm step

Date: 2026-11-15\
Status: Proposed

## Context

When an exercise is finished, the app suggests next time's target based on the
track's rule (006). The first version of the requirements only let the user
accept that suggestion. But I often know more than the rule does: a lift felt
easy and I want more weight now, or I missed reps and want to drop the weight
for a session. If the app can only apply its own rule, I'd have to go edit the
program afterward, which I'd probably forget to do.

## Decision

- After the last planned set of an exercise in a program workout, the app shows
  a confirm screen with next time's target, pre-filled from the track's rule if
  every set hit its target, or the same target again if not. A short message
  says which, and changed values are briefly highlighted.
- The screen has a weight row and a reps row, each with − and + buttons, and an
  OK button. Weight moves in 2.5 lb steps (stopping at 2.5 lb, or switching to
  Bodyweight for bodyweight lifts), and reps move by 1 from 1 to 200. Neither
  is limited to the rep range.
- AMRAP lifts show only the weight row. Timed and done exercises have no confirm
  screen in v1. The set count isn't on this screen; it belongs in the program
  editor.
- The screen also appears after a missed set, so I can lower the weight on
  purpose. A track can change after a miss, but only because I chose it.
- There's no Skip button. If I leave before tapping OK, the screen comes back on
  Resume, and Finish workout shows it before submitting.
- OK saves the values with the open workout. They're written to the track only
  when the workout is submitted (007), and discarding a workout never changes a
  track.

## Alternatives considered

- **Accept or skip only:** simpler, and the app could work out the next target
  from logged sets at submit with nothing extra stored. But any change from the
  rule would mean a trip to the program editor.
- **Free text entry for weight and reps:** fastest for big jumps, but typing on
  a phone between sets is slow and error-prone. Buttons are easier one-handed.
- **+/− weight steps equal to the track's increment:** fewer taps for normal
  progress, but it can't reach weights like 42.5 lb on machines with smaller
  plates.
- **A Skip button, or leaving the screen with nothing saved:** quick, but easy
  to skip by accident and quietly lose a progression.

## Consequences

- The data model has to store the confirmed weight and reps on the open workout
  (per exercise in the workout) until submit. They can't be recomputed from the
  logged sets, because I may have edited them.
- "A track moves only when every set hit its target" is no longer true. The
  suggestion follows that rule, but what I confirm is what's saved.
- Finish workout gains a step: any exercise that's fully logged but unconfirmed
  shows its confirm screen first.
- The suggestion adds each track's own weight increment (default 5 lb), so
  the − and + buttons and the rule's increment are separate settings.
