import { describe, it, expect } from 'vitest';
import { woundThreshold, effectiveSave } from './wh40k';

describe('woundThreshold', () => {
  it('is 2+ when strength >= 2*toughness', () => {
    expect(woundThreshold(10, 5)).toBe(2);
  });

  it('is 3+ when strength > toughness', () => {
    expect(woundThreshold(6, 5)).toBe(3);
  });

  it('is 4+ when equal', () => {
    expect(woundThreshold(5, 5)).toBe(4);
  });

  it('is 6+ when strength <= toughness/2', () => {
    expect(woundThreshold(3, 6)).toBe(6);
  });

  it('is 5+ for in-between case', () => {
    expect(woundThreshold(4, 6)).toBe(5);
  });
});

describe('effectiveSave', () => {
  it('applies AP and then takes best save with invuln', () => {
    expect(effectiveSave(3, -2, 4)).toBe(4); // armor becomes 5+, invuln 4+
  });

  it('returns 7 when no save is possible', () => {
    expect(effectiveSave(6, -3, 7)).toBe(7);
  });
});