import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Modal,
  Alert,
  Switch,
  Vibration,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONTS, DIE_COLORS } from '../theme';
import { rollDice, rollDie, generateId } from '../utils/diceEngine';
import { useStorage } from '../hooks/useStorage';
import { CustomDie, CustomRoll, HistoryEntry } from '../types';

const SIDE_OPTIONS = [4, 6, 8, 10, 12, 20, 100];
const COLOR_OPTIONS = Object.keys(DIE_COLORS) as (keyof typeof DIE_COLORS)[];

const DEFAULT_DIE: Omit<CustomDie, 'id'> = {
  name: 'My Die',
  sides: 6,
  modifier: 0,
  rerollOnes: false,
  color: 'red',
};

// ── Die editor modal ─────────────────────────────────────────────────────────
function DieEditorModal({
  visible,
  initial,
  onSave,
  onClose,
}: {
  visible: boolean;
  initial: Omit<CustomDie, 'id'> | null;
  onSave: (die: Omit<CustomDie, 'id'>) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Omit<CustomDie, 'id'>>(initial ?? DEFAULT_DIE);

  const patch = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = () => {
    if (!draft.name.trim()) {
      Alert.alert('Name required', 'Please enter a name for the die.');
      return;
    }
    onSave(draft);
    onClose();
  };

  React.useEffect(() => {
    if (visible) setDraft(initial ?? DEFAULT_DIE);
  }, [visible, initial]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={edStyles.overlay}>
        <View style={edStyles.sheet}>
          <Text style={edStyles.title}>{initial ? 'EDIT DIE' : 'NEW DIE'}</Text>

          <Text style={edStyles.label}>NAME</Text>
          <TextInput
            style={edStyles.input}
            value={draft.name}
            onChangeText={(t) => patch('name', t)}
            placeholder="Die name"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={edStyles.label}>SIDES</Text>
          <View style={edStyles.chipRow}>
            {SIDE_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[edStyles.chip, draft.sides === s && edStyles.chipActive]}
                onPress={() => patch('sides', s)}
              >
                <Text style={[edStyles.chipText, draft.sides === s && edStyles.chipTextActive]}>D{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={edStyles.label}>MODIFIER</Text>
          <View style={edStyles.stepperRow}>
            <TouchableOpacity style={edStyles.stepBtn} onPress={() => patch('modifier', draft.modifier - 1)}>
              <Text style={edStyles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={[edStyles.stepVal, draft.modifier > 0 && { color: COLORS.success }, draft.modifier < 0 && { color: COLORS.primary }]}>
              {draft.modifier >= 0 ? `+${draft.modifier}` : draft.modifier}
            </Text>
            <TouchableOpacity style={edStyles.stepBtn} onPress={() => patch('modifier', draft.modifier + 1)}>
              <Text style={edStyles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={edStyles.toggleRow}>
            <Text style={edStyles.toggleLabel}>Reroll 1s</Text>
            <Switch
              value={draft.rerollOnes}
              onValueChange={(v) => patch('rerollOnes', v)}
              trackColor={{ false: COLORS.border, true: COLORS.primaryDark }}
              thumbColor={draft.rerollOnes ? COLORS.primary : COLORS.textSecondary}
            />
          </View>

          <Text style={edStyles.label}>COLOR</Text>
          <View style={edStyles.colorRow}>
            {COLOR_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  edStyles.colorSwatch,
                  { backgroundColor: DIE_COLORS[c] },
                  draft.color === c && edStyles.colorSwatchActive,
                ]}
                onPress={() => patch('color', c)}
              />
            ))}
          </View>

          <View style={edStyles.btnRow}>
            <TouchableOpacity style={edStyles.cancelBtn} onPress={onClose}>
              <Text style={edStyles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={edStyles.saveBtn} onPress={handleSave}>
              <Text style={edStyles.saveBtnText}>SAVE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const edStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  title: {
    color: COLORS.secondary,
    fontSize: 15,
    ...FONTS.heading,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  label: { color: COLORS.textSecondary, fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginBottom: SPACING.xs },
  input: {
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.md },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: COLORS.text, fontWeight: '700' },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
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
  stepVal: { color: COLORS.text, fontSize: 20, fontWeight: '700', minWidth: 44, textAlign: 'center' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  toggleLabel: { color: COLORS.text, fontSize: 14 },
  colorRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginBottom: SPACING.lg },
  colorSwatch: { width: 32, height: 32, borderRadius: RADIUS.full, opacity: 0.7 },
  colorSwatchActive: { opacity: 1, borderWidth: 2, borderColor: COLORS.text },
  btnRow: { flexDirection: 'row', gap: SPACING.md },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '700', letterSpacing: 1 },
  saveBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
  },
  saveBtnText: { color: COLORS.white, fontWeight: '700', letterSpacing: 1 },
});

