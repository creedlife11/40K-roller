export type DiceType = 4 | 6 | 8 | 10 | 12 | 20 | 100;
export type SkillValue = 2 | 3 | 4 | 5 | 6;
export type RerollOption = 'none' | 'ones' | 'all';

export interface StandardRoll {
  id: string;
  timestamp: number;
  type: 'standard';
  diceType: number;
  count: number;
  modifier: number;
  rolls: number[];
  total: number;
}

export interface CombatInput {
  attackerName: string;
  targetName: string;
  // Attacker
  attacksRaw: string;
  skill: SkillValue;
  strength: number;
  ap: number;
  damageRaw: string;
  // Special rules
  torrent: boolean;
  lethalHits: boolean;
  sustainedHits: number;
  rerollHits: RerollOption;
  rerollWounds: RerollOption;
  devastatingWounds: boolean;
  twinLinked: boolean;
  // Target
  toughness: number;
  save: number;   // 2-7 where 7 = no save
  invuln: number; // 2-7 where 7 = no invuln
  fnp: number;    // 2-7 where 7 = no FNP
}

export interface CombatResult {
  attacks: number;
  hits: number;
  wounds: number;
  savesFailed: number;
  mortals: number;
  damageDealt: number;
  hitRolls: number[];
  woundRolls: number[];
  saveRolls: number[];
  damageRolls: number[];
}

export interface WH40KRoll {
  id: string;
  timestamp: number;
  type: 'wh40k';
  input: CombatInput;
  result: CombatResult;
}

export interface CustomDie {
  id: string;
  name: string;
  sides: number;
  modifier: number;
  rerollOnes: boolean;
  color: string;
}

export interface CustomRoll {
  id: string;
  timestamp: number;
  type: 'custom';
  dieName: string;
  dieSides: number;
  count: number;
  modifier: number;
  rolls: number[];
  total: number;
}

export type HistoryEntry = StandardRoll | WH40KRoll | CustomRoll;

// ── Unit database types (sourced from BSData / wh40k-10e) ──────────────────

export interface WeaponProfile {
  id: string;
  name: string;
  type: 'ranged' | 'melee';
  range: string;       // e.g. "24\"", "Melee"
  attacks: string;     // e.g. "2", "d6", "d3+1"
  skill: number;       // target number: 3 = "3+"
  strength: number;
  ap: number;          // 0, -1, -2 …
  damage: string;      // e.g. "1", "d3", "d6+2"
  keywords: string[];  // RAPID FIRE 1, LETHAL HITS, TORRENT …
}

export interface UnitProfile {
  id: string;
  name: string;
  faction: string;
  keywords: string[];
  stats: {
    move: number;
    toughness: number;
    save: number;     // 2-6; 7 = no save
    wounds: number;
    leadership: number;
    oc: number;
    invuln?: number;  // optional, 2-6; 7 = none
    fnp?: number;     // feel no pain, optional
  };
  weapons: WeaponProfile[];
}
