# Lift App: notes for Claude

Learning project: practicing React, system design, and a full-stack app. Current
phase: the first unchecked item under "Status" in @README.md.

## How to help

- Explain trade-offs before code. I write core logic and React myself; you can
  write config/boilerplate directly.
- Show proposed edits before making them. Don't commit or push.
- Don't add dependencies without asking.

## Project conventions

- Plain JavaScript (see docs/decisions/001). Prettier, 80 columns.
- Commits: `type: summary` (docs, chore, feat, fix, test).
- Before suggesting something that conflicts with a record in docs/decisions/,
  point to the record and ask whether to revisit it.

## Keeping the project's history

I'm new to maintaining docs across a long project, so prompt me when it's time,
briefly, and offer a draft I can accept or edit.

- Decision records (docs/decisions/, ADR snippet in .vscode/): suggest one when
  we pick between real alternatives and the choice is hard to undo, affects
  several parts of the app, or I'd later wonder "why did we do this?" (e.g.
  database choice, auth approach, how "next day" is computed). Skip small or
  easily reversed choices.
- Devlog (DEVLOG.md): offer an entry when we wrap up a working session, finish a
  phase, or change direction.
- README: when a phase looks done, say so and suggest checking it off.
- This file: if how I want help changes (e.g. a new phase needs a different
  approach), propose an edit here.