// ── Die card ─────────────────────────────────────────────────────────────────
function DieCard({
  die,
  onEdit,
  onDelete,
  onRoll,
  lastResult,
}: {
  die: CustomDie;
  onEdit: () => void;
  onDelete: () => void;
  onRoll: (count: number) => void;
  lastResult: CustomRoll | null;
}) {
  const [count, setCount] = useState(1);
  const color = DIE_COLORS[die.color as keyof typeof DIE_COLORS] ?? COLORS.primary;

  return (
    <View style={[dcStyles.card, { borderLeftColor: color }]}>
      <View style={dcStyles.header}>
        <View style={[dcStyles.icon, { backgroundColor: color + '22', borderColor: color }]}>
          <Text style={[dcStyles.iconText, { color }]}>D{die.sides}</Text>
        </View>
        <View style={dcStyles.meta}>
          <Text style={dcStyles.name}>{die.name}</Text>
          <Text style={dcStyles.spec}>
            D{die.sides}
            {die.modifier !== 0 ? (die.modifier > 0 ? ` +${die.modifier}` : ` ${die.modifier}`) : ''}
            {die.rerollOnes ? '  ↺1' : ''}
          </Text>
        </View>
        <TouchableOpacity style={dcStyles.editBtn} onPress={onEdit}>
          <Text style={dcStyles.editBtnText}>EDIT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={dcStyles.deleteBtn} onPress={onDelete}>
          <Text style={dcStyles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Count + roll */}
      <View style={dcStyles.rollRow}>
        <View style={dcStyles.countCtrl}>
          <TouchableOpacity style={dcStyles.cBtn} onPress={() => setCount((c) => Math.max(1, c - 1))}>
            <Text style={dcStyles.cBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={dcStyles.cVal}>{count}×</Text>
          <TouchableOpacity style={dcStyles.cBtn} onPress={() => setCount((c) => Math.min(20, c + 1))}>
            <Text style={dcStyles.cBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[dcStyles.rollBtn, { backgroundColor: color }]} onPress={() => onRoll(count)}>
          <Text style={dcStyles.rollBtnText}>ROLL</Text>
        </TouchableOpacity>
      </View>

      {/* Last result */}
      {lastResult && (
        <View style={dcStyles.result}>
          <Text style={dcStyles.resultRolls}>[{lastResult.rolls.join(', ')}]</Text>
          <Text style={[dcStyles.resultTotal, { color }]}>{lastResult.total}</Text>
        </View>
      )}
    </View>
  );
}

const dcStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, gap: SPACING.sm },
  icon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 13, fontWeight: '800' },
  meta: { flex: 1 },
  name: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  spec: { color: COLORS.textSecondary, fontSize: 12 },
  editBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editBtnText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { color: COLORS.textMuted, fontSize: 16 },
  rollRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  countCtrl: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  cBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cBtnText: { color: COLORS.text, fontSize: 18, fontWeight: '700', lineHeight: 22 },
  cVal: { color: COLORS.text, fontSize: 16, fontWeight: '700', minWidth: 32, textAlign: 'center' },
  rollBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  rollBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13, letterSpacing: 1.5 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  resultRolls: { color: COLORS.textMuted, fontSize: 12 },
  resultTotal: { fontSize: 22, fontWeight: '800' },
});

// ── Main screen ──────────────────────────────────────────────────────────────
export default function CustomScreen() {
  const [customDice, setCustomDice] = useStorage<CustomDie[]>('custom_dice', []);
  const [history, setHistory] = useStorage<HistoryEntry[]>('roll_history', []);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingDie, setEditingDie] = useState<CustomDie | null>(null);
  const [lastResults, setLastResults] = useState<Record<string, CustomRoll>>({});

  const openNew = () => {
    setEditingDie(null);
    setEditorVisible(true);
  };

  const openEdit = (die: CustomDie) => {
    setEditingDie(die);
    setEditorVisible(true);
  };

  const handleSave = (draft: Omit<CustomDie, 'id'>) => {
    if (editingDie) {
      setCustomDice((prev) =>
        (prev as CustomDie[]).map((d) => (d.id === editingDie.id ? { ...draft, id: editingDie.id } : d))
      );
    } else {
      const newDie: CustomDie = { ...draft, id: generateId() };
      setCustomDice((prev) => [...(prev as CustomDie[]), newDie]);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Die', 'Remove this custom die?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setCustomDice((prev) => (prev as CustomDie[]).filter((d) => d.id !== id)),
      },
    ]);
  };

  const handleRoll = (die: CustomDie, count: number) => {
    if (Platform.OS !== 'web') Vibration.vibrate(40);

    let rolls = rollDice(count, die.sides);

    // Reroll 1s
    if (die.rerollOnes) {
      rolls = rolls.map((r) => (r === 1 ? rollDie(die.sides) : r));
    }

    const rawTotal = rolls.reduce((a, b) => a + b, 0);
    const total = rawTotal + die.modifier * count;

    const entry: CustomRoll = {
      id: generateId(),
      timestamp: Date.now(),
      type: 'custom',
      dieName: die.name,
      dieSides: die.sides,
      count,
      modifier: die.modifier,
      rolls,
      total,
    };

    setLastResults((prev) => ({ ...prev, [die.id]: entry }));
    setHistory((prev) => [entry, ...prev].slice(0, 200));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>CUSTOM DICE</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openNew}>
            <Text style={styles.addBtnText}>+ NEW DIE</Text>
          </TouchableOpacity>
        </View>

        {(customDice as CustomDie[]).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎲</Text>
            <Text style={styles.emptyText}>No custom dice yet</Text>
            <Text style={styles.emptySubText}>Tap "+ NEW DIE" to create one</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openNew}>
              <Text style={styles.emptyBtnText}>CREATE FIRST DIE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          (customDice as CustomDie[]).map((die) => (
            <DieCard
              key={die.id}
              die={die}
              onEdit={() => openEdit(die)}
              onDelete={() => handleDelete(die.id)}
              onRoll={(count) => handleRoll(die, count)}
              lastResult={lastResults[die.id] ?? null}
            />
          ))
        )}
      </ScrollView>

      <DieEditorModal
        visible={editorVisible}
        initial={editingDie ? { ...editingDie } : null}
        onSave={handleSave}
        onClose={() => setEditorVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  title: { color: COLORS.secondary, fontSize: 20, ...FONTS.heading, letterSpacing: 3 },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  addBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  emptySubText: { color: COLORS.textSecondary, fontSize: 13, marginTop: SPACING.xs, marginBottom: SPACING.lg },
  emptyBtn: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  emptyBtnText: { color: COLORS.primary, fontWeight: '700', letterSpacing: 1.5 },
});
