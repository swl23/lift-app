function sortDaysByPosition(days) {
  return days.toSorted((a, b) => a.position - b.position);
}

function getSuggestedDay(program, days) {
  if (!days.length) {
    return null;
  }
  const sortedDays = sortDaysByPosition(days);
  const match = sortedDays.find((day) => day.id === program.next_day_id);
  return match ?? sortedDays[0];
}

function getNextDayId(program, days, workout) {
  if (workout.kind !== "program" || workout.status !== "submitted") {
    return program.next_day_id;
  }

  const sortedDays = sortDaysByPosition(days);
  const nextDay = sortedDays.findIndex((day) => day.id === workout.day_id);
  if (nextDay < 0) {
    return program.next_day_id;
  }
  if (nextDay + 1 === sortedDays.length) {
    return sortedDays[0].id;
  } else {
    return sortedDays[nextDay + 1].id;
  }
}

export { getSuggestedDay, getNextDayId };
