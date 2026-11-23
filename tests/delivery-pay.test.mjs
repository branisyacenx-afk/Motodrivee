import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDeliveryPay } from '../src/lib/deliveryPay.ts';

test('preserves a valid whole-number delivery payout', () => {
  assert.equal(normalizeDeliveryPay(125), 125);
});

test('keeps the existing nearest-whole-currency rounding', () => {
  assert.equal(normalizeDeliveryPay(124.6), 125);
  assert.equal(normalizeDeliveryPay(124.4), 124);
});

test('does not allow negative payouts', () => {
  assert.equal(normalizeDeliveryPay(-20), 0);
  assert.equal(normalizeDeliveryPay(-0.4), 0);
});

test('converts NaN into a zero payout', () => {
  assert.equal(normalizeDeliveryPay(Number.NaN), 0);
});

test('converts positive and negative infinity into zero payouts', () => {
  assert.equal(normalizeDeliveryPay(Number.POSITIVE_INFINITY), 0);
  assert.equal(normalizeDeliveryPay(Number.NEGATIVE_INFINITY), 0);
});
