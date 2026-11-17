/*
 * Confirm screen rules: the − / + buttons, typed values, and which exercises
 * still need confirming. Decision 009 (and its amendment); requirements 1,
 * 23, 24, 26.
 *
 * Weights are numbers in lb; null = Bodyweight, as in the tables.
 * lowest_weight_lb is the exercise's floor for targets: a number, or null when
 * the exercise's lowest weight is Bodyweight.
 *
 * stepWeight(weight_lb, direction, lowest_weight_lb) -> weight_lb
 *   direction "up" or "down". Moves exactly 2.5 lb from the current value,
 *   even an odd one (46.25 -> 48.75).
 *   - Up: Bodyweight -> 2.5. No upper limit, except the database's: a step
 *     that would reach 10,000 lb or more does nothing.
 *   - Down, lowest weight is a number: stops at the floor (47 -> 45 on a
 *     45 lb bar, never Bodyweight). A value already below the floor (the
 *     floor was raised later) doesn't move down.
 *   - Down, lowest weight is Bodyweight: from 2.5 lb or less -> Bodyweight.
 *     Bodyweight stays Bodyweight.
 *
 * stepReps(reps, direction) -> reps
 *   Moves 1, between 1 and 200, ignoring the rep range.
 *
 * parseWeight(text, lowest_weight_lb, previous) -> weight_lb
 *   A typed weight. Spaces around it are ignored. Accepted: a number with at
 *   most 2 decimal places (".5" is 0.5), above 0, under 10,000, and at least
 *   the floor when the floor is a number. Anything else returns `previous`
 *   unchanged, including an empty entry. Bodyweight is reached with −, not
 *   by typing.
 *
 * parseReps(text, previous) -> reps
 *   A typed whole number from 1 to 200, spaces ignored. Anything else returns
 *   `previous`.
 *
 * exercisesToConfirm(workout, workoutExercises) -> [workout exercise id]
 *   The confirm screens to show on Resume and before Finish (req 26), in
 *   workout position order.
 *   workout           { kind }  'program', 'off_program_day' or 'freeform'
 *   workoutExercises  [{ id, position, measurement_type, confirmed_at,
 *                        set_count, sets }], any order
 *                     set_count is the slot's (null when there's no slot);
 *                     sets is the exercise's logged sets
 *   An exercise needs confirming when: the workout is a program workout,
 *   it's a reps exercise, it has a slot, at least set_count sets are logged,
 *   and confirmed_at is empty.
 *
 * Choices:
 *   - Results are rounded to 2 decimal places, so floating point drift
 *     (1.07 + 2.5 = 3.5700000000000003) never reaches the screen or the
 *     database's numeric(6, 2).
 *   - The floor limits targets only. Logged sets aren't checked here (009).
 *   - A partly logged exercise gets no confirm screen; its track stays as is.
 *   - Pure functions: inputs are never changed.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  stepWeight,
  stepReps,
  parseWeight,
  parseReps,
  exercisesToConfirm,
} from "./confirmScreen.js";

const BAR = 45; // barbell lift: lowest weight is the bar
const BODYWEIGHT = null; // dips: lowest weight is Bodyweight

describe("stepWeight: up", () => {
  test("adds 2.5 lb", () => {
    assert.equal(stepWeight(135, "up", BAR), 137.5);
  });

  test("adds exactly 2.5 to an odd weight", () => {
    assert.equal(stepWeight(46.25, "up", BAR), 48.75);
  });

  test("Bodyweight goes to 2.5 lb", () => {
    assert.equal(stepWeight(null, "up", BODYWEIGHT), 2.5);
  });

  test("a value below a raised floor still goes up by 2.5", () => {
    assert.equal(stepWeight(40, "up", BAR), 42.5);
  });

  test("does nothing at the database's limit", () => {
    assert.equal(stepWeight(9998, "up", BAR), 9998);
  });

  test("rounds away floating point drift", () => {
    assert.equal(stepWeight(1.07, "up", BODYWEIGHT), 3.57);
  });
});

describe("stepWeight: down with a weight floor", () => {
  test("takes off 2.5 lb", () => {
    assert.equal(stepWeight(135, "down", BAR), 132.5);
  });

  test("takes exactly 2.5 off an odd weight", () => {
    assert.equal(stepWeight(48.75, "down", BAR), 46.25);
  });

  test("stops at the floor instead of going under it", () => {
    assert.equal(stepWeight(46, "down", BAR), 45);
  });

  test("stays at the floor", () => {
    assert.equal(stepWeight(45, "down", BAR), 45);
  });

  test("a value already below a raised floor doesn't move down", () => {
    assert.equal(stepWeight(40, "down", BAR), 40);
  });

  test("a small floor works the same way", () => {
    // Dumbbell curl with a 2.5 lb floor: never Bodyweight.
    assert.equal(stepWeight(2.5, "down", 2.5), 2.5);
  });

  test("rounds away floating point drift", () => {
    assert.equal(stepWeight(3.57, "down", 1), 1.07);
  });
});

describe("stepWeight: down when the lowest weight is Bodyweight", () => {
  test("takes off 2.5 lb above 2.5", () => {
    assert.equal(stepWeight(10, "down", BODYWEIGHT), 7.5);
  });

  test("an odd weight can land under 2.5", () => {
    assert.equal(stepWeight(3, "down", BODYWEIGHT), 0.5);
  });

  test("2.5 lb goes to Bodyweight", () => {
    assert.equal(stepWeight(2.5, "down", BODYWEIGHT), null);
  });

  test("under 2.5 lb goes to Bodyweight", () => {
    assert.equal(stepWeight(1, "down", BODYWEIGHT), null);
  });

  test("Bodyweight stays Bodyweight", () => {
    assert.equal(stepWeight(null, "down", BODYWEIGHT), null);
  });
});

describe("stepReps", () => {
  test("adds and takes off one rep", () => {
    assert.equal(stepReps(8, "up"), 9);
    assert.equal(stepReps(8, "down"), 7);
  });

  test("stops at 1", () => {
    assert.equal(stepReps(1, "down"), 1);
  });

  test("stops at 200", () => {
    assert.equal(stepReps(200, "up"), 200);
  });
});

describe("parseWeight", () => {
  test("accepts a whole number", () => {
    assert.equal(parseWeight("135", BAR, 100), 135);
  });

  test("accepts up to 2 decimal places", () => {
    assert.equal(parseWeight("46.25", BAR, 100), 46.25);
  });

  test("ignores spaces around the number", () => {
    assert.equal(parseWeight(" 47.5 ", BAR, 100), 47.5);
  });

  test("accepts a leading decimal point on a Bodyweight exercise", () => {
    assert.equal(parseWeight(".5", BODYWEIGHT, null), 0.5);
  });

  test("accepts the floor itself", () => {
    assert.equal(parseWeight("45", BAR, 100), 45);
  });

  test("accepts the largest weight the database holds", () => {
    assert.equal(parseWeight("9999.99", BAR, 100), 9999.99);
  });

  test("accepts any weight above 0 when the floor is Bodyweight", () => {
    assert.equal(parseWeight("1", BODYWEIGHT, null), 1);
  });

  test("rejects a weight below the floor", () => {
    assert.equal(parseWeight("30", BAR, 100), 100);
  });

  test("rejects 0", () => {
    assert.equal(parseWeight("0", BODYWEIGHT, 10), 10);
  });

  test("rejects 10,000 lb or more", () => {
    assert.equal(parseWeight("10000", BAR, 100), 100);
  });

  test("rejects more than 2 decimal places", () => {
    assert.equal(parseWeight("46.255", BAR, 100), 100);
  });

  test("rejects anything that isn't a plain number", () => {
    for (const text of ["", "  ", "abc", "-5", "1e3", "45lb", "4 5", "."]) {
      assert.equal(parseWeight(text, BAR, 100), 100, `"${text}"`);
    }
  });

  test("returns Bodyweight when that was the previous value", () => {
    assert.equal(parseWeight("", BODYWEIGHT, null), null);
  });
});

describe("parseReps", () => {
  test("accepts a whole number from 1 to 200", () => {
    assert.equal(parseReps("1", 8), 1);
    assert.equal(parseReps("15", 8), 15);
    assert.equal(parseReps("200", 8), 200);
  });

  test("ignores spaces around the number", () => {
    assert.equal(parseReps(" 12 ", 8), 12);
  });

  test("rejects anything else", () => {
    for (const text of ["", "0", "201", "8.5", "-3", "1e1", "abc", "8 reps"]) {
      assert.equal(parseReps(text, 8), 8, `"${text}"`);
    }
  });
});

describe("exercisesToConfirm", () => {
  const program = { kind: "program" };

  // A reps exercise with 3 planned sets. Pass fields to change, e.g.
  // exercise("a", 1, { confirmed_at: "2026-11-17T10:00:00Z" }).
  function exercise(id, position, overrides) {
    const defaults = {
      id: id,
      position: position,
      measurement_type: "reps",
      confirmed_at: null,
      set_count: 3,
      sets: [{}, {}, {}],
    };
    return { ...defaults, ...overrides };
  }

  test("a fully logged, unconfirmed exercise needs confirming", () => {
    assert.deepEqual(exercisesToConfirm(program, [exercise("a", 1)]), ["a"]);
  });

  test("a confirmed exercise doesn't", () => {
    const done = exercise("a", 1, { confirmed_at: "2026-11-17T10:00:00Z" });
    assert.deepEqual(exercisesToConfirm(program, [done]), []);
  });

  test("a partly logged exercise doesn't", () => {
    const partial = exercise("a", 1, { sets: [{}, {}] });
    assert.deepEqual(exercisesToConfirm(program, [partial]), []);
  });

  test("an exercise with no sets logged doesn't", () => {
    assert.deepEqual(
      exercisesToConfirm(program, [exercise("a", 1, { sets: [] })]),
      [],
    );
  });

  test("extra sets beyond the plan still count as fully logged", () => {
    const extra = exercise("a", 1, { sets: [{}, {}, {}, {}] });
    assert.deepEqual(exercisesToConfirm(program, [extra]), ["a"]);
  });

  test("timed and done exercises never need confirming", () => {
    const timed = exercise("a", 1, { measurement_type: "time" });
    const done = exercise("b", 2, { measurement_type: "done" });
    assert.deepEqual(exercisesToConfirm(program, [timed, done]), []);
  });

  test("an exercise without a slot doesn't", () => {
    const noSlot = exercise("a", 1, { set_count: null });
    assert.deepEqual(exercisesToConfirm(program, [noSlot]), []);
  });

  test("off-program and freeform workouts have no confirm screens", () => {
    for (const kind of ["off_program_day", "freeform"]) {
      assert.deepEqual(exercisesToConfirm({ kind }, [exercise("a", 1)]), []);
    }
  });

  test("returns them in workout position order", () => {
    const list = [exercise("c", 3), exercise("a", 1), exercise("b", 2)];
    assert.deepEqual(exercisesToConfirm(program, list), ["a", "b", "c"]);
  });

  test("returns only the ones that need it from a mixed workout", () => {
    const list = [
      exercise("a", 1, { confirmed_at: "2026-11-17T10:00:00Z" }),
      exercise("b", 2),
      exercise("c", 3, { sets: [{}] }),
      exercise("d", 4, { measurement_type: "time" }),
      exercise("e", 5),
    ];
    assert.deepEqual(exercisesToConfirm(program, list), ["b", "e"]);
  });

  test("an empty workout has nothing to confirm", () => {
    assert.deepEqual(exercisesToConfirm(program, []), []);
  });
});

test("does not change its inputs", () => {
  const list = [
    { id: "b", position: 2, measurement_type: "reps", confirmed_at: null },
    { id: "a", position: 1, measurement_type: "reps", confirmed_at: null },
  ].map((e) => ({ ...e, set_count: 1, sets: [{}] }));
  const before = structuredClone(list);
  exercisesToConfirm({ kind: "program" }, list);
  assert.deepEqual(list, before);
});
