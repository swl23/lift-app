# Devlog

## 2026-11-12: CLAUDE.md and backfilled decisions

- Added CLAUDE.md with how I want Claude to help, project conventions, and when
  to suggest decision records and devlog entries.
- Moved the remaining working agreement from the original planning doc into
  CLAUDE.md (per-phase workflow, free tiers by default, TypeScript check-in at
  the end of Phase 2), so the repo is now the single source of truth.
- Backfilled decision records for earlier choices: 003 (installable web app),
  004 (React), and 005 (multi-user at small scale).

Next: Phase 1, starting with my current upper/lower split as real data.

## 2026-11-12: Phase 0 cleanup

- Added `.gitignore` (node_modules, .DS_Store, .env files).
- Matched the editor ruler to Prettier's 80-column wrap.
- Fixed the date/status lines in decision record 001.
- Added decision record 002: no offline sync. Revised its alternatives and
  consequences to put the data-collision risk where it belongs.
- Added a VS Code snippet for new decision records.
- Skipped a decision record for "one app folder." It's too small to need one.

Phase 0 complete. Next: Phase 1, requirements and data model.

## 2026-11-12: Planning and repo setup

- Developed project plan with Claude: phases, scope, key decisions.
- Core data modeling idea: keep program (the plan), log (what I did), and
  exercise (the movement) separate, so one-off lifts don't disrupt the split.
- Decided: plain JS, one app folder, no offline sync.
- Set up repo, README, first decision record, and development log.

Next: use my own current workout split and progression to create data model and
map core application logic.
