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
  where logged sets are sent before writing them to database later.

## Consequences

- Highly increased risk of data loss.
- Potential data collisions when multiple devices access one account.
