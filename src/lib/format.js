export function whenLabel(m) {
  return [m.court, m.scheduled_date, m.scheduled_time].filter(Boolean).join(' · ');
}

export function categoryLabel(value) {
  return { singles: 'Singles', doubles: 'Doubles', league: 'League' }[value] ?? value;
}

export function minutesSeconds(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}
