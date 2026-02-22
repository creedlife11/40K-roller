import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONTS } from '../theme';
import { rollDice, generateId } from '../utils/diceEngine';
import { useStorage } from '../hooks/useStorage';
import { StandardRoll, HistoryEntry } from '../types';

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100] as const;

export default function HomeScreen() {
  const [selectedDie, setSelectedDie] = useState<number>(6);
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [result, setResult] = useState<StandardRoll | null>(null);
  const [history, setHistory] = useStorage<HistoryEntry[]>('roll_history', []);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.05, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const handleRoll = useCallback(() => {
    if (Platform.OS !== 'web') Vibration.vibrate(40);
    shake();

    const rolls = rollDice(count, selectedDie);
    const total = rolls.reduce((a, b) => a + b, 0) + modifier;

    const entry: StandardRoll = {
      id: generateId(),
      timestamp: Date.now(),
      type: 'standard',
      diceType: selectedDie,
      count,
      modifier,
      rolls,
      total,
    };

    setResult(entry);
    setHistory((prev) => [entry, ...prev].slice(0, 200));
  }, [count, selectedDie, modifier]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <Text style={styles.title}>QUICK ROLL</Text>

        {/* Dice selector */}
        <Text style={styles.sectionLabel}>SELECT DIE</Text>
        <View style={styles.diceGrid}>
          {DICE_TYPES.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.dieBtn, selectedDie === d && styles.dieBtnActive]}
              onPress={() => setSelectedDie(d)}
              activeOpacity={0.75}
            >
              <Text style={[styles.dieBtnText, selectedDie === d && styles.dieBtnTextActive]}>
                D{d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Count & modifier */}
        <View style={styles.row}>
          <View style={styles.stepperCard}>
            <Text style={styles.stepperLabel}>DICE</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setCount((c) => Math.max(1, c - 1))}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{count}</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setCount((c) => Math.min(20, c + 1))}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.stepperCard}>
            <Text style={styles.stepperLabel}>MODIFIER</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setModifier((m) => m - 1)}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.stepValue, modifier > 0 && styles.positive, modifier < 0 && styles.negative]}>
                {modifier >= 0 ? `+${modifier}` : modifier}
              </Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setModifier((m) => m + 1)}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Roll button */}
        <Animated.View
          style={[
            styles.rollBtnWrap,
            { transform: [{ translateX: shakeAnim }, { scale: scaleAnim }] },
          ]}
        >
          <TouchableOpacity style={styles.rollBtn} onPress={handleRoll} activeOpacity={0.8}>
            <Text style={styles.rollBtnLabel}>
              ROLL {count}D{selectedDie}
              {modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Result */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTotal}>{result.total}</Text>
            <Text style={styles.resultSub}>
              {result.count}D{result.diceType}
              {result.modifier !== 0
                ? result.modifier > 0
                  ? ` + ${result.modifier}`
                  : ` − ${Math.abs(result.modifier)}`
                : ''}
            </Text>

            {/* Individual dice */}
            <View style={styles.diceRow}>
              {result.rolls.map((r, i) => (
                <View
                  key={i}
                  style={[
                    styles.diePip,
                    r === result.diceType && styles.diePipMax,
                    r === 1 && styles.diePipMin,
                  ]}
                >
                  <Text style={styles.diePipText}>{r}</Text>
                </View>
              ))}
              {result.modifier !== 0 && (
                <View style={[styles.diePip, styles.diePipMod]}>
                  <Text style={styles.diePipText}>
                    {result.modifier > 0 ? `+${result.modifier}` : result.modifier}
                  </Text>
                </View>
              )}
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatPill label="MIN" value={Math.min(...result.rolls)} />
              <StatPill label="MAX" value={Math.max(...result.rolls)} />
              <StatPill
                label="AVG"
                value={parseFloat(
                  (result.rolls.reduce((a, b) => a + b, 0) / result.rolls.length).toFixed(1)
                )}
              />
            </View>
          </View>
        )}

        {/* Recent rolls */}
        {(history as HistoryEntry[]).filter((h) => h.type === 'standard').length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionLabel}>RECENT ROLLS</Text>
            {(history as StandardRoll[])
              .filter((h) => h.type === 'standard')
              .slice(0, 5)
              .map((h) => (
                <View key={h.id} style={styles.recentRow}>
                  <Text style={styles.recentDice}>
                    {h.count}D{h.diceType}
                    {h.modifier !== 0 ? (h.modifier > 0 ? `+${h.modifier}` : h.modifier) : ''}
                  </Text>
                  <Text style={styles.recentRolls}>[{h.rolls.join(', ')}]</Text>
                  <Text style={styles.recentTotal}>{h.total}</Text>
                </View>
              ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillLabel}>{label}</Text>
      <Text style={styles.statPillValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  title: {
    color: COLORS.secondary,
    fontSize: 22,
    ...FONTS.heading,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    letterSpacing: 3,
  },

  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    ...FONTS.heading,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },

  diceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  dieBtn: {
    width: 64,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dieBtnActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  dieBtnText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  dieBtnTextActive: { color: COLORS.text, fontWeight: '700' },

  row: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  stepperCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'center',
  },
  stepperLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    ...FONTS.heading,
    letterSpacing: 1.5,
    marginBottom: SPACING.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: COLORS.text, fontSize: 20, fontWeight: '700', lineHeight: 24 },
  stepValue: { color: COLORS.text, fontSize: 22, fontWeight: '700', minWidth: 40, textAlign: 'center' },
  positive: { color: COLORS.success },
  negative: { color: COLORS.primary },

  rollBtnWrap: { marginBottom: SPACING.lg },
  rollBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md + 4,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  rollBtnLabel: { color: COLORS.white, fontSize: 18, ...FONTS.heading, letterSpacing: 3 },

  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  resultTotal: {
    color: COLORS.secondary,
    fontSize: 72,
    fontWeight: '800',
    lineHeight: 80,
  },
  resultSub: { color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.md },
  diceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  diePip: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diePipMax: { borderColor: COLORS.secondary, backgroundColor: '#2a2000' },
  diePipMin: { borderColor: COLORS.primary, backgroundColor: '#200008' },
  diePipMod: { borderColor: COLORS.accent, backgroundColor: '#001428' },
  diePipText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  statPill: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
  },
  statPillLabel: { color: COLORS.textSecondary, fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  statPillValue: { color: COLORS.text, fontSize: 16, fontWeight: '700' },

  recentSection: { marginTop: SPACING.sm },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recentDice: { color: COLORS.textSecondary, fontSize: 13, width: 70 },
  recentRolls: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
  recentTotal: { color: COLORS.secondary, fontSize: 16, fontWeight: '700', width: 40, textAlign: 'right' },
});
