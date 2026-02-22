/**
 * Warhammer 40,000 10th edition combat simulation engine.
 *
 * Attack sequence:
 *   1. Determine attacks
 *   2. Hit rolls  (skip if Torrent)
 *   3. Wound rolls
 *   4. Saving throws
 *   5. Damage & Feel No Pain
 */

import { CombatInput, CombatResult } from '../types';
import { rollDie, resolveValue } from './diceEngine';

/** Returns the wound roll threshold based on Strength vs Toughness. */
export function woundThreshold(strength: number, toughness: number): number {
  if (strength >= toughness * 2) return 2;
  if (strength > toughness) return 3;
  if (strength === toughness) return 4;
  if (strength * 2 <= toughness) return 6;
  return 5; // strength < toughness but not ≤ half
}

/**
 * Compute effective save target (accounting for AP and invulnerable save).
 * Returns 7 if there is effectively no save.
 */
export function effectiveSave(
  armorSave: number,
  ap: number,
  invuln: number
): number {
  const modifiedArmor = armorSave - ap; // AP is negative, so subtracting makes it harder
  const best = Math.min(modifiedArmor, invuln);
  return best > 6 ? 7 : best;
}

/** Simulate a full attack sequence. */
export function simulateCombat(input: CombatInput): CombatResult {
  const {
    attacksRaw,
    skill,
    strength,
    ap,
    damageRaw,
    torrent,
    lethalHits,
    sustainedHits,
    rerollHits,
    rerollWounds,
    devastatingWounds,
    twinLinked,
    toughness,
    save,
    invuln,
    fnp,
  } = input;

  const hitRolls: number[] = [];
  const woundRolls: number[] = [];
  const saveRolls: number[] = [];
  const damageRolls: number[] = [];

  // ── Step 1: Determine attacks ─────────────────────────────────────────────
  const attacks = resolveValue(attacksRaw, 1);

  // ── Step 2: Hit rolls ─────────────────────────────────────────────────────
  let hits = 0;
  let extraHitsFromSustained = 0;
  let autoWoundsFromLethal = 0;

  if (torrent) {
    hits = attacks;
  } else {
    for (let i = 0; i < attacks; i++) {
      let roll = rollDie(6);

      // Reroll misses
      if (rerollHits === 'all' && roll < skill) {
        roll = rollDie(6);
      } else if (rerollHits === 'ones' && roll === 1) {
        roll = rollDie(6);
      }

      hitRolls.push(roll);

      if (roll === 1) continue; // 1 always fails

      const isCrit = roll === 6;

      if (isCrit && lethalHits) {
        autoWoundsFromLethal++;
        // A lethal hit is still a hit for sustained hits purposes
        if (isCrit && sustainedHits > 0) {
          extraHitsFromSustained += sustainedHits;
        }
        continue; // does not proceed to wound roll
      }

      if (isCrit && sustainedHits > 0) {
        extraHitsFromSustained += sustainedHits;
      }

      if (roll >= skill) {
        hits++;
      }
    }
    hits += extraHitsFromSustained;
  }

  const totalHits = hits;

  // ── Step 3: Wound rolls ───────────────────────────────────────────────────
  const woundTarget = woundThreshold(strength, toughness);
  let wounds = autoWoundsFromLethal; // lethal hits skip wound roll
  let mortals = 0;

  for (let i = 0; i < totalHits; i++) {
    let roll = rollDie(6);

    // Twin-linked = reroll failed wounds
    if (twinLinked && roll < woundTarget) {
      roll = rollDie(6);
    } else if (rerollWounds === 'all' && roll < woundTarget) {
      roll = rollDie(6);
    } else if (rerollWounds === 'ones' && roll === 1) {
      roll = rollDie(6);
    }

    woundRolls.push(roll);

    if (roll === 1) continue; // 1 always fails

    const isCrit = roll === 6;

    if (isCrit && devastatingWounds) {
      // Devastating wounds: crit wound → mortal wound, skip save
      const dmg = resolveValue(damageRaw, 1);
      mortals += dmg;
      damageRolls.push(dmg);
      continue;
    }

    if (roll >= woundTarget) {
      wounds++;
    }
  }

  // ── Step 4: Saving throws ─────────────────────────────────────────────────
  const saveTarget = effectiveSave(save, ap, invuln);
  let savesFailed = 0;

  for (let i = 0; i < wounds; i++) {
    if (saveTarget >= 7) {
      // No save available
      savesFailed++;
      saveRolls.push(0);
    } else {
      const roll = rollDie(6);
      saveRolls.push(roll);
      if (roll < saveTarget) {
        savesFailed++;
      }
    }
  }

  // ── Step 5: Damage & FNP ─────────────────────────────────────────────────
  let totalDamage = 0;

  for (let i = 0; i < savesFailed; i++) {
    const dmg = resolveValue(damageRaw, 1);
    damageRolls.push(dmg);

    // Feel No Pain
    let actualDmg = dmg;
    if (fnp < 7) {
      let negated = 0;
      for (let d = 0; d < dmg; d++) {
        if (rollDie(6) >= fnp) negated++;
      }
      actualDmg = Math.max(0, dmg - negated);
    }
    totalDamage += actualDmg;
  }

  // Mortal wounds also go through FNP
  let actualMortals = 0;
  if (mortals > 0) {
    if (fnp < 7) {
      for (let d = 0; d < mortals; d++) {
        if (rollDie(6) < fnp) actualMortals++;
      }
    } else {
      actualMortals = mortals;
    }
    totalDamage += actualMortals;
  }

  return {
    attacks,
    hits: totalHits,
    wounds: wounds + autoWoundsFromLethal,
    savesFailed,
    mortals: actualMortals,
    damageDealt: totalDamage,
    hitRolls,
    woundRolls,
    saveRolls,
    damageRolls,
  };
}

/** Skill value options for UI display. */
export const SKILL_OPTIONS: { label: string; value: number }[] = [
  { label: '2+', value: 2 },
  { label: '3+', value: 3 },
  { label: '4+', value: 4 },
  { label: '5+', value: 5 },
  { label: '6+', value: 6 },
];

/** Save value options (including "none"). */
export const SAVE_OPTIONS: { label: string; value: number }[] = [
  { label: '2+', value: 2 },
  { label: '3+', value: 3 },
  { label: '4+', value: 4 },
  { label: '5+', value: 5 },
  { label: '6+', value: 6 },
  { label: 'None', value: 7 },
];

/** Invulnerable save options. */
export const INVULN_OPTIONS: { label: string; value: number }[] = [
  { label: '3+', value: 3 },
  { label: '4+', value: 4 },
  { label: '5+', value: 5 },
  { label: '6+', value: 6 },
  { label: 'None', value: 7 },
];

/** FNP options. */
export const FNP_OPTIONS: { label: string; value: number }[] = [
  { label: '4+', value: 4 },
  { label: '5+', value: 5 },
  { label: '6+', value: 6 },
  { label: 'None', value: 7 },
];

/** AP options. */
export const AP_OPTIONS: { label: string; value: number }[] = [
  { label: '0', value: 0 },
  { label: '-1', value: -1 },
  { label: '-2', value: -2 },
  { label: '-3', value: -3 },
  { label: '-4', value: -4 },
  { label: '-5', value: -5 },
  { label: '-6', value: -6 },
];

/** Common attack value presets. */
export const ATTACK_PRESETS = ['1', '2', '3', '4', '5', '6', 'd3', 'd6', 'd3+3', '2d6'];

/** Common damage value presets. */
export const DAMAGE_PRESETS = ['1', '2', '3', 'd3', 'd6', '2', 'd3+1', 'd6+2'];
