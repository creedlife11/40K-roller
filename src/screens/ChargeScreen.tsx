import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Vibration,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONTS } from '../theme';
import { rollDie } from '../utils/diceEngine';

// ── Maths ────────────────────────────────────────────────────────────────────

/** Count ways to roll exactly `sum` on 2D6. */
function ways2d6(sum: number): number {
  let count = 0;
  for (let a = 1; a <= 6; a++)
    for (let b = 1; b <= 6; b++)
      if (a + b === sum) count++;
  return count;
}

/** P(2D6 ≥ target) as a 0-1 fraction. */
function chanceGTE(target: number): number {
  if (target <= 2) return 1;
  if (target > 12) return 0;
  let ways = 0;
  for (let s = target; s <= 12; s++) ways += ways2d6(s);
  return ways / 36;
}

/** P(success with one full reroll on fail). */
function chanceWithReroll(target: number): number {
  const p = chanceGTE(target);
  return p + (1 - p) * p; // p + P(fail)*P(success)
}

/** Format probability as percentage string. */
function pct(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

/** Colour based on probability. */
function probColor(p: number): string {
  if (p >= 0.7) return COLORS.success;
  if (p >= 0.4) return COLORS.warning;
  return COLORS.primary;
}

// ── Probability row in table ─────────────────────────────────────────────────
function ProbRow({
  distance,
  selected,
  onPress,
}: {
  distance: number;
  selected: boolean;
  onPress: () => void;
}) {
  const p = chanceGTE(distance);
  const color = probColor(p);
  return (
    <TouchableOpacity
      style={[styles.tableRow, selected && styles.tableRowSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.tableDist, selected && { color: COLORS.secondary }]}>
        {distance}"
      </Text>
      <View style={styles.tableBarBg}>
        <View style={[styles.tableBarFill, { width: `${p * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.tableProb, { color }]}>{pct(p)}</Text>
    </TouchableOpacity>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function ChargeScreen() {
  const [distance, setDistance] = useState(8);
  const [rollResult, setRollResult] = useState<{ d1: number; d2: number } | null>(null);
  const [rerollResult, setRerollResult] = useState<{ d1: number; d2: number } | null>(null);
  const [showReroll, setShowReroll] = useState(false);

  const p = chanceGTE(distance);
  const pReroll = chanceWithReroll(distance);
  const mainColor = probColor(p);

  const handleRoll = useCallback(() => {
    if (Platform.OS !== 'web') Vibration.vibrate(50);
    const d1 = rollDie(6);
    const d2 = rollDie(6);
    setRollResult({ d1, d2 });
    setRerollResult(null);
    setShowReroll(false);
  }, []);

  const handleReroll = useCallback(() => {
    if (!rollResult) return;
    if (Platform.OS !== 'web') Vibration.vibrate(50);
    const d1 = rollDie(6);
    const d2 = rollDie(6);
    setRerollResult({ d1, d2 });
    setShowReroll(false);
  }, [rollResult]);

  const total = rollResult ? rollResult.d1 + rollResult.d2 : null;
  const rerollTotal = rerollResult ? rerollResult.d1 + rerollResult.d2 : null;
  const succeeded = total !== null && total >= distance;
  const rerollSucceeded = rerollTotal !== null && rerollTotal >= distance;
  const finalSucceeded = succeeded || rerollSucceeded;

  // Distribution bars (2–12)
  const distribution = Array.from({ length: 11 }, (_, i) => i + 2);
  const maxWays = 6;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>CHARGE CALCULATOR</Text>
        <Text style={styles.subtitle}>2D6 roll vs charge distance</Text>

        {/* ── Distance picker ── */}
        <Text style={styles.sectionLabel}>CHARGE DISTANCE</Text>
        <View style={styles.distanceRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.distChip, distance === d && styles.distChipActive]}
              onPress={() => {
                setDistance(d);
                setRollResult(null);
                setRerollResult(null);
              }}
            >
              <Text style={[styles.distChipText, distance === d && styles.distChipTextActive]}>
                {d}"
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Big probability display ── */}
        <View style={[styles.probCard, { borderColor: mainColor }]}>
          <View style={[styles.probCircle, { borderColor: mainColor }]}>
            <Text style={[styles.probPct, { color: mainColor }]}>{pct(p)}</Text>
            <Text style={styles.probLabel}>SUCCESS</Text>
          </View>

          <View style={styles.probMeta}>
            <Text style={styles.probExplain}>
              Need {distance}+ on 2D6
            </Text>
            <Text style={styles.probExplain}>
              {Math.round(p * 36)}/36 combinations
            </Text>

            <View style={styles.rerollRow}>
              <Text style={styles.rerollLabel}>With Reroll</Text>
              <Text style={[styles.rerollValue, { color: probColor(pReroll) }]}>
                {pct(pReroll)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── 2D6 distribution ── */}
        <View style={styles.distCard}>
          <Text style={styles.sectionLabel}>2D6 OUTCOMES</Text>
          <View style={styles.distBars}>
            {distribution.map((sum) => {
              const w = ways2d6(sum);
              const isTarget = sum === distance;
              const isSuccess = sum >= distance;
              return (
                <View key={sum} style={styles.distBarWrap}>
                  <View
                    style={[
                      styles.distBar,
                      { height: (w / maxWays) * 64 },
                      isTarget && { backgroundColor: COLORS.secondary },
                      isSuccess && !isTarget && { backgroundColor: COLORS.success + 'aa' },
                      !isSuccess && { backgroundColor: COLORS.primary + '66' },
                    ]}
                  />
                  <Text style={[styles.distBarLabel, isTarget && { color: COLORS.secondary }]}>
                    {sum}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.distLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.legendText}>Success (≥{distance})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.legendText}>Fail</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.secondary }]} />
              <Text style={styles.legendText}>Exact</Text>
            </View>
          </View>
        </View>

        {/* ── Roll simulator ── */}
        <View style={styles.simCard}>
          <Text style={styles.sectionLabel}>SIMULATE ROLL</Text>
          <TouchableOpacity style={styles.rollBtn} onPress={handleRoll} activeOpacity={0.8}>
            <Text style={styles.rollBtnText}>ROLL 2D6</Text>
          </TouchableOpacity>

          {rollResult && (
            <View style={styles.resultWrap}>
              <View style={styles.diceRow}>
                <View style={[styles.diePip, rollResult.d1 === 6 && styles.diePipMax]}>
                  <Text style={styles.diePipText}>{rollResult.d1}</Text>
                </View>
                <Text style={styles.dicePlus}>+</Text>
                <View style={[styles.diePip, rollResult.d2 === 6 && styles.diePipMax]}>
                  <Text style={styles.diePipText}>{rollResult.d2}</Text>
                </View>
                <Text style={styles.diceEquals}>=</Text>
                <Text style={[styles.diceTotal, { color: succeeded ? COLORS.success : COLORS.primary }]}>
                  {total}
                </Text>
              </View>

              <View style={[styles.resultBadge, { backgroundColor: succeeded ? COLORS.success + '22' : COLORS.primary + '22', borderColor: succeeded ? COLORS.success : COLORS.primary }]}>
                <Text style={[styles.resultBadgeText, { color: succeeded ? COLORS.success : COLORS.primary }]}>
                  {succeeded ? `✓ CHARGE SUCCEEDS (${total} ≥ ${distance})` : `✗ CHARGE FAILS (${total} < ${distance})`}
                </Text>
              </View>

              {!succeeded && !rerollResult && (
                <TouchableOpacity style={styles.rerollBtn} onPress={handleReroll}>
                  <Text style={styles.rerollBtnText}>USE REROLL</Text>
                </TouchableOpacity>
              )}

              {rerollResult && (
                <View style={styles.rerollResultWrap}>
                  <Text style={styles.rerollTitle}>REROLL</Text>
                  <View style={styles.diceRow}>
                    <View style={[styles.diePip, rerollResult.d1 === 6 && styles.diePipMax]}>
                      <Text style={styles.diePipText}>{rerollResult.d1}</Text>
                    </View>
                    <Text style={styles.dicePlus}>+</Text>
                    <View style={[styles.diePip, rerollResult.d2 === 6 && styles.diePipMax]}>
                      <Text style={styles.diePipText}>{rerollResult.d2}</Text>
                    </View>
                    <Text style={styles.diceEquals}>=</Text>
                    <Text style={[styles.diceTotal, { color: rerollSucceeded ? COLORS.success : COLORS.primary }]}>
                      {rerollTotal}
                    </Text>
                  </View>
                  <View style={[styles.resultBadge, { backgroundColor: finalSucceeded ? COLORS.success + '22' : COLORS.primary + '22', borderColor: finalSucceeded ? COLORS.success : COLORS.primary }]}>
                    <Text style={[styles.resultBadgeText, { color: finalSucceeded ? COLORS.success : COLORS.primary }]}>
                      {finalSucceeded ? `✓ CHARGE SUCCEEDS` : `✗ CHARGE FAILS`}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Full probability table ── */}
        <View style={styles.tableCard}>
          <Text style={styles.sectionLabel}>FULL PROBABILITY TABLE</Text>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((d) => (
            <ProbRow key={d} distance={d} selected={d === distance} onPress={() => setDistance(d)} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  title: { color: COLORS.secondary, fontSize: 20, ...FONTS.heading, textAlign: 'center', letterSpacing: 3 },
  subtitle: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: SPACING.lg },

  sectionLabel: { color: COLORS.textSecondary, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: SPACING.sm },

  distanceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.lg },
  distChip: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  distChipActive: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primary },
  distChipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  distChipTextActive: { color: COLORS.text, fontWeight: '700' },

  probCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.lg,
  },
  probCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  probPct: { fontSize: 26, fontWeight: '800' },
  probLabel: { color: COLORS.textSecondary, fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  probMeta: { flex: 1, gap: SPACING.xs },
  probExplain: { color: COLORS.textSecondary, fontSize: 12 },
  rerollRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.sm },
  rerollLabel: { color: COLORS.textSecondary, fontSize: 12 },
  rerollValue: { fontSize: 15, fontWeight: '700' },

  distCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  distBars: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 2, marginBottom: SPACING.sm },
  distBarWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  distBar: { width: '80%', borderRadius: 2, minHeight: 4 },
  distBarLabel: { color: COLORS.textSecondary, fontSize: 9, marginTop: 2 },
  distLegend: { flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: COLORS.textSecondary, fontSize: 10 },

  simCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  rollBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  rollBtnText: { color: COLORS.white, fontSize: 15, ...FONTS.heading, letterSpacing: 3 },

  resultWrap: { gap: SPACING.sm },
  diceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  diePip: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diePipMax: { borderColor: COLORS.secondary, backgroundColor: '#1a1400' },
  diePipText: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  dicePlus: { color: COLORS.textSecondary, fontSize: 18, fontWeight: '700' },
  diceEquals: { color: COLORS.textSecondary, fontSize: 18, fontWeight: '700' },
  diceTotal: { fontSize: 32, fontWeight: '800', minWidth: 48, textAlign: 'center' },

  resultBadge: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  resultBadgeText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },

  rerollBtn: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  rerollBtnText: { color: COLORS.accent, fontWeight: '700', letterSpacing: 1.5 },

  rerollResultWrap: { gap: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  rerollTitle: { color: COLORS.textSecondary, fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },

  tableCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
    gap: SPACING.sm,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs,
  },
  tableRowSelected: { backgroundColor: COLORS.surfaceLight },
  tableDist: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700', width: 30 },
  tableBarBg: { flex: 1, height: 8, backgroundColor: COLORS.surfaceLight, borderRadius: 4, overflow: 'hidden' },
  tableBarFill: { height: '100%', borderRadius: 4 },
  tableProb: { fontSize: 13, fontWeight: '700', width: 52, textAlign: 'right' },
});
