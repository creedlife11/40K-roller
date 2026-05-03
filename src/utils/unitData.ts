import rawData from '../data/units.json';
import { UnitProfile } from '../types';

const UNITS: UnitProfile[] = rawData.units as UnitProfile[];

export const ALL_FACTIONS = [...new Set(UNITS.map((u) => u.faction))].sort();

export function getAllUnits(): UnitProfile[] {
  return UNITS;
}

export function searchUnits(query: string, faction?: string): UnitProfile[] {
  const q = query.toLowerCase().trim();
  return UNITS.filter((u) => {
    const matchesFaction = !faction || u.faction === faction;
    const matchesQuery =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.faction.toLowerCase().includes(q) ||
      u.keywords.some((k) => k.toLowerCase().includes(q));
    return matchesFaction && matchesQuery;
  });
}

export function getUnitById(id: string): UnitProfile | undefined {
  return UNITS.find((u) => u.id === id);
}

/** Parse a "3+" save string into a number (3). Returns 7 for "None"/missing. */
export function parseSave(raw: string | number | undefined): number {
  if (raw === undefined || raw === null) return 7;
  if (typeof raw === 'number') return raw;
  const n = parseInt(String(raw), 10);
  return isNaN(n) ? 7 : n;
}
