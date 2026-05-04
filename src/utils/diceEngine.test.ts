import { describe, it, expect } from 'vitest';
import { parseDiceNotation, formatDiceNotation, resolveValue } from './diceEngine';

describe('parseDiceNotation', () => {
  it('parses d6', () => {
    expect(parseDiceNotation('d6')).toEqual({ count: 1, sides: 6, modifier: 0 });
  });

  it('parses 2d6+1', () => {
    expect(parseDiceNotation('2d6+1')).toEqual({ count: 2, sides: 6, modifier: 1 });
  });

  it('parses integer as fixed value', () => {
    expect(parseDiceNotation('3')).toEqual({ count: 1, sides: 1, modifier: 2 });
  });

  it('returns null for invalid notation', () => {
    expect(parseDiceNotation('abc')).toBeNull();
  });
});

describe('formatDiceNotation', () => {
  it('formats uppercase D and preserves modifier', () => {
    expect(formatDiceNotation('2d6+1')).toBe('2D6+1');
  });

  it('formats integer notation', () => {
    expect(formatDiceNotation('5')).toBe('5');
  });
});

describe('resolveValue', () => {
  it('uses fallback for invalid', () => {
    expect(resolveValue('bad', 7)).toBe(7);
  });

  it('returns integer value literally', () => {
    expect(resolveValue('5')).toBe(5);
  });
});