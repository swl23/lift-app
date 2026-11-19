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
 *   - Unfinished order comes from slot position. A workout exercise's
 *     position is its order within the workout, which can differ.
 *   - Only reps exercises get a confirm screen, so a finished timed
 *     exercise never blocks submitting and never updates its track.
 *   - An exercise whose slot was deleted has no plan, so it never blocks
 *     submitting either.
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

// A time on the test day, 2026-11-17 UTC: at("18:05").
function at(time) {
  return new Date(`2026-11-17T${time}:00Z`);
}

// n logged sets at 18:01, 18:02, ... Tests where timing matters list their
// sets out instead.
function sets(n) {
  const result = [];
  for (let i = 1; i <= n; i++) {
    const minute = String(i).padStart(2, "0");
    result.push({ set_number: i, logged_at: at(`18:${minute}`) });
  }
  return result;
}

const now = at("19:30");

const days = [
  { id: "upper-1", position: 1 },
  { id: "lower-1", position: 2 },
];
const program = { id: "p1", next_day_id: "upper-1" };

const programWorkout = { kind: "program", status: "open", day_id: "upper-1" };
const offDayWorkout = {
  kind: "off_program_day",
  status: "open",
  day_id: "upper-1",
};
const freeformWorkout = { kind: "freeform", status: "open", day_id: null };

// Upper 1: bench, rows, curls, 3 sets each. Listed out of order, the way
// database rows can arrive.
const slots = [
  { id: "curls", position: 3, set_count: 3 },
  { id: "bench", position: 1, set_count: 3 },
  { id: "rows", position: 2, set_count: 3 },
];

// Bench, 3 of 3 sets, confirmed: 9 reps at 135 lb next time.
const benchDone = {
  id: "we-bench",
  slot_id: "bench",
  track_id: "track-bench",
  position: 1,
  measurement_type: "reps",
  set_count: 3,
  confirmed_at: at("19:00"),
  next_reps: 9,
  next_weight_lb: 135,
  sets: sets(3),
};
// Bench, 2 of 3 sets: no confirm screen yet, so nothing confirmed.
const benchPartial = {
  ...benchDone,
  sets: sets(2),
  confirmed_at: null,
  next_reps: null,
  next_weight_lb: null,
};
// Bench, 4 of 3 sets: one extra set past the plan.
const benchExtra = { ...benchDone, sets: sets(4) };
// Bench, 3 of 3 sets, never confirmed (an off-program day has no confirm
// screen).
const benchUnconfirmed = {
  ...benchDone,
  confirmed_at: null,
  next_reps: null,
  next_weight_lb: null,
};

// Rows, 3 of 3 sets, confirmed: 8 reps at 115 lb next time.
const rowsDone = {
  id: "we-rows",
  slot_id: "rows",
  track_id: "track-rows",
  position: 2,
  measurement_type: "reps",
  set_count: 3,
  confirmed_at: at("19:00"),
  next_reps: 8,
  next_weight_lb: 115,
  sets: sets(3),
};

// Curls, 3 of 3 sets, confirmed: 12 reps at 25 lb next time.
const curlsDone = {
  id: "we-curls",
  slot_id: "curls",
  track_id: "track-curls",
  position: 3,
  measurement_type: "reps",
  set_count: 3,
  confirmed_at: at("19:00"),
  next_reps: 12,
  next_weight_lb: 25,
  sets: sets(3),
};
// Curls, 1 of 3 sets: nothing confirmed.
const curlsPartial = {
  ...curlsDone,
  sets: sets(1),
  confirmed_at: null,
  next_reps: null,
  next_weight_lb: null,
};

// Freeform exercises: no slot, track or plan.
const freeformDips = {
  id: "we-dips",
  slot_id: null,
  track_id: null,
  position: 1,
  measurement_type: "reps",
  set_count: null,
  confirmed_at: null,
  next_reps: null,
  next_weight_lb: null,
  sets: sets(2),
};
const freeformPullups = {
  id: "we-pullups",
  slot_id: null,
  track_id: null,
  position: 2,
  measurement_type: "reps",
  set_count: null,
  confirmed_at: null,
  next_reps: null,
  next_weight_lb: null,
  sets: sets(3),
};

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

  test("throws for an unknown kind, even with a day", () => {
    assert.throws(() => startWorkout("cardio", "upper-1"));
  });
});

