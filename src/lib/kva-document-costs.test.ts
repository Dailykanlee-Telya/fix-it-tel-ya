/// <reference types="node" />
import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getKvaItemsTotal } from './kva-document-costs';

describe('KVA document position prices', () => {
  test('includes every position with its quantity and price', () => {
    assert.equal(getKvaItemsTotal([
      { id: 'display', title: 'Display', quantity: 2, unit_price_gross: 49.95 },
      { id: 'work', title: 'Arbeit', quantity: 1, unit_price_gross: 35 },
      { id: 'discount', title: 'Rabatt', quantity: 1, unit_price_gross: -10 },
      { id: 'free', title: 'Prüfung', quantity: 1, unit_price_gross: 0 },
    ]), 124.9);
  });
});