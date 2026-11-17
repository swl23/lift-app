function judgeSet(set) {
  const repsHit = set.target_reps === null || set.reps >= set.target_reps;
  const weightHit =
    set.target_weight_lb === null ||
    (set.weight_lb !== null && set.weight_lb >= set.target_weight_lb);
  return repsHit && weightHit;
}

function incrementWeight(track) {
  return (track.weight_lb ?? 0) + track.increment_lb;
}

function suggestNextTarget(track, slot, sets) {
  // not a "rep" exercise
  if (track.measurement_type !== "reps") {
    return null;
  }
  const result = {
    hit_all: false,
    next_reps: track.target_reps,
    next_weight_lb: track.weight_lb,
  };

  // missing expected sets
  if (sets.length < slot.set_count) {
    return result;
  }

  const hitAll = sets.every((set) => judgeSet(set));
  if (hitAll) {
    result.hit_all = true;
    if (track.rule === "single") {
      result.next_weight_lb = incrementWeight(track);
    } else if (track.rule === "double") {
      if (track.target_reps < track.rep_max) {
        result.next_reps += 1;
      } else {
        result.next_reps = track.rep_min;
        result.next_weight_lb = incrementWeight(track);
      }
    }
  }
  return result;
}

export { suggestNextTarget };
