#!/usr/bin/env node
/**
 * BSData Warhammer 40K 10th Edition parser
 *
 * Downloads faction catalogues from https://github.com/BSData/wh40k-10e
 * and converts them into src/data/units.json used by the app.
 *
 * Usage:
 *   node scripts/parse-bsdata.mjs
 *
 * Requires:
 *   npm install --save-dev fast-xml-parser
 *
 * Node 18+ required (uses built-in fetch).
 */

import { XMLParser } from 'fast-xml-parser';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, '../src/data/units.json');

const GITHUB_API  = 'https://api.github.com/repos/BSData/wh40k-10e/contents/';
const GITHUB_RAW  = 'https://raw.githubusercontent.com/BSData/wh40k-10e/main/';
const USER_AGENT  = '40k-roller-parser/1.0';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) =>
    ['selectionEntry', 'sharedSelectionEntry', 'profile', 'characteristic',
     'selectionEntryGroup', 'entryLink', 'catalogue'].includes(name),
});

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
}

// ── Parsing helpers ──────────────────────────────────────────────────────────

function getChar(characteristics, name) {
  if (!Array.isArray(characteristics)) return '';
  const c = characteristics.find((c) => c['@_name'] === name);
  return c ? String(c['#text'] ?? c['@_value'] ?? '').trim() : '';
}

function parseSaveStr(str) {
  if (!str) return 7;
  const n = parseInt(str, 10);
  return isNaN(n) ? 7 : n;
}

function parseMove(str) {
  if (!str) return 6;
  const n = parseInt(str, 10);
  return isNaN(n) ? 6 : n;
}

function parseAP(str) {
  if (!str || str === '-') return 0;
  const n = parseInt(str, 10);
  return isNaN(n) ? 0 : n;
}

function parseSkill(str) {
  if (!str) return 4;
  const n = parseInt(str, 10);
  return isNaN(n) ? 4 : n;
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseKeywords(str) {
  if (!str || str === '-') return [];
  return str.split(',').map((k) => k.trim()).filter(Boolean);
}

// ── Profile extractors ───────────────────────────────────────────────────────

function extractUnitStats(profile) {
  const chars = profile?.characteristics?.characteristic ?? [];
  return {
    move:       parseMove(getChar(chars, 'M')),
    toughness:  parseInt(getChar(chars, 'T'), 10) || 4,
    save:       parseSaveStr(getChar(chars, 'SV')),
    wounds:     parseInt(getChar(chars, 'W'), 10) || 1,
    leadership: parseSaveStr(getChar(chars, 'LD')),
    oc:         parseInt(getChar(chars, 'OC'), 10) || 1,
  };
}

function extractWeapon(profile, type) {
  const chars = profile?.characteristics?.characteristic ?? [];
  const name  = profile['@_name'] ?? 'Unknown';
  const bsws  = type === 'ranged' ? getChar(chars, 'BS') : getChar(chars, 'WS');
  const damage = getChar(chars, 'D') || '1';
  const attacks = getChar(chars, 'A') || '1';
  const keywords = parseKeywords(getChar(chars, 'Keywords'));

  return {
    id:       slugify(name),
    name,
    type,
    range:    type === 'melee' ? 'Melee' : (getChar(chars, 'Range') || '24"'),
    attacks:  attacks.toLowerCase(),
    skill:    parseSkill(bsws),
    strength: parseInt(getChar(chars, 'S'), 10) || 4,
    ap:       parseAP(getChar(chars, 'AP')),
    damage:   damage.toLowerCase(),
    keywords,
  };
}

// ── Catalogue processor ──────────────────────────────────────────────────────

function processEntry(entry, factionName) {
  if (!entry || entry['@_type'] !== 'unit') return null;

  const unitName = entry['@_name'];
  if (!unitName) return null;

  const profiles = [
    ...(entry?.profiles?.profile ?? []),
  ];

  let stats = null;
  const weapons = [];

  for (const profile of profiles) {
    const typeName = profile['@_typeName'] ?? '';
    if (typeName === 'Unit' && !stats) {
      stats = extractUnitStats(profile);
    } else if (typeName === 'Ranged Weapons') {
      weapons.push(extractWeapon(profile, 'ranged'));
    } else if (typeName === 'Melee Weapons') {
      weapons.push(extractWeapon(profile, 'melee'));
    }
  }

  if (!stats || weapons.length === 0) return null;

  return {
    id:       slugify(`${factionName}-${unitName}`),
    name:     unitName,
    faction:  factionName,
    keywords: [],
    stats,
    weapons,
  };
}

function parseCatalogue(xml, factionName) {
  let root;
  try {
    root = parser.parse(xml);
  } catch (e) {
    console.warn(`  ⚠ XML parse error: ${e.message}`);
    return [];
  }

  const catalogue = root?.catalogue ?? root?.gameSystem;
  if (!catalogue) return [];

  const entries = [
    ...(catalogue?.sharedSelectionEntries?.selectionEntry ?? []),
    ...(catalogue?.selectionEntries?.selectionEntry ?? []),
  ];

  const units = [];
  for (const entry of entries) {
    const unit = processEntry(entry, factionName);
    if (unit) units.push(unit);
  }
  return units;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📡 Fetching BSData file list...');
  const files = await fetchJSON(GITHUB_API);
  const catFiles = files.filter((f) => f.name.endsWith('.cat') && !f.name.includes('Legends'));

  console.log(`📂 Found ${catFiles.length} catalogue files\n`);

  const allUnits = [];
  const seen = new Set();

  for (const file of catFiles) {
    const factionName = file.name.replace(/\.cat$/, '');
    process.stdout.write(`  Parsing ${factionName}...`);

    try {
      const xml = await fetchText(GITHUB_RAW + file.name);
      const units = parseCatalogue(xml, factionName);

      for (const unit of units) {
        if (!seen.has(unit.id)) {
          seen.add(unit.id);
          allUnits.push(unit);
        }
      }
      console.log(` ✓ (${units.length} units)`);
    } catch (e) {
      console.log(` ✗ ${e.message}`);
    }

    // Polite delay to avoid hammering GitHub
    await new Promise((r) => setTimeout(r, 300));
  }

  const output = {
    version: '10e',
    source:  'BSData/wh40k-10e (community data)',
    generated: new Date().toISOString(),
    units: allUnits,
  };

  mkdirSync(resolve(__dirname, '../src/data'), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf8');

  console.log(`\n✅ Wrote ${allUnits.length} units to ${OUTPUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
