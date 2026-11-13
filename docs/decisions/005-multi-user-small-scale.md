# 5. Multiple users with accounts, at small scale

Date: 2026-11-12\
Status: Accepted

## Context

I'm the first user, but I'd like friends and family to use the app too. I also
want practice building a real multi-user app end to end. The audience will stay
small, so large-scale infrastructure isn't needed.

## Decision

Design for multiple users with their own accounts and private data from the
start, sized for a small group.

## Alternatives considered

- Single user only: much simpler at first, but adding accounts later means
  reworking the data model and every query.
- Designing for large scale: adds complexity (caching, sharding, etc.) the app
  will never need.

## Consequences

- The data model in Phase 1 must give every program, session, and logged set an
  owner.
- Phase 4 needs authentication and rules so users only see their own data.
- More work up front than a single-user app, but it's the learning I'm after.
