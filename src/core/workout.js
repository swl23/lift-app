import { exercisesToConfirm } from "./confirmScreen.js";
import { getNextDayId } from "./nextDay.js";

function startWorkout(kind, day_id) {
  const accepted = ["freeform", "off_program_day", "program"];
  if (
    (kind !== "freeform" && day_id === null) ||
    (kind === "freeform" && day_id !== null) ||
    !accepted.includes(kind)
  ) {
    throw new Error("day_id is null.");
  }
  return {
    kind: kind,
    status: "open",
    day_id: day_id,
  };
}

function unfinishedSlots(workout, slots, workoutExercises) {
  const unfinished = [];
  if (workout.kind === "freeform") {
    return unfinished;
  } else {
    const workoutExercisesIds = workoutExercises.map(
      (exercise) => exercise.slot_id,
    );

    workoutExercises.forEach((exercise) => {
      if (exercise.sets.length < exercise.set_count) {
        unfinished.push({
          slot_id: exercise.slot_id,
          position: slots.find((slot) => slot.id === exercise.slot_id).position,
        });
      }
    });

    slots.forEach((slot) => {
      if (!workoutExercisesIds.includes(slot.id)) {
        unfinished.push({
          slot_id: slot.id,
          position: slot.position,
        });
      }
    });
  }
  return unfinished
    .sort((a, b) => a.position - b.position)
    .map((entry) => entry.slot_id);
}

function resumeSlotId(workout, slots, workoutExercises) {
  if (workout.kind === "freeform") {
    return null;
  }
  const unfinished = unfinishedSlots(workout, slots, workoutExercises);
  if (unfinished.length === 0) {
    return null;
  } else {
    return unfinished[0];
  }
}

function lastLoggedExerciseId(workoutExercises) {
  if (workoutExercises.length === 0) {
    return null;
  } else {
    const times = workoutExercises.map((exercise) => ({
      id: exercise.id,
      lastTime: Math.max(...exercise.sets.map((set) => set.logged_at)),
    }));
    return times.sort((a, b) => a.lastTime - b.lastTime)[times.length - 1].id;
  }
}

function finishMessage(unfinishedCount) {
  if (!unfinishedCount) {
    return "End workout?";
  } else if (unfinishedCount === 1) {
    return "End workout? 1 exercise unfinished";
  } else {
    return `End workout? ${unfinishedCount} exercises unfinished`;
  }
}

function discardMessage(workoutExercises) {
  let count = 0;
  workoutExercises.forEach((exercise) => (count += exercise.sets.length));
  return count === 1
    ? "Delete this workout and its 1 set?"
    : `Delete this workout and its ${count} sets?`;
}

function submitWorkout(workout, program, days, workoutExercises, now) {
  if (workout.status === "submitted") {
    throw new Error("WTF");
  } else if (exercisesToConfirm(workout, workoutExercises).length > 0) {
    throw new Error("Confirm screens still waiting.");
  }
  let result = {
    workout: {
      ...workout,
      status: "submitted",
      submitted_at: now,
    },
    track_updates: [],
  };
  if (workout.kind !== "program") {
    result.program_update = null;
  } else {
    result.program_update = {
      id: program.id,
      next_day_id: getNextDayId(program, days, result.workout),
    };

    workoutExercises
      .filter((exercise) => exercise.confirmed_at !== null)
      .sort((a, b) => a.position - b.position)
      .map((exercise) =>
        result.track_updates.push({
          id: exercise.track_id,
          target_reps: exercise.next_reps,
          weight_lb: exercise.next_weight_lb,
        }),
      );
  }

  return result;
}

export {
  startWorkout,
  unfinishedSlots,
  resumeSlotId,
  lastLoggedExerciseId,
  finishMessage,
  discardMessage,
  submitWorkout,
};
