/*
 * Progression suggestion: what the confirm screen pre-fills for next time.
 * Decisions 006, 009; requirements 9, 23.
 *
 * Inputs are table rows, column names unchanged:
 *   track  { measurement_type, rule, rep_min, rep_max, target_reps,
 *            weight_lb, increment_lb }
 *          rule 'single', 'double' or 'none'; target_reps null = AMRAP;
 *          weight_lb null = bodyweight
 *   slot   { set_count }
 *   sets   [{ set_number, reps, weight_lb, target_reps, target_weight_lb }]
 *          this workout exercise's logged sets, any order
 *
 * suggestNextTarget(track, slot, sets)
 *   -> { hit_all, next_reps, next_weight_lb } | null
 *
 *   null for timed and done tracks (no confirm screen in v1).
 *
 *   hit_all: at least set_count sets are logged and every one hit its target.
 *   A set hits when reps >= its target_reps and weight_lb >= its
 *   target_weight_lb. An empty target passes that half: AMRAP takes any reps,
 *   and a bodyweight target takes any weight. Bodyweight logged against a
 *   weighted target is a miss.
 *
 *   next_reps, next_weight_lb (null = AMRAP / bodyweight, as in the table):
 *   - Not hit_all, or rule 'none': the track's current target again.
 *   - 'single': weight + increment_lb, same target_reps. Ignores rep_min
 *     and rep_max. Bodyweight counts as 0, so it becomes increment_lb.
 *   - 'double', target_reps below rep_max: one more rep, same weight.
 *   - 'double', target_reps at or above rep_max: weight + increment_lb, reps
 *     back to rep_min. Bodyweight counts as 0, so it becomes increment_lb.
 *
 * Choices:
 *   - Sets are judged against the target copied onto each set when logged,
 *     not the track, so the log says what was asked at the time.
 *   - Fewer logged sets than set_count is a miss (req 15: skipped sets count).
 *   - Doing more than the target is still a hit, and the rule still adds only
 *     1 rep. The user can tap + on the confirm screen for more.
 *   - Reps confirmed above the range (009 allows it) count as the top.
 *   - Weights are numbers. Phase 4 converts Postgres numeric strings first.
 *   - Highlighting changed values is the screen's job: compare the result
 *     with the track.
 *   - Pure function: inputs are never changed.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { suggestNextTarget } from "./progression.js";

// Incline press: 135 lb, 3 sets, range 6–10, currently 8 reps.
// Pass an object to change some fields, e.g. track({ target_reps: 10 }).
function track(overrides) {
  const defaults = {
    measurement_type: "reps",
    rule: "double",
    rep_min: 6,
    rep_max: 10,
    target_reps: 8,
    weight_lb: 135,
    increment_lb: 5,
  };
  // Copy the defaults, then the overrides on top. Later fields win.
  return { ...defaults, ...overrides };
}

// A slot with 3 planned sets unless another count is given.
function slot(set_count = 3) {
  return { set_count: set_count };
}

// One logged set. Targets default to the track's, as when it was logged.
// Pass targets to change them, e.g. set(1, 10, 135, { target_reps: 10 }).
function set(set_number, reps, weight_lb, targets) {
  const logged = {
    set_number: set_number,
    reps: reps,
    weight_lb: weight_lb,
    target_reps: 8,
    target_weight_lb: 135,
  };
  return { ...logged, ...targets };
}

// n sets, all logged at the same values against the same targets.
// sets(3, 8, 135) is [set(1, 8, 135), set(2, 8, 135), set(3, 8, 135)].
function sets(n, reps, weight_lb, targets) {
  const logged = [];
  for (let setNumber = 1; setNumber <= n; setNumber++) {
    logged.push(set(setNumber, reps, weight_lb, targets));
  }
  return logged;
}

describe("which measurement types get a suggestion", () => {
  test("returns null for a timed track", () => {
    const timed = {
      measurement_type: "time",
      rule: "none",
      target_seconds: 60,
    };
    assert.equal(suggestNextTarget(timed, slot(), []), null);
  });

  test("returns null for a done track", () => {
    const done = { measurement_type: "done", rule: "none" };
    assert.equal(suggestNextTarget(done, slot(), []), null);
  });
});

describe("judging whether every set hit", () => {
  test("hits when every set matches its target", () => {
    const result = suggestNextTarget(track(), slot(), sets(3, 8, 135));
    assert.equal(result.hit_all, true);
  });

  test("more reps or more weight still counts as a hit", () => {
    const logged = [set(1, 10, 135), set(2, 8, 140), set(3, 9, 145)];
    assert.equal(suggestNextTarget(track(), slot(), logged).hit_all, true);
  });

  test("one set short on reps is a miss", () => {
    const logged = [set(1, 8, 135), set(2, 8, 135), set(3, 7, 135)];
    assert.equal(suggestNextTarget(track(), slot(), logged).hit_all, false);
  });

  test("one set at a lighter weight is a miss", () => {
    const logged = [set(1, 8, 135), set(2, 8, 130), set(3, 8, 135)];
    assert.equal(suggestNextTarget(track(), slot(), logged).hit_all, false);
  });

  test("bodyweight logged against a weighted target is a miss", () => {
    const logged = [set(1, 8, 135), set(2, 8, 135), set(3, 8, null)];
    assert.equal(suggestNextTarget(track(), slot(), logged).hit_all, false);
  });

  test("any weight counts against a bodyweight target", () => {
    const bw = { target_weight_lb: null };
    const logged = [
      set(1, 8, null, bw),
      set(2, 8, 10, bw),
      set(3, 8, null, bw),
    ];
    const bodyweight = track({ weight_lb: null });
    assert.equal(suggestNextTarget(bodyweight, slot(), logged).hit_all, true);
  });

  test("fewer sets logged than planned is a miss (req 15)", () => {
    const result = suggestNextTarget(track(), slot(3), sets(2, 8, 135));
    assert.equal(result.hit_all, false);
  });

  test("no sets logged is a miss", () => {
    assert.equal(suggestNextTarget(track(), slot(), []).hit_all, false);
  });

  test("judges each set by its own logged target, not the track's", () => {
    // Logged against 8 reps; the track now says 9 (shouldn't happen mid-
    // workout, but the set's copy is the record of what was asked).
    const result = suggestNextTarget(
      track({ target_reps: 9 }),
      slot(),
      sets(3, 8, 135),
    );
    assert.equal(result.hit_all, true);
  });

  test("set order does not matter", () => {
    const logged = [set(3, 8, 135), set(1, 8, 135), set(2, 8, 135)];
    assert.equal(suggestNextTarget(track(), slot(), logged).hit_all, true);
  });
});

describe("single progression", () => {
  // Squat: 225 lb, 3 sets of 5, weight goes up each time every set hits.
  const fives = track({
    rule: "single",
    rep_min: null,
    rep_max: null,
    target_reps: 5,
    weight_lb: 225,
  });
  const fivesTargets = { target_reps: 5, target_weight_lb: 225 };

  test("adds the increment and keeps the same reps", () => {
    const result = suggestNextTarget(
      fives,
      slot(),
      sets(3, 5, 225, fivesTargets),
    );
    assert.deepEqual(result, {
      hit_all: true,
      next_reps: 5,
      next_weight_lb: 230,
    });
  });

  test("beating the rep target still keeps the same reps", () => {
    const result = suggestNextTarget(
      fives,
      slot(),
      sets(3, 7, 225, fivesTargets),
    );
    assert.equal(result.next_reps, 5);
    assert.equal(result.next_weight_lb, 230);
  });

  test("a miss suggests the same target again", () => {
    const logged = [
      set(1, 5, 225, fivesTargets),
      set(2, 5, 225, fivesTargets),
      set(3, 4, 225, fivesTargets),
    ];
    assert.deepEqual(suggestNextTarget(fives, slot(), logged), {
      hit_all: false,
      next_reps: 5,
      next_weight_lb: 225,
    });
  });

  test("ignores a rep range if the track has one", () => {
    // Shouldn't be saved this way, but single must not fall into double's
    // add-a-rep logic if it is.
    const ranged = { ...fives, rep_min: 5, rep_max: 8 };
    const result = suggestNextTarget(
      ranged,
      slot(),
      sets(3, 5, 225, fivesTargets),
    );
    assert.deepEqual(result, {
      hit_all: true,
      next_reps: 5,
      next_weight_lb: 230,
    });
  });

  test("a bodyweight lift at a hit adds the increment as weight", () => {
    const bw = { target_reps: 5, target_weight_lb: null };
    const result = suggestNextTarget(
      { ...fives, weight_lb: null },
      slot(),
      sets(3, 5, null, bw),
    );
    assert.deepEqual(result, {
      hit_all: true,
      next_reps: 5,
      next_weight_lb: 5,
    });
  });
});

describe("double progression", () => {
  test("adds one rep at the same weight", () => {
    const result = suggestNextTarget(track(), slot(), sets(3, 8, 135));
    assert.deepEqual(result, {
      hit_all: true,
      next_reps: 9,
      next_weight_lb: 135,
    });
  });

  test("adds only one rep even when every set beat the target", () => {
    const result = suggestNextTarget(track(), slot(), sets(3, 10, 135));
    assert.equal(result.next_reps, 9);
  });

  test("at the top of the range, adds weight and drops to the bottom", () => {
    const top = { target_reps: 10 };
    const result = suggestNextTarget(track(top), slot(), sets(3, 10, 135, top));
    assert.deepEqual(result, {
      hit_all: true,
      next_reps: 6,
      next_weight_lb: 140,
    });
  });

  test("uses the track's own increment", () => {
    const top = { target_reps: 10 };
    const result = suggestNextTarget(
      track({ ...top, weight_lb: 40, increment_lb: 2.5 }),
      slot(),
      sets(3, 10, 40, { ...top, target_weight_lb: 40 }),
    );
    assert.equal(result.next_weight_lb, 42.5);
  });

  test("reps confirmed above the range count as the top", () => {
    const high = { target_reps: 12 };
    const result = suggestNextTarget(
      track(high),
      slot(),
      sets(3, 12, 135, high),
    );
    assert.equal(result.next_reps, 6);
    assert.equal(result.next_weight_lb, 140);
  });

  test("reps confirmed below the range still add one rep", () => {
    const low = { target_reps: 4 };
    const result = suggestNextTarget(track(low), slot(), sets(3, 4, 135, low));
    assert.equal(result.next_reps, 5);
    assert.equal(result.next_weight_lb, 135);
  });

  test("a bodyweight lift adds one rep and stays bodyweight", () => {
    const bw = { target_reps: 7, target_weight_lb: null };
    const result = suggestNextTarget(
      track({ rep_min: 5, target_reps: 7, weight_lb: null }),
      slot(),
      sets(3, 7, null, bw),
    );
    assert.deepEqual(result, {
      hit_all: true,
      next_reps: 8,
      next_weight_lb: null,
    });
  });

  test("a bodyweight lift at the top adds the increment as weight", () => {
    const bw = { target_reps: 10, target_weight_lb: null };
    const result = suggestNextTarget(
      track({ rep_min: 5, target_reps: 10, weight_lb: null }),
      slot(),
      sets(3, 10, null, bw),
    );
    assert.deepEqual(result, {
      hit_all: true,
      next_reps: 5,
      next_weight_lb: 5,
    });
  });

  test("a miss suggests the same target again", () => {
    const logged = [set(1, 8, 135), set(2, 7, 135), set(3, 6, 135)];
    assert.deepEqual(suggestNextTarget(track(), slot(), logged), {
      hit_all: false,
      next_reps: 8,
      next_weight_lb: 135,
    });
  });

  test("a miss at the top of the range does not add weight", () => {
    const top = { target_reps: 10 };
    const logged = sets(3, 9, 135, top);
    assert.deepEqual(suggestNextTarget(track(top), slot(), logged), {
      hit_all: false,
      next_reps: 10,
      next_weight_lb: 135,
    });
  });
});

describe("rule none", () => {
  // Seated calf raise: AMRAP at 90 lb.
  const amrap = track({
    rule: "none",
    rep_min: null,
    rep_max: null,
    target_reps: null,
    weight_lb: 90,
  });
  const amrapTargets = { target_reps: null, target_weight_lb: 90 };

  test("AMRAP keeps the same weight and an empty rep target", () => {
    const logged = sets(3, 15, 90, amrapTargets);
    assert.deepEqual(suggestNextTarget(amrap, slot(), logged), {
      hit_all: true,
      next_reps: null,
      next_weight_lb: 90,
    });
  });

  test("AMRAP takes any number of reps as a hit", () => {
    const logged = [
      set(1, 20, 90, amrapTargets),
      set(2, 12, 90, amrapTargets),
      set(3, 1, 90, amrapTargets),
    ];
    assert.equal(suggestNextTarget(amrap, slot(), logged).hit_all, true);
  });

  test("AMRAP at a lighter weight is a miss, same target again", () => {
    const logged = [
      set(1, 15, 90, amrapTargets),
      set(2, 15, 80, amrapTargets),
      set(3, 15, 90, amrapTargets),
    ];
    assert.deepEqual(suggestNextTarget(amrap, slot(), logged), {
      hit_all: false,
      next_reps: null,
      next_weight_lb: 90,
    });
  });

  test("bodyweight AMRAP stays bodyweight", () => {
    // Dips: AMRAP, no weight.
    const dips = track({ ...amrap, weight_lb: null });
    const targets = { target_reps: null, target_weight_lb: null };
    const result = suggestNextTarget(dips, slot(), sets(3, 12, null, targets));
    assert.deepEqual(result, {
      hit_all: true,
      next_reps: null,
      next_weight_lb: null,
    });
  });
});

test("does not change its inputs", () => {
  const t = track();
  const s = slot();
  const logged = [set(3, 8, 135), set(1, 8, 135), set(2, 8, 135)];
  const before = structuredClone({ t, s, logged });
  suggestNextTarget(t, s, logged);
  assert.deepEqual({ t, s, logged }, before);
});
