function stepWeight(weight_lb, direction, lowest_weight_lb) {
  let next = 0;
  if (direction === "up") {
    if (weight_lb + 2.5 >= 10000) {
      next = weight_lb;
    } else {
      next = weight_lb + 2.5;
    }
  } else if (direction === "down") {
    if (lowest_weight_lb !== null && weight_lb < lowest_weight_lb) {
      return weight_lb;
    }
    if (weight_lb - 2.5 <= 0) {
      if (lowest_weight_lb === null) {
        return null;
      }
      next = lowest_weight_lb;
    } else if (weight_lb - 2.5 < lowest_weight_lb) {
      next = lowest_weight_lb;
    } else {
      next = weight_lb - 2.5;
    }
  }
  return Math.round((next + Number.EPSILON) * 100) / 100;
}

function stepReps(reps, direction) {
  if (direction === "up") {
    if (reps === 200) {
      return 200;
    } else {
      return reps + 1;
    }
  } else if (direction === "down") {
    if (reps === 1) {
      return 1;
    } else {
      return reps - 1;
    }
  }
}

function checkText(text) {
  const library = ".0123456789";
  let pass = true;
  let periodCount = 0;
  for (const char of text.toString()) {
    if (!library.includes(char)) {
      pass = false;
    }
    if (char === ".") {
      periodCount += 1;
    }
  }
  if (periodCount > 1) {
    pass = false;
  }
  return { pass, periodCount };
}

function parseWeight(text, lowest_weight_lb, previous) {
  let trimmed = text.trim();
  if (!checkText(trimmed).pass) {
    return previous;
  }
  let num = Number(trimmed);
  const decimalCheck = trimmed.split(".");
  if (decimalCheck.length > 1) {
    if (decimalCheck[1].length > 2) {
      return previous;
    }
  }
  if (
    Number.isNaN(num) ||
    num < lowest_weight_lb ||
    num === 0 ||
    num >= 10000
  ) {
    return previous;
  }
  return num;
}

function parseReps(text, previous) {
  const num = Number(text);
  const library = "0123456789";
  for (const char of text.trim()) {
    if (!library.includes(char)) {
      return previous;
    }
  }
  if (num >= 1 && num <= 200) {
    return num;
  } else {
    return previous;
  }
}
/* exercisesToConfirm(workout, workoutExercises) -> [workout exercise id]

The confirm screens to show on Resume and before Finish (req 26), in workout position order.
workout           { kind }  'program', 'off_program_day' or 'freeform'

workoutExercises  [{ id, position, measurement_type, confirmed_at,
                        set_count, sets }], any order
                      set_count is the slot's (null when there's no slot);
                      sets is the exercise's logged sets
    
An exercise needs confirming when: the workout is a program workout,
    it's a reps exercise, it has a slot, at least set_count sets are logged,
    and confirmed_at is empty. */
function exercisesToConfirm(workout, workoutExercises) {
  const confirms = [];
  if (workout.kind === "program") {
    workoutExercises.forEach((entry) => {
      if (
        entry.confirmed_at === null &&
        entry.set_count !== null &&
        entry.sets.length >= entry.set_count &&
        entry.measurement_type === "reps"
      ) {
        confirms.push({ id: entry.id, position: entry.position });
      }
    });
  }
  const sortedConfirms = confirms
    .sort((a, b) => a.position - b.position)
    .map((exercise) => exercise.id);
  return sortedConfirms;
}

export { stepWeight, stepReps, parseWeight, parseReps, exercisesToConfirm };
