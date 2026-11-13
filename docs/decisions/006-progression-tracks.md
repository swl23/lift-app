# 6. Progression state lives in tracks

Date: 2026-11-12\
Status: Accepted

## Context

The app suggests each lift's next target (weight and reps) based on how the last
session went. It has to store that current target somewhere. Users will build
their own programs, so the model has to handle these cases:

- The same exercise appears on more than one day of a program, and the user
  wants those days to share one progression. For example, if an exercise is done
  on both upper body days, the second day picks up where the first left off.
- The same exercise appears in more than one program, and the user wants each
  program's progress kept separate.
- The same exercise appears twice in one program at different schemes, for
  example heavy on one day and light on another.

## Decision

Store progression state in a **track**. A track holds the current target for one
progression. Each planned exercise in a program points to a track, and the user
decides which slots share one:

- By default, each planned exercise gets its own track.
- Several planned exercises can point to the same track and progress together.
- Progress on one track never changes another, even for the same exercise.

## Alternatives considered

- **State on the exercise:** one current target per exercise, everywhere it's
  used. Simplest, but a second program or a light day would overwrite the main
  progression.
- **State on the planned exercise (the slot):** each day's slot progresses on
  its own. This handles separate programs, but the same exercise on two days
  can't share a progression.

## Consequences

- The data model gets one more concept than "exercise plus plan." It's a little
  more to build and explain, but it covers all three cases above.
- Logging a set and progressing a track are separate events. The log always
  records what was actually done, and the track changes only when progression
  applies.
- Building a program needs a way to link slots to an existing track. That's a
  Phase 3 screen question.
- Still open:
  - When a new program uses an exercise, does its track start fresh or carry
    over the user's last numbers?
  - Can a one-off lift ever affect a track?
