/*
 * Workout lifecycle: start, resume, finish, discard, submit.
 * Decisions 007, 008, 009; requirements 13, 15–17, 21, 25–27.
 *
 * Inputs are table rows, column names unchanged:
 *   workout  { kind, status, day_id }
 *   slots    [{ id, position, set_count }]  the workout day's slots, any order
 *            ([] for freeform)
 *   workoutExercises
 *            [{ id, slot_id, track_id, position, measurement_type,
 *               set_count, confirmed_at, next_reps, next_weight_lb, sets }]
 *            any order. The same shape as exercisesToConfirm's input, plus
 *            slot_id, track_id and the confirmed next values. slot_id,
 *            track_id and set_count are null in freeform.
 *            sets: [{ set_number, logged_at }] (logged_at is a Date)
 *   program  { id, next_day_id }  the active program, or null if none
 *   days     [{ id, position }]   the active program's days
 *
 * startWorkout(kind, day_id) -> { kind, status: "open", day_id }
 *   The row to insert with the first logged set (req 13). Throws when a
 *   'program' or 'off_program_day' workout has no day, a 'freeform' workout
 *   has one, or the kind is unknown.
 *
 * unfinishedSlots(workout, slots, workoutExercises) -> [slot id]
 *   Slots with fewer sets logged than set_count, including slots with no
 *   sets at all, in slot position order. Always [] for freeform.
 *
 * resumeSlotId(workout, slots, workoutExercises) -> slot id | null
 *   Where Resume lands in a planned workout: the first unfinished slot. null
 *   when every slot is finished, or for freeform.
 *
 * lastLoggedExerciseId(workoutExercises) -> workout exercise id | null
 *   Where Resume lands in a freeform workout: the exercise holding the most
 *   recently logged set. null if nothing is logged.
 *
 * finishMessage(unfinishedCount) -> text
 *   0: "End workout?"  1: "End workout? 1 exercise unfinished"
 *   2+: "End workout? N exercises unfinished"
 *
 * discardMessage(workoutExercises) -> text
 *   "Delete this workout and its N sets?" ("1 set" for one).
 *
 * submitWorkout(workout, program, days, workoutExercises, now)
 *   -> { workout, program_update, track_updates }
 *   workout         the input workout with status "submitted" and
 *                   submitted_at = now
 *   program_update  { id, next_day_id } when next day moves (program
 *                   workouts only, via getNextDayId), otherwise null
 *   track_updates   program workouts only: one { id, target_reps, weight_lb }
 *                   per confirmed exercise, copied from next_reps and
 *                   next_weight_lb, in workout position order. [] otherwise.
 *   Throws when the workout isn't open, or exercisesToConfirm still lists
 *   anything (req 26: the confirm screens come before submitting).
 *
 * Choices:
 *   - A workout exercise row is created when its first set is logged, so an
 *     untouched slot has no row. That's why the plan comes from slots.
 *   - Unfinished counts every measurement type, not only reps.
 *   - Logging more sets than planned still counts as finished.
 *   - An unconfirmed exercise (partly logged) leaves its track alone.
 *   - Off-program-day workouts get the unfinished message, since they have a
 *     plan, but never move next day or tracks (008, req 27).
 *   - Pure functions: inputs are never changed.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  startWorkout,
  unfinishedSlots,
  resumeSlotId,
  lastLoggedExerciseId,
  finishMessage,
  discardMessage,
  submitWorkout,
} from "./workout.js";

// Upper 1: bench, rows, curls, 3 sets each. Listed out of order, the way
// database rows can arrive.
const bench = { id: "bench", position: 1, set_count: 3 };
const rows = { id: "rows", position: 2, set_count: 3 };
const curls = { id: "curls", position: 3, set_count: 3 };
const slots = [curls, bench, rows];

const days = [
  { id: "upper-1", position: 1 },
  { id: "lower-1", position: 2 },
];
const program = { id: "p1", next_day_id: "upper-1" };

function workout(overrides) {
  return { kind: "program", status: "open", day_id: "upper-1", ...overrides };
}

// `count` logged sets, one minute apart starting at `startMinute`.
function sets(count, startMinute = 0) {
  const result = [];
  for (let i = 1; i <= count; i++) {
    const logged_at = new Date(Date.UTC(2026, 10, 17, 18, startMinute + i));
    result.push({ set_number: i, logged_at });
  }
  return result;
}

// A logged exercise on a slot. Confirmed by default: 140 lb x 8 next time.
function logged(slot, setList, overrides) {
  return {
    id: `we-${slot.id}`,
    slot_id: slot.id,
    track_id: `track-${slot.id}`,
    position: slot.position,
    measurement_type: "reps",
    set_count: slot.set_count,
    confirmed_at: new Date(Date.UTC(2026, 10, 17, 19)),
    next_reps: 8,
    next_weight_lb: 140,
    sets: setList,
    ...overrides,
  };
}

// Renumbers sets so a later batch continues the earlier one's numbering.
function renumber(first) {
  return (set, i) => ({ ...set, set_number: first + i });
}

// A freeform exercise: no slot, track or plan.
function freeform(id, position, setList) {
  return {
    id,
    slot_id: null,
    track_id: null,
    position,
    measurement_type: "reps",
    set_count: null,
    confirmed_at: null,
    next_reps: null,
    next_weight_lb: null,
    sets: setList,
  };
}

const now = new Date(Date.UTC(2026, 10, 17, 19, 30));

describe("startWorkout", () => {
  test("a program workout opens on its day", () => {
    assert.deepEqual(startWorkout("program", "upper-1"), {
      kind: "program",
      status: "open",
      day_id: "upper-1",
    });
  });

  test("an off-program day opens on its day", () => {
    assert.equal(startWorkout("off_program_day", "lower-1").day_id, "lower-1");
  });

  test("a freeform workout opens with no day", () => {
    assert.deepEqual(startWorkout("freeform", null), {
      kind: "freeform",
      status: "open",
      day_id: null,
    });
  });

  test("throws for a program workout with no day", () => {
    assert.throws(() => startWorkout("program", null));
  });

  test("throws for an off-program day with no day", () => {
    assert.throws(() => startWorkout("off_program_day", null));
  });

  test("throws for a freeform workout with a day", () => {
    assert.throws(() => startWorkout("freeform", "upper-1"));
  });

  test("throws for an unknown kind", () => {
    assert.throws(() => startWorkout("cardio", null));
  });
});

describe("unfinishedSlots", () => {
  test("counts a partly logged slot and an untouched one", () => {
    // Bench 2 of 3, rows 0 of 3 (no row yet), curls 3 of 3.
    const logs = [logged(bench, sets(2)), logged(curls, sets(3))];
    assert.deepEqual(unfinishedSlots(workout(), slots, logs), [
      "bench",
      "rows",
    ]);
  });

  test("every slot is unfinished when nothing is logged", () => {
    assert.deepEqual(unfinishedSlots(workout(), slots, []), [
      "bench",
      "rows",
      "curls",
    ]);
  });

  test("none when every slot has its sets", () => {
    const logs = [bench, rows, curls].map((s) => logged(s, sets(3)));
    assert.deepEqual(unfinishedSlots(workout(), slots, logs), []);
  });

  test("an extra set past the plan still counts as finished", () => {
    const logs = [
      logged(bench, sets(4)),
      logged(rows, sets(3)),
      logged(curls, sets(3)),
    ];
    assert.deepEqual(unfinishedSlots(workout(), slots, logs), []);
  });

  test("counts timed exercises too", () => {
    const plank = { id: "plank", position: 4, set_count: 2 };
    const logs = [
      logged(bench, sets(3)),
      logged(rows, sets(3)),
      logged(curls, sets(3)),
      logged(plank, sets(1), { measurement_type: "time" }),
    ];
    assert.deepEqual(unfinishedSlots(workout(), [...slots, plank], logs), [
      "plank",
    ]);
  });

  test("works the same for an off-program day", () => {
    const logs = [logged(bench, sets(3))];
    assert.deepEqual(
      unfinishedSlots(workout({ kind: "off_program_day" }), slots, logs),
      ["rows", "curls"],
    );
  });

  test("always empty for freeform", () => {
    const fw = workout({ kind: "freeform", day_id: null });
    const logs = [freeform("we-dips", 1, sets(2))];
    assert.deepEqual(unfinishedSlots(fw, [], logs), []);
  });

  test("doesn't change its inputs", () => {
    const slotsCopy = structuredClone(slots);
    const logs = [logged(bench, sets(2))];
    const logsCopy = structuredClone(logs);
    unfinishedSlots(workout(), slots, logs);
    assert.deepEqual(slots, slotsCopy);
    assert.deepEqual(logs, logsCopy);
  });
});

describe("resumeSlotId", () => {
  test("lands on a partly logged exercise before an untouched one", () => {
    // Use case: 2 of 3 bench sets, then the app closed.
    const logs = [logged(bench, sets(2))];
    assert.equal(resumeSlotId(workout(), slots, logs), "bench");
  });

  test("skips finished exercises", () => {
    const logs = [logged(bench, sets(3)), logged(curls, sets(1))];
    assert.equal(resumeSlotId(workout(), slots, logs), "rows");
  });

  test("null when every exercise is finished", () => {
    const logs = [bench, rows, curls].map((s) => logged(s, sets(3)));
    assert.equal(resumeSlotId(workout(), slots, logs), null);
  });

  test("null for freeform", () => {
    const fw = workout({ kind: "freeform", day_id: null });
    const logs = [freeform("we-dips", 1, sets(2))];
    assert.equal(resumeSlotId(fw, [], logs), null);
  });
});

describe("lastLoggedExerciseId", () => {
  test("the exercise with the most recent set", () => {
    // Dips first, then pull-ups, then back to dips for one more set.
    const logs = [
      freeform("we-dips", 1, [...sets(2, 0), ...sets(1, 20).map(renumber(3))]),
      freeform("we-pullups", 2, sets(3, 5)),
    ];
    assert.equal(lastLoggedExerciseId(logs), "we-dips");
  });

  test("not simply the highest position", () => {
    const logs = [
      freeform("we-pullups", 2, sets(3, 0)),
      freeform("we-dips", 1, sets(3, 10)),
    ];
    assert.equal(lastLoggedExerciseId(logs), "we-dips");
  });

  test("null when nothing is logged", () => {
    assert.equal(lastLoggedExerciseId([]), null);
  });
});

describe("finishMessage", () => {
  test("nothing unfinished", () => {
    assert.equal(finishMessage(0), "End workout?");
  });

  test("one exercise, singular", () => {
    assert.equal(finishMessage(1), "End workout? 1 exercise unfinished");
  });

  test("several exercises, plural", () => {
    assert.equal(finishMessage(2), "End workout? 2 exercises unfinished");
  });
});

describe("discardMessage", () => {
  test("counts sets across every exercise", () => {
    const logs = [
      logged(bench, sets(3)),
      logged(rows, sets(3)),
      logged(curls, sets(3)),
    ];
    assert.equal(discardMessage(logs), "Delete this workout and its 9 sets?");
  });

  test("one set, singular", () => {
    const logs = [freeform("we-dips", 1, sets(1))];
    assert.equal(discardMessage(logs), "Delete this workout and its 1 set?");
  });
});

describe("submitWorkout", () => {
  const allConfirmed = [
    logged(curls, sets(3), { next_reps: 12, next_weight_lb: 25 }),
    logged(bench, sets(3), { next_reps: 9, next_weight_lb: 135 }),
    logged(rows, sets(3), { next_reps: 8, next_weight_lb: 115 }),
  ];

  test("marks the workout submitted at the given time", () => {
    const result = submitWorkout(workout(), program, days, allConfirmed, now);
    assert.deepEqual(result.workout, {
      kind: "program",
      status: "submitted",
      day_id: "upper-1",
      submitted_at: now,
    });
  });

  test("a program workout moves next day", () => {
    const result = submitWorkout(workout(), program, days, allConfirmed, now);
    assert.deepEqual(result.program_update, {
      id: "p1",
      next_day_id: "lower-1",
    });
  });

  test("a program workout copies confirmed targets, in position order", () => {
    const result = submitWorkout(workout(), program, days, allConfirmed, now);
    assert.deepEqual(result.track_updates, [
      { id: "track-bench", target_reps: 9, weight_lb: 135 },
      { id: "track-rows", target_reps: 8, weight_lb: 115 },
      { id: "track-curls", target_reps: 12, weight_lb: 25 },
    ]);
  });

  test("copies AMRAP and Bodyweight targets as empty values", () => {
    const dips = { id: "dips", position: 4, set_count: 3 };
    const logs = [
      logged(dips, sets(3), { next_reps: null, next_weight_lb: null }),
    ];
    const result = submitWorkout(workout(), program, days, logs, now);
    assert.deepEqual(result.track_updates, [
      { id: "track-dips", target_reps: null, weight_lb: null },
    ]);
  });

  test("a partly logged exercise leaves its track alone", () => {
    // Bench 2 of 3: no confirm screen, so nothing confirmed.
    const logs = [
      logged(bench, sets(2), {
        confirmed_at: null,
        next_reps: null,
        next_weight_lb: null,
      }),
      logged(rows, sets(3), { next_reps: 8, next_weight_lb: 115 }),
    ];
    const result = submitWorkout(workout(), program, days, logs, now);
    assert.deepEqual(result.track_updates, [
      { id: "track-rows", target_reps: 8, weight_lb: 115 },
    ]);
  });

  test("an off-program day moves nothing", () => {
    const opd = workout({ kind: "off_program_day", day_id: "lower-1" });
    const logs = [
      logged(bench, sets(3), { confirmed_at: null, next_reps: null }),
    ];
    const result = submitWorkout(opd, program, days, logs, now);
    assert.equal(result.workout.status, "submitted");
    assert.equal(result.program_update, null);
    assert.deepEqual(result.track_updates, []);
  });

  test("a freeform workout moves nothing", () => {
    const fw = workout({ kind: "freeform", day_id: null });
    const logs = [freeform("we-dips", 1, sets(3))];
    const result = submitWorkout(fw, program, days, logs, now);
    assert.equal(result.program_update, null);
    assert.deepEqual(result.track_updates, []);
  });

  test("a freeform workout works with no active program", () => {
    const fw = workout({ kind: "freeform", day_id: null });
    const logs = [freeform("we-dips", 1, sets(3))];
    const result = submitWorkout(fw, null, [], logs, now);
    assert.equal(result.workout.submitted_at, now);
    assert.equal(result.program_update, null);
  });

  test("throws while a confirm screen is still waiting", () => {
    // Rows has all 3 sets but OK was never tapped (req 26).
    const logs = [
      logged(bench, sets(3)),
      logged(rows, sets(3), { confirmed_at: null }),
    ];
    assert.throws(() => submitWorkout(workout(), program, days, logs, now));
  });

  test("throws for a workout that's already submitted", () => {
    const done = workout({ status: "submitted" });
    assert.throws(() => submitWorkout(done, program, days, allConfirmed, now));
  });

  test("doesn't change its inputs", () => {
    const w = workout();
    const wCopy = structuredClone(w);
    const programCopy = structuredClone(program);
    const logsCopy = structuredClone(allConfirmed);
    submitWorkout(w, program, days, allConfirmed, now);
    assert.deepEqual(w, wCopy);
    assert.deepEqual(program, programCopy);
    assert.deepEqual(allConfirmed, logsCopy);
  });
});
