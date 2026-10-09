// Opening-hours engine. Pure functions, browser-safe.
// Hours are stored as local wall-clock times in the branch timezone. A row
// whose closing time is <= its opening time runs past midnight (e.g. 17:00–03:00).
// Uses Intl for timezone maths so DST zones work too (Asia/Riyadh has no DST).

const fmtCache = new Map();
function partsFormatter(tz) {
  if (!fmtCache.has(tz)) {
    fmtCache.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short',
    }));
  }
  return fmtCache.get(tz);
}
const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Wall-clock parts of an instant in a timezone. */
export function zonedParts(date, tz) {
  const p = Object.fromEntries(partsFormatter(tz).formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second, weekday: WEEKDAYS[p.weekday] };
}

function offsetMinutes(date, tz) {
  const p = zonedParts(date, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** Local wall time in tz → UTC Date. Handles DST gaps by moving forward. */
export function zonedToUtc(y, m, d, h, mi, tz) {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let off = offsetMinutes(new Date(guess), tz);
  let t = guess - off * 60000;
  const off2 = offsetMinutes(new Date(t), tz);
  if (off2 !== off) t = guess - off2 * 60000;
  return new Date(t);
}

export function parseHHMM(s) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s));
  if (!m) throw new Error(`Invalid time ${s}`);
  return { h: +m[1], mi: +m[2] };
}

function addDaysLocal(y, m, d, n) {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), weekday: t.getUTCDay() };
}

/**
 * Concrete open intervals (UTC ms) overlapping [fromMs, toMs].
 * hours: [{weekday, opens_local, closes_local}], closures: [{starts_at, ends_at}]
 */
export function openIntervals(hours, closures, fromMs, toMs, tz) {
  const start = zonedParts(new Date(fromMs), tz);
  const out = [];
  const days = Math.ceil((toMs - fromMs) / 86400000) + 2;
  for (let i = -1; i <= days; i++) {
    const day = addDaysLocal(start.y, start.m, start.d, i);
    for (const row of hours) {
      if (row.weekday !== day.weekday) continue;
      const o = parseHHMM(row.opens_local);
      const c = parseHHMM(row.closes_local);
      const s = zonedToUtc(day.y, day.m, day.d, o.h, o.mi, tz).getTime();
      const overnight = c.h * 60 + c.mi <= o.h * 60 + o.mi;
      const endDay = overnight ? addDaysLocal(day.y, day.m, day.d, 1) : day;
      const e = zonedToUtc(endDay.y, endDay.m, endDay.d, c.h, c.mi, tz).getTime();
      if (e > fromMs && s < toMs) out.push([s, e]);
    }
  }
  out.sort((a, b) => a[0] - b[0]);
  // merge touching intervals (e.g. 12:00–17:00 and 17:00–03:00)
  const merged = [];
  for (const iv of out) {
    const last = merged[merged.length - 1];
    if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
    else merged.push([...iv]);
  }
  return subtractClosures(merged, closures || []);
}

function subtractClosures(intervals, closures) {
  let res = intervals;
  for (const c of closures) {
    const cs = Date.parse(c.starts_at), ce = Date.parse(c.ends_at);
    if (!(ce > cs)) continue;
    const next = [];
    for (const [s, e] of res) {
      if (ce <= s || cs >= e) { next.push([s, e]); continue; }
      if (cs > s) next.push([s, cs]);
      if (ce < e) next.push([ce, e]);
    }
    res = next;
  }
  return res;
}

export function openStatus(hours, closures, nowMs, tz) {
  const ivs = openIntervals(hours, closures, nowMs - 86400000, nowMs + 8 * 86400000, tz);
  const current = ivs.find(([s, e]) => s <= nowMs && nowMs < e);
  if (current) return { open: true, closesAt: current[1], opensAt: null };
  const next = ivs.find(([s]) => s > nowMs);
  return { open: false, closesAt: null, opensAt: next ? next[0] : null };
}

/**
 * Orderable time slots.
 * opts: { prepMinutes, slotMinutes, daysAhead, cutoffMinutes, asap }
 * Returns { asapAvailable, asapReadyAt, slots: [ms...] }
 */
export function orderSlots(hours, closures, nowMs, tz, opts) {
  const { prepMinutes = 15, slotMinutes = 15, daysAhead = 1, cutoffMinutes = 15 } = opts;
  const horizon = nowMs + (daysAhead + 1) * 86400000;
  const ivs = openIntervals(hours, closures, nowMs, horizon, tz);
  const earliest = nowMs + prepMinutes * 60000;
  const status = openStatus(hours, closures, nowMs, tz);
  const asapAvailable = Boolean(opts.asap !== false && status.open && status.closesAt - cutoffMinutes * 60000 > nowMs);
  const slots = [];
  const step = slotMinutes * 60000;
  const endOfWindow = (() => {
    const p = zonedParts(new Date(nowMs), tz);
    const last = addDaysLocal(p.y, p.m, p.d, daysAhead + 1);
    return zonedToUtc(last.y, last.m, last.d, 6, 0, tz).getTime(); // overnight trade ends by 06:00
  })();
  for (const [s, e] of ivs) {
    const lastSlot = e - cutoffMinutes * 60000;
    let t = Math.max(s + prepMinutes * 60000, earliest);
    t = Math.ceil(t / step) * step;
    for (; t <= lastSlot && t <= endOfWindow; t += step) slots.push(t);
  }
  return { asapAvailable, asapReadyAt: asapAvailable ? earliest : null, slots, status };
}

export function isSlotValid(hours, closures, nowMs, tz, opts, slotMs) {
  const { slots } = orderSlots(hours, closures, nowMs, tz, opts);
  return slots.includes(slotMs);
}

export function formatLocalTime(ms, tz, lang) {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(ms));
}

export function formatLocalDay(ms, tz, lang, nowMs = Date.now()) {
  const a = zonedParts(new Date(ms), tz), b = zonedParts(new Date(nowMs), tz);
  const tomorrow = addDaysLocal(b.y, b.m, b.d, 1);
  if (a.y === b.y && a.m === b.m && a.d === b.d) return lang === 'ar' ? 'اليوم' : 'Today';
  if (a.y === tomorrow.y && a.m === tomorrow.m && a.d === tomorrow.d) return lang === 'ar' ? 'غدًا' : 'Tomorrow';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(ms));
}
