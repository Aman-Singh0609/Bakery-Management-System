import { describe, expect, it } from 'vitest';
import { paginationMeta, skipTake } from '../src/lib/pagination';
import { money } from '../src/lib/money';

describe('pagination', () => {
  it('computes skip/take', () => {
    expect(skipTake(3, 20)).toEqual({ skip: 40, take: 20 });
  });

  it('computes meta', () => {
    expect(paginationMeta(2, 10, 25)).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
    });
  });
});

describe('money', () => {
  it('serialises decimals with two places', () => {
    expect(money('12.5')).toBe('12.50');
    expect(money(0)).toBe('0.00');
  });
});
