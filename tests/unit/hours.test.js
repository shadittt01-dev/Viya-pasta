import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openStatus, orderSlots, zonedToUtc, zonedParts, openIntervals } from '../../shared/hours.js';

const TZ = 'Asia/Riyadh';
const daily = Array.from({ length: 7 }, (_, weekday) => ({ weekday, opens_local: '17:00', closes_local: '03:00' }));
const at = (iso) => Date.parse(iso);

test('overnight hours: open at 01:00 after the evening shift, closed at 04:00', () => {
  // 2026-10-09 is a Friday. 01:00 Riyadh on Saturday = 22:00 UTC Friday.
  assert.equal(openStatus(daily, [], at('2026-10-09T22:00:00Z'), TZ).open, true);
  const s = openStatus(daily, [], at('2026-10-10T01:00:00Z'), TZ); // 04:00 Riyadh
  assert.equal(s.open, false);
  assert.equal(new Date(s.opensAt).toISOString(), '2026-10-10T14:00:00.000Z'); // 17:00 Riyadh
  const o = openStatus(daily, [], at('2026-10-09T15:00:00Z'), TZ); // 18:00 Riyadh
  assert.equal(new Date(o.closesAt).toISOString(), '2026-10-10T00:00:00.000Z'); // 03:00 Riyadh next day
});

test('a day with no hours is closed; only Friday open', () => {
  const fridayOnly = [{ weekday: 5, opens_local: '17:00', closes_local: '03:00' }];
  assert.equal(openStatus(fridayOnly, [], at('2026-10-08T15:00:00Z'), TZ).open, false); // Thursday 18:00
  assert.equal(openStatus(fridayOnly, [], at('2026-10-09T15:00:00Z'), TZ).open, true); // Friday 18:00
  assert.equal(openStatus(fridayOnly, [], at('2026-10-09T23:30:00Z'), TZ).open, true); // Saturday 02:30 (Friday shift)
});

test('closures remove time from opening hours', () => {
  const closures = [{ starts_at: '2026-10-09T14:00:00Z', ends_at: '2026-10-09T18:00:00Z' }];
  assert.equal(openStatus(daily, closures, at('2026-10-09T15:00:00Z'), TZ).open, false);
  assert.equal(openStatus(daily, closures, at('2026-10-09T19:00:00Z'), TZ).open, true);
});

test('slots: ASAP only while open with enough time before cutoff; scheduled slots are aligned', () => {
  const opts = { prepMinutes: 15, slotMinutes: 15, daysAhead: 1, cutoffMinutes: 15 };
  const open = orderSlots(daily, [], at('2026-10-09T15:07:00Z'), TZ, opts);
  assert.equal(open.asapAvailable, true);
  assert.ok(open.slots.length > 20);
  assert.ok(open.slots.every((t) => t % (15 * 60000) === 0));
  assert.ok(open.slots[0] >= at('2026-10-09T15:22:00Z'));
  const nearClose = orderSlots(daily, [], at('2026-10-09T23:50:00Z'), TZ, opts); // 02:50 Riyadh
  assert.equal(nearClose.asapAvailable, false, 'no ASAP inside the closing cutoff');
  const closed = orderSlots(daily, [], at('2026-10-10T04:00:00Z'), TZ, opts); // 07:00 Riyadh
  assert.equal(closed.asapAvailable, false);
  assert.equal(new Date(closed.slots[0]).toISOString(), '2026-10-10T14:15:00.000Z');
  const lastSlot = closed.slots.filter((t) => t < at('2026-10-11T00:00:00Z')).at(-1);
  assert.equal(new Date(lastSlot).toISOString(), '2026-10-10T23:45:00.000Z', 'last slot respects the 15 min cutoff before 03:00');
});

test('timezone maths handles daylight saving zones', () => {
  // New York: 2026-03-08 02:30 does not exist (spring forward) → moves forward.
  const t = zonedToUtc(2026, 3, 8, 12, 0, 'America/New_York');
  assert.equal(t.toISOString(), '2026-03-08T16:00:00.000Z');
  const winter = zonedToUtc(2026, 1, 15, 12, 0, 'America/New_York');
  assert.equal(winter.toISOString(), '2026-01-15T17:00:00.000Z');
  const p = zonedParts(new Date('2026-10-09T22:30:00Z'), TZ);
  assert.deepEqual([p.d, p.h, p.mi, p.weekday], [10, 1, 30, 6]);
  const ivs = openIntervals([{ weekday: 0, opens_local: '09:00', closes_local: '17:00' }], [], at('2026-03-07T00:00:00Z'), at('2026-03-10T00:00:00Z'), 'America/New_York');
  assert.equal(new Date(ivs[0][0]).toISOString(), '2026-03-08T13:00:00.000Z', 'Sunday 09:00 EDT after the change');
});
