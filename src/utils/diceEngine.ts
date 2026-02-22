/**
 * Core dice rolling utilities.
 */

/** Roll a single die with `sides` faces. */
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/** Roll `count` dice of `sides` faces and return all individual results. */
export function rollDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => rollDie(sides));
}

/**
 * Parse a dice notation string like "d6", "2d6", "d3+1", "3" and
 * return { count, sides, modifier }.
 * Returns null if the string cannot be parsed.
 */
export function parseDiceNotation(raw: string): {
  count: number;
  sides: number;
  modifier: number;
} | null {
  const cleaned = raw.trim().toLowerCase().replace(/\s/g, '');

  // Plain integer
  if (/^\d+$/.test(cleaned)) {
    return { count: 1, sides: 1, modifier: parseInt(cleaned, 10) - 1 };
  }

  // e.g. "d6", "2d6", "d6+1", "2d6-2"
  const match = cleaned.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!match) return null;

  const count = match[1] ? parseInt(match[1], 10) : 1;
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;
  return { count, sides, modifier };
}

/**
 * Resolve a dice notation string to a single numeric value by rolling.
 * Falls back to the closest integer if parsing fails.
 */
export function resolveValue(raw: string, fallback = 1): number {
  if (!raw || raw.trim() === '') return fallback;
  const parsed = parseDiceNotation(raw.trim());
  if (!parsed) return fallback;
  if (parsed.sides === 1) return parsed.modifier + 1; // plain integer case
  const total = rollDice(parsed.count, parsed.sides).reduce((a, b) => a + b, 0);
  return Math.max(1, total + parsed.modifier);
}

/**
 * Return a human-readable label for a dice value, e.g. "d6+1" → "D6+1".
 */
export function formatDiceNotation(raw: string): string {
  const parsed = parseDiceNotation(raw.trim());
  if (!parsed) return raw;
  if (parsed.sides === 1) return String(parsed.modifier + 1);
  const countPart = parsed.count > 1 ? String(parsed.count) : '';
  const modPart =
    parsed.modifier > 0
      ? `+${parsed.modifier}`
      : parsed.modifier < 0
      ? String(parsed.modifier)
      : '';
  return `${countPart}D${parsed.sides}${modPart}`;
}

/** Apply a reroll rule to a single die roll. */
export function applyReroll(
  roll: number,
  sides: number,
  rule: 'none' | 'ones' | 'all'
): number {
  if (rule === 'none') return roll;
  if (rule === 'ones' && roll === 1) return rollDie(sides);
  if (rule === 'all') return rollDie(sides);
  return roll;
}

/** Generate a UUID-like ID. */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Compute distribution map from an array of numbers. */
export function computeDistribution(values: number[]): Record<number, number> {
  const dist: Record<number, number> = {};
  for (const v of values) {
    dist[v] = (dist[v] ?? 0) + 1;
  }
  return dist;
}

/** Calculate average of an array. */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
