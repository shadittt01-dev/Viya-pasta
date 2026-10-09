import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMajor, toMajorString, formatMoney, inclusiveTaxPortion, applyRateBp, exponentOf } from '../../shared/money.js';
import { emptyCart, addLine, setQty, removeLine, editLine, normalizeCart, itemCount, lineKey } from '../../shared/cart.js';

test('money: minor units respect each currency exponent', () => {
  assert.equal(parseMajor('24', 'SAR'), 2400);
  assert.equal(parseMajor('24.5', 'SAR'), 2450);
  assert.equal(parseMajor('1.234', 'KWD'), 1234);
  assert.equal(parseMajor('500', 'JPY'), 500);
  assert.equal(parseMajor('٢٤', 'SAR'), 2400, 'Arabic-Indic digits are accepted');
  assert.throws(() => parseMajor('1.234', 'SAR'));
  assert.throws(() => parseMajor('abc', 'SAR'));
  assert.equal(toMajorString(2400, 'SAR'), '24.00');
  assert.equal(toMajorString(5, 'KWD'), '0.005');
  assert.equal(toMajorString(500, 'JPY'), '500');
  assert.equal(exponentOf('BHD'), 3);
});

test('money: display drops decimals only for whole amounts', () => {
  assert.match(formatMoney(2400, 'SAR', 'en'), /SAR\s?24$/);
  assert.match(formatMoney(2450, 'SAR', 'en'), /24\.50/);
  assert.match(formatMoney(2400, 'SAR', 'ar'), /24/);
});

test('money: VAT portion of an inclusive total and rate application', () => {
  assert.equal(inclusiveTaxPortion(11500, 1500), 1500);
  assert.equal(inclusiveTaxPortion(2400, 1500), 313); // 2400 - round(2400/1.15)=2087
  assert.equal(applyRateBp(10000, 1500), 1500);
  assert.equal(applyRateBp(3, 5000), 2); // half-up
});

test('cart: identical configurations merge, different ones stay separate', () => {
  let c = emptyCart(1);
  c = addLine(c, { itemId: 2, qty: 1 });
  for (let i = 0; i < 4; i++) c = addLine(c, { itemId: 2, qty: 1 });
  assert.equal(c.lines.length, 1);
  assert.equal(c.lines[0].qty, 5);
  assert.equal(itemCount(c), 5);
  c = addLine(c, { itemId: 5, optionIds: [1], qty: 1 });
  c = addLine(c, { itemId: 5, optionIds: [2], qty: 2 });
  c = addLine(c, { itemId: 5, optionIds: [1], qty: 1 });
  assert.equal(c.lines.length, 3);
  assert.equal(c.lines.find((l) => l.key === lineKey(5, [1])).qty, 2);
  assert.equal(lineKey(5, [3, 1]), lineKey(5, [1, 3]), 'option order does not matter');
  assert.notEqual(lineKey(5, [1], 'no onion'), lineKey(5, [1]), 'a kitchen note makes a separate line');
});

test('cart: quantity edits, removal, editing options merges into an existing line', () => {
  let c = addLine(addLine(emptyCart(1), { itemId: 5, optionIds: [1], qty: 1 }), { itemId: 5, optionIds: [2], qty: 1 });
  c = setQty(c, lineKey(5, [1]), 3);
  assert.equal(itemCount(c), 4);
  c = editLine(c, lineKey(5, [1]), { optionIds: [2] });
  assert.equal(c.lines.length, 1);
  assert.equal(c.lines[0].qty, 4);
  c = setQty(c, c.lines[0].key, 0);
  assert.equal(c.lines.length, 0);
  c = addLine(c, { itemId: 9, qty: 50 });
  assert.equal(c.lines[0].qty, 20, 'per-line quantity is capped');
  assert.equal(removeLine(c, c.lines[0].key).lines.length, 0);
});

test('cart: persisted data is normalised and corrupt data is discarded', () => {
  const restored = normalizeCart({ v: 2, branch: 1, lines: [{ itemId: 2, qty: 2 }, { itemId: 2, qty: 3 }, { itemId: 'x', qty: 1 }, { itemId: 3, qty: -1 }] });
  assert.equal(restored.lines.length, 1);
  assert.equal(restored.lines[0].qty, 5);
  assert.deepEqual(normalizeCart('garbage').lines, []);
  assert.deepEqual(normalizeCart({ v: 1, lines: [{ itemId: 1, qty: 1 }] }).lines, [], 'old cart versions are reset');
});
