export function parseDMY(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad(n) {
  return n < 10 ? `0${n}` : String(n);
}

export function formatDMY(d) {
  if (!(d instanceof Date)) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function addMonthsClampEndOfMonth(d, m) {
  const date = new Date(d.getTime());
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + m);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return date;
}

export function fullMonthsBetween(from, to) {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return months < 0 ? 0 : months;
}