describe("unfinishedSlots", () => {
  test("counts a partly logged slot and an untouched one", () => {
    // Bench 2 of 3, rows 0 of 3 (no row yet), curls 3 of 3.
    const logs = [benchPartial, curlsDone];
    assert.deepEqual(unfinishedSlots(programWorkout, slots, logs), [
      "bench",
      "rows",
    ]);
  });

  test("every slot is unfinished when nothing is logged", () => {
    assert.deepEqual(unfinishedSlots(programWorkout, slots, []), [
      "bench",
      "rows",
      "curls",
    ]);
  });

  test("none when every slot has its sets", () => {
    const logs = [benchDone, rowsDone, curlsDone];
    assert.deepEqual(unfinishedSlots(programWorkout, slots, logs), []);
  });

  test("an extra set past the plan still counts as finished", () => {
    const logs = [benchExtra, rowsDone, curlsDone];
    assert.deepEqual(unfinishedSlots(programWorkout, slots, logs), []);
  });

  test("counts timed exercises too", () => {
    // Plank, 1 of 2 timed sets.
    const plankSlot = { id: "plank", position: 4, set_count: 2 };
    const plank = {
      id: "we-plank",
      slot_id: "plank",
      track_id: "track-plank",
      position: 4,
      measurement_type: "time",
      set_count: 2,
      confirmed_at: null,
      next_reps: null,
      next_weight_lb: null,
      sets: sets(1),
    };
    const logs = [benchDone, rowsDone, curlsDone, plank];
    assert.deepEqual(
      unfinishedSlots(programWorkout, [...slots, plankSlot], logs),
      ["plank"],
    );
  });

  test("works the same for an off-program day", () => {
    const logs = [benchDone];
    assert.deepEqual(unfinishedSlots(offDayWorkout, slots, logs), [
      "rows",
      "curls",
    ]);
  });

  test("always empty for freeform", () => {
    const logs = [freeformDips];
    assert.deepEqual(unfinishedSlots(freeformWorkout, [], logs), []);
  });

  test("always empty for freeform, even if handed slots", () => {
    const logs = [freeformDips];
    assert.deepEqual(unfinishedSlots(freeformWorkout, slots, logs), []);
  });

  test("orders by slot position, not workout position", () => {
    // Use case: curls logged first, so its row is position 1 in the workout,
    // but it's still the third slot of the day.
    const logs = [{ ...curlsPartial, position: 1 }];
    assert.deepEqual(unfinishedSlots(programWorkout, slots, logs), [
      "bench",
      "rows",
      "curls",
    ]);
  });

  test("doesn't change its inputs", () => {
    const slotsCopy = structuredClone(slots);
    const logs = [benchPartial];
    const logsCopy = structuredClone(logs);
    unfinishedSlots(programWorkout, slots, logs);
    assert.deepEqual(slots, slotsCopy);
    assert.deepEqual(logs, logsCopy);
  });
});

describe("resumeSlotId", () => {
  test("lands on a partly logged exercise before an untouched one", () => {
    // Use case: 2 of 3 bench sets, then the app closed.
    const logs = [benchPartial];
    assert.equal(resumeSlotId(programWorkout, slots, logs), "bench");
  });

  test("skips finished exercises", () => {
    const logs = [benchDone, curlsPartial];
    assert.equal(resumeSlotId(programWorkout, slots, logs), "rows");
  });

  test("null when every exercise is finished", () => {
    const logs = [benchDone, rowsDone, curlsDone];
    assert.equal(resumeSlotId(programWorkout, slots, logs), null);
  });

  test("null for freeform", () => {
    const logs = [freeformDips];
    assert.equal(resumeSlotId(freeformWorkout, [], logs), null);
  });
});

