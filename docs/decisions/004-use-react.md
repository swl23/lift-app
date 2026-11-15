# 4. Use React for the UI

Date: 2026-11-12\

## Context

Practicing React is one of the main reasons for this project. The app also has
enough interactive state (the current workout, sets being tapped off, editing a
split) that a UI library will help as it grows.

## Decision

Build the user interface with React.

## Alternatives considered

- Plain JavaScript and DOM manipulation: fewer tools, but managing UI state by
  hand gets messy as screens grow, and it doesn't meet my learning goal.
- Other frameworks (Vue, Svelte): capable, but React is the most widely used and
  the one I want experience with.

## Consequences

- Real practice with the most common frontend library.
- Adds a build step and new concepts (components, state, hooks) to learn.
- UI work waits until Phase 3, so the core logic (Phase 2) stays plain
  JavaScript that React can use later.
