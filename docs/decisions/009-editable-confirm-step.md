# 9. Editable confirm step

Date: 2026-11-15\

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
  Bodyweight for bodyweight lifts), and reps move by 1 from 1 to 200. Neither is
  limited to the rep range.
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
- The suggestion adds each track's own weight increment (default 5 lb), so the −
  and + buttons and the rule's increment are separate settings.

## Amendment: typed values and lowest weight (2026-11-17)

- **Typing:** tapping the weight or reps value lets me type one. The − and +
  buttons stay for small changes; typing covers big jumps and odd machine
  weights. This revisits the "free text entry" alternative above: it was
  rejected as the only input, not as an addition to the buttons.
- **Steps:** − and + move exactly 2.5 lb (or 1 rep) from the current value, even
  an odd weight like 46.25 lb. Typing is the way back to a round number.
- **Lowest weight:** each reps exercise has a lowest weight, chosen when it's
  created: Bodyweight, or a weight such as the bar (45 lb). Targets can't go
  below it, so a barbell lift can never be stepped down to Bodyweight or below
  the bar. Only exercises whose lowest weight is Bodyweight can show Bodyweight.
- **Logged sets ignore the floor.** The log records what was actually done
  (006), even with a lighter bar.
- **Alternatives considered:** a fixed 2.5 lb floor plus a separate "can be
  bodyweight" flag (two settings for one idea); a default when the field is left
  blank (any default is wrong for some exercises: 2.5 lb strands a pull-up,
  Bodyweight lets a cable row show "Bodyweight").
- **Consequences:** creating a reps exercise takes one more choice, including
  mid-workout. Raising an exercise's lowest weight doesn't rewrite existing
  targets; the floor applies to the next change.