describe("lastLoggedExerciseId", () => {
  test("the exercise with the most recent set", () => {
    // Dips first, then pull-ups, then back to dips for one more set.
    const logs = [
      {
        ...freeformDips,
        sets: [
          { set_number: 1, logged_at: at("18:01") },
          { set_number: 2, logged_at: at("18:02") },
          { set_number: 3, logged_at: at("18:21") },
        ],
      },
      {
        ...freeformPullups,
        sets: [
          { set_number: 1, logged_at: at("18:06") },
          { set_number: 2, logged_at: at("18:07") },
          { set_number: 3, logged_at: at("18:08") },
        ],
      },
    ];
    assert.equal(lastLoggedExerciseId(logs), "we-dips");
  });

  test("not simply the highest position", () => {
    // Pull-ups (position 2) first, then dips (position 1).
    const logs = [
      {
        ...freeformPullups,
        sets: [
          { set_number: 1, logged_at: at("18:01") },
          { set_number: 2, logged_at: at("18:02") },
          { set_number: 3, logged_at: at("18:03") },
        ],
      },
      {
        ...freeformDips,
        sets: [
          { set_number: 1, logged_at: at("18:11") },
          { set_number: 2, logged_at: at("18:12") },
          { set_number: 3, logged_at: at("18:13") },
        ],
      },
    ];
    assert.equal(lastLoggedExerciseId(logs), "we-dips");
  });

  test("not simply the lowest position", () => {
    // Dips (position 1) first, then pull-ups (position 2).
    const logs = [
      {
        ...freeformDips,
        sets: [
          { set_number: 1, logged_at: at("18:01") },
          { set_number: 2, logged_at: at("18:02") },
        ],
      },
      {
        ...freeformPullups,
        sets: [
          { set_number: 1, logged_at: at("18:10") },
          { set_number: 2, logged_at: at("18:11") },
        ],
      },
    ];
    assert.equal(lastLoggedExerciseId(logs), "we-pullups");
  });

  test("null when nothing is logged", () => {
    assert.equal(lastLoggedExerciseId([]), null);
  });

  test("doesn't change its inputs", () => {
    // Exercises out of position order, sets out of time order.
    const logs = [
      {
        ...freeformPullups,
        sets: [
          { set_number: 2, logged_at: at("18:12") },
          { set_number: 1, logged_at: at("18:11") },
        ],
      },
      {
        ...freeformDips,
        sets: [
          { set_number: 2, logged_at: at("18:02") },
          { set_number: 1, logged_at: at("18:01") },
        ],
      },
    ];
    const logsCopy = structuredClone(logs);
    lastLoggedExerciseId(logs);
    assert.deepEqual(logs, logsCopy);
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
    const logs = [benchDone, rowsDone, curlsDone];
    assert.equal(discardMessage(logs), "Delete this workout and its 9 sets?");
  });

  test("one set, singular", () => {
    const logs = [{ ...freeformDips, sets: sets(1) }];
    assert.equal(discardMessage(logs), "Delete this workout and its 1 set?");
  });
});

