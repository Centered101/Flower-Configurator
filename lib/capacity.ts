const blocked = new Set(["2026-07-20", "2026-07-27"]);

export function getCapacity(date: Date) {
  const iso = date.toISOString().slice(0, 10);
  const day = date.getDay();
  const maxScore = day === 0 ? 0 : day === 6 ? 8 : 12;
  const used = day === 3 ? 10 : day === 5 ? 6 : 3;
  const isBlocked = blocked.has(iso) || maxScore === 0;
  return {
    date: iso,
    maxScore,
    usedScore: isBlocked ? maxScore : used,
    availableScore: Math.max(0, maxScore - (isBlocked ? maxScore : used)),
    isBlocked
  };
}

export function nextAvailableDate(requiredScore: number, start = new Date()) {
  for (let i = 1; i < 30; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const capacity = getCapacity(date);
    if (!capacity.isBlocked && capacity.availableScore >= requiredScore) return capacity.date;
  }
  return "";
}
