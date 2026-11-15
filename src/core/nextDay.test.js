/*
 * Next day: which day the app suggests, and how that changes on submit.
 * Decisions 007, 010; requirements 14, 16, 20.
 *
 * Inputs are table rows, column names unchanged:
 *   program  { id, next_day_id }            next_day_id may be null
 *   days     [{ id, program_id, name, position }]
 *            this program's days; any order; positions may have gaps
 *   workout  { kind, status, day_id }       day_id may be null
 *
 * getSuggestedDay(program, days) -> day | null
 *   The day next_day_id points at. If it's null or matches no day (deleted),
 *   the lowest-position day. null if there are no days.
 *
 * getNextDayId(program, days, workout) -> id | null
 *   After a submitted 'program' workout: the day after the one run (next
 *   higher position), wrapping to the first. Anything else returns
 *   next_day_id unchanged.
 *
 * Choices:
 *   - Wrapping returns the first day's id, not null, so the stored value says
 *     what it means.
 *   - A program workout whose day isn't in the program leaves next_day_id
 *     alone. Shouldn't happen (no edits while a workout is open, 010).
 *   - Pure functions: inputs are never changed.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getSuggestedDay, getNextDayId } from './nextDay.js';

const day = (id, position) => ({ id, program_id: 'p1', name: id, position });

// A four-day split with a position gap (no 3), listed out of order the way
// database rows can arrive.
const upper1 = day('upper-1', 1);
const lower1 = day('lower-1', 2);
const upper2 = day('upper-2', 4);
const lower2 = day('lower-2', 5);
const days = [upper2, lower2, upper1, lower1];

const program = (next_day_id) => ({ id: 'p1', next_day_id });
const workout = (overrides) => ({
  kind: 'program',
  status: 'submitted',
  day_id: 'upper-1',
  ...overrides,
});

describe('getSuggestedDay', () => {
  test('returns the day next_day_id points at', () => {
    assert.deepEqual(getSuggestedDay(program('upper-2'), days), upper2);
  });

  test('falls back to the lowest position when next_day_id is empty', () => {
    assert.deepEqual(getSuggestedDay(program(null), days), upper1);
  });

  test('falls back to the lowest position if the next day was deleted', () => {
    assert.deepEqual(getSuggestedDay(program('deleted'), days), upper1);
  });

  test('finds the lowest position even when it is not 1', () => {
    const remaining = [lower2, upper2, lower1];
    assert.deepEqual(getSuggestedDay(program(null), remaining), lower1);
  });

  test('returns the only day of a one-day program', () => {
    const solo = day('full-body', 1);
    assert.deepEqual(getSuggestedDay(program(null), [solo]), solo);
  });

  test('returns null when the program has no days', () => {
    assert.equal(getSuggestedDay(program(null), []), null);
    assert.equal(getSuggestedDay(program('upper-1'), []), null);
  });
});

describe('getNextDayId', () => {
  test('moves to the day after the one run', () => {
    const next = getNextDayId(program('upper-1'), days, workout());
    assert.equal(next, 'lower-1');
  });

  test('skips over position gaps', () => {
    const run = workout({ day_id: 'lower-1' });
    assert.equal(getNextDayId(program('lower-1'), days, run), 'upper-2');
  });

  test('wraps from the last day to the first', () => {
    const run = workout({ day_id: 'lower-2' });
    assert.equal(getNextDayId(program('lower-2'), days, run), 'upper-1');
  });

  test('follows the day run, not the day suggested (req 14)', () => {
    const run = workout({ day_id: 'upper-2' });
    assert.equal(getNextDayId(program('upper-1'), days, run), 'lower-2');
  });

  test('stays on the only day of a one-day program', () => {
    const solo = day('full-body', 1);
    const run = workout({ day_id: 'full-body' });
    assert.equal(getNextDayId(program(null), [solo], run), 'full-body');
  });

  test('leaves it unchanged after an off-program day (req 20)', () => {
    const run = workout({ kind: 'off_program_day' });
    assert.equal(getNextDayId(program('upper-2'), days, run), 'upper-2');
  });

  test('leaves it unchanged after a freeform workout (req 20)', () => {
    const run = workout({ kind: 'freeform', day_id: null });
    assert.equal(getNextDayId(program('upper-2'), days, run), 'upper-2');
  });

  test('keeps an empty next_day_id empty when unchanged', () => {
    const run = workout({ kind: 'freeform', day_id: null });
    assert.equal(getNextDayId(program(null), days, run), null);
  });

  test('leaves it unchanged while the workout is still open', () => {
    const run = workout({ status: 'open' });
    assert.equal(getNextDayId(program('upper-1'), days, run), 'upper-1');
  });

  test('leaves it unchanged when the day run is not in the program', () => {
    const missing = workout({ day_id: 'deleted' });
    const empty = workout({ day_id: null });
    assert.equal(getNextDayId(program('upper-2'), days, missing), 'upper-2');
    assert.equal(getNextDayId(program('upper-2'), days, empty), 'upper-2');
  });
});

test('neither function changes its inputs', () => {
  const p = program('upper-1');
  const w = workout();
  const before = structuredClone({ p, days, w });
  getSuggestedDay(p, days);
  getNextDayId(p, days, w);
  assert.deepEqual({ p, days, w }, before);
});
