# 2. No Offline Sync.

Date: 2026-11-12\
Status: Accepted (medium confidence)

## Context

Claude suggested integrating offline sync capabilities to the app to manage
situations where a user has poor cell service or a spotty internet connection.
This is a feature I could see myself adding once I'm more comfortable with the
architecture, but because I will be the only user to start with, I will hold off
(at least for now). Will reevaluate after using the app for a while.

## Decision

Not going to integrate offline sync.

## Alternatives considered

- A client-side queue, initiated at workout start, that is the default place
  where logged sets are sent before writing them to database later. Rejected for
  now: more moving parts to build and debug. Also adds headache of managing
  conflicting writes from two devices using one account.

## Consequences

- Simpler architecture with a single source of truth (database).
- Sets logged without a connection will fail to save. Will need to develop error
  system and an easy way to retry so sets aren't lost.
- Potential data collisions when multiple devices access one account.
