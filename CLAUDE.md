# Lift App: notes for Claude

Learning project: practicing React, system design, and a full-stack app. Current
phase: the first unchecked item under "Status" in @README.md.

## How to help

- Each phase runs: discuss → record any decisions → Claude writes a short spec
  (inputs, outputs, edge cases) and the test file → I write code until the tests
  pass → Claude reviews it like a pull request → I commit → checkpoint before
  the next phase.
- Ask questions before starting a new phase. Use cases are a good way to resolve
  questions.
- Explain trade-offs before code. I write core logic and React myself; you can
  write config/boilerplate directly. Exception: you write complex pieces like
  auth and deployment, and explain them line by line.
- Free tiers by default. Before suggesting any paid service, give me a short
  written pros/cons case.
- Show proposed edits before making them. Don't commit or push unless I ask.
  When I do: small doc changes go straight to main; anything else goes on a new
  branch with a PR.
- Don't add dependencies without asking.
- Database design: I have little relational database experience. Research best
  practices and make the database calls yourself. Ask me only questions that
  change the user experience, framed as a use case and its effect on usability,
  not column or relationship details.

## Project conventions

- Plain JavaScript (see docs/decisions/001). At the end of Phase 2, raise
  whether TypeScript is worth adopting. Prettier, 80 columns.
- Tests: `node:test` via `npm test`. Specs live in `docs/specs/`.
- Commits: `type: summary` (refer to commit types articulated here:
  https://www.conventionalcommits.org/en/v1.0.0/).
- Periodically review decision records and requirements doc to check if there
  are contradictory/outdated issues.

## Keeping the project's history

I'm new to maintaining docs across a long project, so prompt me when it's time,
briefly, and offer a draft I can accept or edit.

- Decision records (docs/decisions/, ADR snippet in .vscode/): suggest one when
  we pick between real alternatives and the choice is hard to undo, affects
  several parts of the app, or I'd later wonder "why did we do this?" (e.g.
  database choice, auth approach, how "next day" is computed). Skip small or
  easily reversed choices.
- Later (docs/later.md): when we defer a feature, offer an entry for it.
- README: when a phase looks done, say so and suggest checking it off.
- STATUS.md: read it at the start of each chat instead of the whole repo. Keep
  it current without asking: whenever you make a commit that changes the phase,
  next step, latest decision record or open items, update STATUS.md in the same
  commit.
- This file: if how I want help changes (e.g. a new phase needs a different
  approach), propose an edit here.