describe("submitWorkout", () => {
  // Out of position order on purpose.
  const allConfirmed = [curlsDone, benchDone, rowsDone];

  test("marks the workout submitted at the given time", () => {
    const result = submitWorkout(
      programWorkout,
      program,
      days,
      allConfirmed,
      now,
    );
    assert.deepEqual(result.workout, {
      kind: "program",
      status: "submitted",
      day_id: "upper-1",
      submitted_at: now,
    });
  });

  test("uses whatever time it's given", () => {
    const later = at("21:45");
    const result = submitWorkout(
      programWorkout,
      program,
      days,
      allConfirmed,
      later,
    );
    assert.equal(result.workout.submitted_at, later);
  });

  test("a program workout moves next day", () => {
    const result = submitWorkout(
      programWorkout,
      program,
      days,
      allConfirmed,
      now,
    );
    assert.deepEqual(result.program_update, {
      id: "p1",
      next_day_id: "lower-1",
    });
  });

  test("a program workout copies confirmed targets, in position order", () => {
    const result = submitWorkout(
      programWorkout,
      program,
      days,
      allConfirmed,
      now,
    );
    assert.deepEqual(result.track_updates, [
      { id: "track-bench", target_reps: 9, weight_lb: 135 },
      { id: "track-rows", target_reps: 8, weight_lb: 115 },
      { id: "track-curls", target_reps: 12, weight_lb: 25 },
    ]);
  });

  test("copies AMRAP and Bodyweight targets as empty values", () => {
    // Dips, 3 of 3 sets, confirmed with no rep target and no added weight.
    const amrapDips = {
      id: "we-dips",
      slot_id: "dips",
      track_id: "track-dips",
      position: 4,
      measurement_type: "reps",
      set_count: 3,
      confirmed_at: at("19:00"),
      next_reps: null,
      next_weight_lb: null,
      sets: sets(3),
    };
    const result = submitWorkout(
      programWorkout,
      program,
      days,
      [amrapDips],
      now,
    );
    assert.deepEqual(result.track_updates, [
      { id: "track-dips", target_reps: null, weight_lb: null },
    ]);
  });

  test("a partly logged exercise leaves its track alone", () => {
    // Bench 2 of 3: no confirm screen, so nothing confirmed.
    const logs = [benchPartial, rowsDone];
    const result = submitWorkout(programWorkout, program, days, logs, now);
    assert.deepEqual(result.track_updates, [
      { id: "track-rows", target_reps: 8, weight_lb: 115 },
    ]);
  });

  test("an off-program day moves nothing", () => {
    const logs = [benchUnconfirmed];
    const result = submitWorkout(offDayWorkout, program, days, logs, now);
    assert.equal(result.workout.status, "submitted");
    assert.equal(result.program_update, null);
    assert.deepEqual(result.track_updates, []);
  });
  test("a freeform workout moves nothing", () => {
    const logs = [freeformDips];
    const result = submitWorkout(freeformWorkout, program, days, logs, now);
    assert.equal(result.program_update, null);
    assert.deepEqual(result.track_updates, []);
  });

  test("a freeform workout works with no active program", () => {
    const logs = [freeformDips];
    const result = submitWorkout(freeformWorkout, null, [], logs, now);
    assert.equal(result.workout.submitted_at, now);
    assert.equal(result.program_update, null);
  });

  test("throws while a confirm screen is still waiting", () => {
    // Rows has all 3 sets but OK was never tapped (req 26).
    const logs = [benchDone, { ...rowsDone, confirmed_at: null }];
    assert.throws(() =>
      submitWorkout(programWorkout, program, days, logs, now),
    );
  });

  test("throws when extra sets skipped the confirm screen", () => {
    // Bench has 4 of 3 sets, still unconfirmed (req 26).
    const logs = [{ ...benchExtra, confirmed_at: null }];
    assert.throws(() =>
      submitWorkout(programWorkout, program, days, logs, now),
    );
  });

  test("an exercise whose slot was deleted doesn't block submitting", () => {
    // Use case: mid-workout, the user removes rows from the program after
    // logging it. The row keeps its sets but loses its slot, so it has no
    // plan and no confirm screen, and leaves tracks alone.
    const rowsSlotDeleted = {
      ...rowsDone,
      slot_id: null,
      track_id: null,
      set_count: null,
      confirmed_at: null,
      next_reps: null,
      next_weight_lb: null,
    };
    const logs = [benchDone, rowsSlotDeleted];
    const result = submitWorkout(programWorkout, program, days, logs, now);
    assert.equal(result.workout.status, "submitted");
    assert.deepEqual(result.track_updates, [
      { id: "track-bench", target_reps: 9, weight_lb: 135 },
    ]);
  });

  test("a finished timed exercise doesn't block submitting", () => {
    // Plank, 2 of 2 timed sets. Timed exercises have no confirm screen, so
    // it's never confirmed and leaves its track alone.
    const plankDone = {
      id: "we-plank",
      slot_id: "plank",
      track_id: "track-plank",
      position: 4,
      measurement_type: "time",
      set_count: 2,
      confirmed_at: null,
      next_reps: null,
      next_weight_lb: null,
      sets: sets(2),
    };
    const logs = [...allConfirmed, plankDone];
    const result = submitWorkout(programWorkout, program, days, logs, now);
    assert.equal(result.workout.status, "submitted");
    assert.deepEqual(
      result.track_updates.map((update) => update.id),
      ["track-bench", "track-rows", "track-curls"],
    );
  });

  test("throws for a workout that's already submitted", () => {
    const done = { ...programWorkout, status: "submitted" };
    assert.throws(() => submitWorkout(done, program, days, allConfirmed, now));
  });

  test("doesn't change its inputs", () => {
    const workoutCopy = structuredClone(programWorkout);
    const programCopy = structuredClone(program);
    const logsCopy = structuredClone(allConfirmed);
    submitWorkout(programWorkout, program, days, allConfirmed, now);
    assert.deepEqual(programWorkout, workoutCopy);
    assert.deepEqual(program, programCopy);
    assert.deepEqual(allConfirmed, logsCopy);
  });
});
