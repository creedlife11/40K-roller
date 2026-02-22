import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Switch,
  Modal,
  Vibration,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONTS } from '../theme';
import {
  simulateCombat,
  SKILL_OPTIONS,
  SAVE_OPTIONS,
  INVULN_OPTIONS,
  FNP_OPTIONS,
  AP_OPTIONS,
  ATTACK_PRESETS,
  DAMAGE_PRESETS,
} from '../utils/wh40k';
import { generateId } from '../utils/diceEngine';
import { useStorage } from '../hooks/useStorage';
import { CombatInput, WH40KRoll, HistoryEntry } from '../types';

const DEFAULT_INPUT: CombatInput = {
  attackerName: 'Space Marine',
  targetName: 'Ork Boy',
  attacksRaw: '3',
  skill: 3,
  strength: 4,
  ap: -1,
  damageRaw: '1',
  torrent: false,
  lethalHits: false,
  sustainedHits: 0,
  rerollHits: 'none',
  rerollWounds: 'none',
  devastatingWounds: false,
  twinLinked: false,
  toughness: 5,
  save: 6,
  invuln: 7,
  fnp: 7,
};

// ── Small selector component ────────────────────────────────────────────────
function Selector<T extends number | string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={selStyles.wrap}>
      <Text style={selStyles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={selStyles.row}>
        {options.map((o) => (
          <TouchableOpacity
            key={String(o.value)}
            style={[selStyles.opt, o.value === value && selStyles.optActive]}
            onPress={() => onChange(o.value)}
            activeOpacity={0.75}
          >
            <Text style={[selStyles.optText, o.value === value && selStyles.optTextActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const selStyles = StyleSheet.create({
  wrap: { marginBottom: SPACING.md },
  label: { color: COLORS.textSecondary, fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginBottom: SPACING.xs },
  row: { flexDirection: 'row', gap: SPACING.xs },
  opt: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optActive: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primary },
  optText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  optTextActive: { color: COLORS.text, fontWeight: '700' },
});

// ── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({
  label,
  value,
  min = 1,
  max = 20,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={stpStyles.wrap}>
      <Text style={stpStyles.label}>{label}</Text>
      <View style={stpStyles.row}>
        <TouchableOpacity style={stpStyles.btn} onPress={() => onChange(Math.max(min, value - 1))}>
          <Text style={stpStyles.btnText}>−</Text>
        </TouchableOpacity>
        <Text style={stpStyles.val}>{value}</Text>
        <TouchableOpacity style={stpStyles.btn} onPress={() => onChange(Math.min(max, value + 1))}>
          <Text style={stpStyles.btnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const stpStyles = StyleSheet.create({
  wrap: { flex: 1 },
  label: { color: COLORS.textSecondary, fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginBottom: SPACING.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  btn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: COLORS.text, fontSize: 18, fontWeight: '700', lineHeight: 22 },
  val: { color: COLORS.text, fontSize: 18, fontWeight: '700', minWidth: 28, textAlign: 'center' },
});

// ── Result phase box ─────────────────────────────────────────────────────────
function PhaseBox({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <View style={[pbStyles.box, highlight && pbStyles.boxHighlight]}>
      <Text style={pbStyles.label}>{label}</Text>
      <Text style={[pbStyles.value, highlight && pbStyles.valueHighlight]}>{value}</Text>
      {sub ? <Text style={pbStyles.sub}>{sub}</Text> : null}
    </View>
  );
}

const pbStyles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  boxHighlight: { borderColor: COLORS.secondary, backgroundColor: '#1a1600' },
  label: { color: COLORS.textSecondary, fontSize: 9, letterSpacing: 1.5, fontWeight: '700', marginBottom: 2 },
  value: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  valueHighlight: { color: COLORS.secondary },
  sub: { color: COLORS.textMuted, fontSize: 10 },
});

// ── Roll dice modal ──────────────────────────────────────────────────────────
function DiceModal({
  visible,
  title,
  rolls,
  threshold,
  onClose,
}: {
  visible: boolean;
  title: string;
  rolls: number[];
  threshold?: number;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={dmStyles.overlay}>
        <View style={dmStyles.card}>
          <Text style={dmStyles.title}>{title}</Text>
          <View style={dmStyles.rollsWrap}>
            {rolls.map((r, i) => {
              const success = threshold !== undefined ? r >= threshold : undefined;
              return (
                <View
                  key={i}
                  style={[
                    dmStyles.die,
                    success === true && dmStyles.dieSuccess,
                    success === false && dmStyles.dieFail,
                  ]}
                >
                  <Text style={dmStyles.dieText}>{r === 0 ? '—' : r}</Text>
                </View>
              );
            })}
          </View>
          {threshold !== undefined && (
            <Text style={dmStyles.info}>
              Target: {threshold}+ · Passed:{' '}
              {rolls.filter((r) => r >= threshold).length}/{rolls.length}
            </Text>
          )}
          <TouchableOpacity style={dmStyles.closeBtn} onPress={onClose}>
            <Text style={dmStyles.closeBtnText}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const dmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    width: '100%',
    maxHeight: '80%',
  },
  title: {
    color: COLORS.secondary,
    fontSize: 14,
    ...FONTS.heading,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  rollsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  die: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dieSuccess: { borderColor: COLORS.success, backgroundColor: '#001a00' },
  dieFail: { borderColor: COLORS.primary, backgroundColor: '#200008' },
  dieText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  info: { color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.md, fontSize: 12 },
  closeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  closeBtnText: { color: COLORS.white, fontWeight: '700', letterSpacing: 1.5 },
});

// ── Main screen ──────────────────────────────────────────────────────────────
export default function WH40KScreen() {
  const [input, setInput] = useState<CombatInput>(DEFAULT_INPUT);
  const [result, setResult] = useState<WH40KRoll['result'] | null>(null);
  const [modalData, setModalData] = useState<{
    visible: boolean;
    title: string;
    rolls: number[];
    threshold?: number;
  }>({ visible: false, title: '', rolls: [] });
  const [history, setHistory] = useStorage<HistoryEntry[]>('roll_history', []);

  const patch = useCallback(<K extends keyof CombatInput>(key: K, value: CombatInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSimulate = () => {
    if (Platform.OS !== 'web') Vibration.vibrate(60);
    const res = simulateCombat(input);
    setResult(res);

    const entry: WH40KRoll = {
      id: generateId(),
      timestamp: Date.now(),
      type: 'wh40k',
      input: { ...input },
      result: res,
    };
    setHistory((prev) => [entry, ...prev].slice(0, 200));
  };

  const showDice = (title: string, rolls: number[], threshold?: number) => {
    setModalData({ visible: true, title, rolls, threshold });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>COMBAT SIMULATOR</Text>

        {/* ── Attacker ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚔ ATTACKER</Text>

          <Text style={styles.fieldLabel}>NAME</Text>
          <TextInput
            style={styles.textInput}
            value={input.attackerName}
            onChangeText={(t) => patch('attackerName', t)}
            placeholderTextColor={COLORS.textMuted}
            placeholder="Unit name"
          />

          <Text style={styles.fieldLabel}>ATTACKS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
            {ATTACK_PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.presetChip, input.attacksRaw === p && styles.presetChipActive]}
                onPress={() => patch('attacksRaw', p)}
              >
                <Text style={[styles.presetChipText, input.attacksRaw === p && styles.presetChipTextActive]}>
                  {p.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            style={styles.textInput}
            value={input.attacksRaw}
            onChangeText={(t) => patch('attacksRaw', t)}
            placeholder="e.g. 3, d6, d3+2"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="default"
          />

          <Selector
            label="SKILL (BS/WS)"
            options={SKILL_OPTIONS}
            value={input.skill}
            onChange={(v) => patch('skill', v as 2 | 3 | 4 | 5 | 6)}
          />

          <View style={styles.row}>
            <Stepper label="STRENGTH" value={input.strength} min={1} max={20} onChange={(v) => patch('strength', v)} />
            <View style={{ width: SPACING.md }} />
            <Selector
              label="AP"
              options={AP_OPTIONS}
              value={input.ap}
              onChange={(v) => patch('ap', v)}
            />
          </View>

          <Text style={styles.fieldLabel}>DAMAGE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
            {DAMAGE_PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.presetChip, input.damageRaw === p && styles.presetChipActive]}
                onPress={() => patch('damageRaw', p)}
              >
                <Text style={[styles.presetChipText, input.damageRaw === p && styles.presetChipTextActive]}>
                  {p.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            style={styles.textInput}
            value={input.damageRaw}
            onChangeText={(t) => patch('damageRaw', t)}
            placeholder="e.g. 1, d3, d6+1"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        {/* ── Special Rules ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✦ SPECIAL RULES</Text>

          <ToggleRow label="Torrent (auto-hit)" value={input.torrent} onToggle={(v) => patch('torrent', v)} />
          <ToggleRow label="Lethal Hits (6s to hit → auto-wound)" value={input.lethalHits} onToggle={(v) => patch('lethalHits', v)} />
          <ToggleRow label="Devastating Wounds (6s to wound → mortals)" value={input.devastatingWounds} onToggle={(v) => patch('devastatingWounds', v)} />
          <ToggleRow label="Twin-linked (reroll wound rolls)" value={input.twinLinked} onToggle={(v) => patch('twinLinked', v)} />

          <Selector
            label="REROLL HITS"
            options={[{ label: 'None', value: 'none' }, { label: 'Reroll 1s', value: 'ones' }, { label: 'Reroll All', value: 'all' }]}
            value={input.rerollHits}
            onChange={(v) => patch('rerollHits', v as 'none' | 'ones' | 'all')}
          />

          <Selector
            label="REROLL WOUNDS"
            options={[{ label: 'None', value: 'none' }, { label: 'Reroll 1s', value: 'ones' }, { label: 'Reroll All', value: 'all' }]}
            value={input.rerollWounds}
            onChange={(v) => patch('rerollWounds', v as 'none' | 'ones' | 'all')}
          />

          <Selector
            label="SUSTAINED HITS (extra hits on 6+)"
            options={[{ label: 'Off', value: 0 }, { label: '+1', value: 1 }, { label: '+2', value: 2 }, { label: '+3', value: 3 }]}
            value={input.sustainedHits}
            onChange={(v) => patch('sustainedHits', v)}
          />
        </View>

        {/* ── Target ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛡 TARGET</Text>

          <Text style={styles.fieldLabel}>NAME</Text>
          <TextInput
            style={styles.textInput}
            value={input.targetName}
            onChangeText={(t) => patch('targetName', t)}
            placeholderTextColor={COLORS.textMuted}
            placeholder="Unit name"
          />

          <Stepper label="TOUGHNESS" value={input.toughness} min={1} max={14} onChange={(v) => patch('toughness', v)} />

          <View style={{ height: SPACING.md }} />

          <Selector label="ARMOR SAVE" options={SAVE_OPTIONS} value={input.save} onChange={(v) => patch('save', v)} />
          <Selector label="INVULNERABLE SAVE" options={INVULN_OPTIONS} value={input.invuln} onChange={(v) => patch('invuln', v)} />
          <Selector label="FEEL NO PAIN" options={FNP_OPTIONS} value={input.fnp} onChange={(v) => patch('fnp', v)} />
        </View>

        {/* ── Simulate button ── */}
        <TouchableOpacity style={styles.simBtn} onPress={handleSimulate} activeOpacity={0.8}>
          <Text style={styles.simBtnText}>SIMULATE ATTACK</Text>
        </TouchableOpacity>

        {/* ── Results ── */}
        {result && (
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>
              {input.attackerName} → {input.targetName}
            </Text>

            <View style={styles.phaseRow}>
              <PhaseBox label="ATTACKS" value={result.attacks} />
              <PhaseBox label="HITS" value={result.hits} />
              <PhaseBox label="WOUNDS" value={result.wounds} />
            </View>
            <View style={[styles.phaseRow, { marginTop: SPACING.sm }]}>
              <PhaseBox label="SAVES FAILED" value={result.savesFailed} />
              <PhaseBox label="MORTALS" value={result.mortals} />
              <PhaseBox label="DAMAGE" value={result.damageDealt} highlight />
            </View>

            {/* Dice breakdown buttons */}
            <Text style={[styles.sectionLabel, { marginTop: SPACING.md }]}>VIEW DICE ROLLS</Text>
            <View style={styles.diceBtnRow}>
              {result.hitRolls.length > 0 && (
                <TouchableOpacity
                  style={styles.diceViewBtn}
                  onPress={() => showDice('HIT ROLLS', result.hitRolls, input.torrent ? undefined : input.skill)}
                >
                  <Text style={styles.diceViewBtnText}>Hit Rolls ({result.hitRolls.length})</Text>
                </TouchableOpacity>
              )}
              {result.woundRolls.length > 0 && (
                <TouchableOpacity
                  style={styles.diceViewBtn}
                  onPress={() => showDice('WOUND ROLLS', result.woundRolls)}
                >
                  <Text style={styles.diceViewBtnText}>Wound Rolls ({result.woundRolls.length})</Text>
                </TouchableOpacity>
              )}
              {result.saveRolls.length > 0 && (
                <TouchableOpacity
                  style={styles.diceViewBtn}
                  onPress={() => showDice('SAVE ROLLS', result.saveRolls)}
                >
                  <Text style={styles.diceViewBtnText}>Save Rolls ({result.saveRolls.length})</Text>
                </TouchableOpacity>
              )}
              {result.damageRolls.length > 0 && (
                <TouchableOpacity
                  style={styles.diceViewBtn}
                  onPress={() => showDice('DAMAGE ROLLS', result.damageRolls)}
                >
                  <Text style={styles.diceViewBtnText}>Damage Rolls ({result.damageRolls.length})</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <DiceModal
        visible={modalData.visible}
        title={modalData.title}
        rolls={modalData.rolls}
        threshold={modalData.threshold}
        onClose={() => setModalData((m) => ({ ...m, visible: false }))}
      />
    </SafeAreaView>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.border, true: COLORS.primaryDark }}
        thumbColor={value ? COLORS.primary : COLORS.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  title: {
    color: COLORS.secondary,
    fontSize: 20,
    ...FONTS.heading,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    letterSpacing: 3,
  },

  section: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.secondary,
    fontSize: 13,
    ...FONTS.heading,
    letterSpacing: 2,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },

  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  textInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    marginBottom: SPACING.md,
  },

  presetRow: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.sm },
  presetChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetChipActive: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primary },
  presetChipText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  presetChipTextActive: { color: COLORS.text },

  row: { flexDirection: 'row', alignItems: 'flex-start' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  toggleLabel: { color: COLORS.text, fontSize: 13, flex: 1 },

  simBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md + 4,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  simBtnText: { color: COLORS.white, fontSize: 16, ...FONTS.heading, letterSpacing: 3 },

  resultSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  resultTitle: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  phaseRow: { flexDirection: 'row', gap: SPACING.sm },

  diceBtnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  diceViewBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  diceViewBtnText: { color: COLORS.textSecondary, fontSize: 12 },
});
