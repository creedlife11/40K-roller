import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-chart-kit';
import { COLORS, SPACING, RADIUS, FONTS } from '../theme';
import { useStorage } from '../hooks/useStorage';
import { HistoryEntry, StandardRoll, WH40KRoll, CustomRoll } from '../types';
import { computeDistribution, average } from '../utils/diceEngine';

const SCREEN_W = Dimensions.get('window').width;

type Filter = 'all' | 'standard' | 'wh40k' | 'custom';

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function entryTitle(e: HistoryEntry): string {
  if (e.type === 'standard') {
    const r = e as StandardRoll;
    return `${r.count}D${r.diceType}${r.modifier !== 0 ? (r.modifier > 0 ? `+${r.modifier}` : r.modifier) : ''}`;
  }
  if (e.type === 'wh40k') {
    const r = e as WH40KRoll;
    return `${r.input.attackerName} → ${r.input.targetName}`;
  }
  const r = e as CustomRoll;
  return `${r.count}× ${r.dieName}`;
}

function entryValue(e: HistoryEntry): string {
  if (e.type === 'standard') return String((e as StandardRoll).total);
  if (e.type === 'wh40k') return `${(e as WH40KRoll).result.damageDealt} dmg`;
  return String((e as CustomRoll).total);
}

function entryBadgeColor(e: HistoryEntry): string {
  if (e.type === 'standard') return COLORS.accent;
  if (e.type === 'wh40k') return COLORS.primary;
  return COLORS.secondary;
}

function entryBadgeLabel(e: HistoryEntry): string {
  if (e.type === 'standard') return 'STD';
  if (e.type === 'wh40k') return '40K';
  return 'CST';
}

// ── Expanded detail for standard roll ───────────────────────────────────────
function StandardDetail({ entry }: { entry: StandardRoll }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailText}>
        Rolls: [{entry.rolls.join(', ')}]
        {entry.modifier !== 0 ? `  Mod: ${entry.modifier > 0 ? '+' : ''}${entry.modifier}` : ''}
      </Text>
      <Text style={styles.detailText}>
        Min: {Math.min(...entry.rolls)}  Max: {Math.max(...entry.rolls)}  Avg:{' '}
        {(entry.rolls.reduce((a, b) => a + b, 0) / entry.rolls.length).toFixed(1)}
      </Text>
    </View>
  );
}

// ── Expanded detail for WH40K roll ──────────────────────────────────────────
function WH40KDetail({ entry }: { entry: WH40KRoll }) {
  const r = entry.result;
  const i = entry.input;
  return (
    <View style={styles.detail}>
      <View style={styles.detailRow}>
        <DetailCell label="ATK" value={r.attacks} />
        <DetailCell label="HITS" value={r.hits} />
        <DetailCell label="WND" value={r.wounds} />
        <DetailCell label="FAIL" value={r.savesFailed} />
        <DetailCell label="MORT" value={r.mortals} />
        <DetailCell label="DMG" value={r.damageDealt} highlight />
      </View>
      <Text style={styles.detailSub}>
        S{i.strength} AP{i.ap} D{i.damageRaw} vs T{i.toughness} {i.save < 7 ? `${i.save}+` : '—'} save
      </Text>
    </View>
  );
}

function DetailCell({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={styles.detailCell}>
      <Text style={styles.detailCellLabel}>{label}</Text>
      <Text style={[styles.detailCellValue, highlight && { color: COLORS.secondary }]}>{value}</Text>
    </View>
  );
}

// ── Statistics panel ─────────────────────────────────────────────────────────
function StatsPanel({ entries }: { entries: HistoryEntry[] }) {
  const standardEntries = entries.filter((e) => e.type === 'standard') as StandardRoll[];
  const wh40kEntries = entries.filter((e) => e.type === 'wh40k') as WH40KRoll[];

  const allTotals = standardEntries.map((e) => e.total);
  const allDamages = wh40kEntries.map((e) => e.result.damageDealt);

  // Distribution for standard rolls (capped at most recent 100)
  const recentRolls = standardEntries.slice(0, 100).flatMap((e) => e.rolls);
  const dist = computeDistribution(recentRolls);
  const distKeys = Object.keys(dist)
    .map(Number)
    .sort((a, b) => a - b)
    .slice(0, 12); // max 12 bars

  const chartData = {
    labels: distKeys.map(String),
    datasets: [{ data: distKeys.map((k) => dist[k] ?? 0) }],
  };

  return (
    <View style={styles.statsPanel}>
      <Text style={styles.statsPanelTitle}>STATISTICS</Text>

      <View style={styles.statCards}>
        <StatCard label="TOTAL ROLLS" value={entries.length} />
        <StatCard label="STD SESSIONS" value={standardEntries.length} />
        <StatCard label="40K SIMS" value={wh40kEntries.length} />
      </View>

      {allTotals.length > 0 && (
        <View style={styles.statCards}>
          <StatCard label="AVG TOTAL" value={parseFloat(average(allTotals).toFixed(1))} />
          <StatCard label="BEST ROLL" value={Math.max(...allTotals)} highlight />
          <StatCard label="WORST ROLL" value={Math.min(...allTotals)} />
        </View>
      )}

      {allDamages.length > 0 && (
        <View style={styles.statCards}>
          <StatCard label="AVG DAMAGE" value={parseFloat(average(allDamages).toFixed(1))} />
          <StatCard label="MAX DAMAGE" value={Math.max(...allDamages)} highlight />
        </View>
      )}

      {recentRolls.length > 1 && distKeys.length > 1 && (
        <View style={{ marginTop: SPACING.md }}>
          <Text style={styles.chartTitle}>ROLL DISTRIBUTION (last {recentRolls.length} dice)</Text>
          <BarChart
            data={chartData}
            width={SCREEN_W - SPACING.md * 4}
            height={180}
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundGradientFrom: COLORS.surface,
              backgroundGradientTo: COLORS.surface,
              color: () => COLORS.primary,
              labelColor: () => COLORS.textSecondary,
              barPercentage: 0.7,
              decimalPlaces: 0,
              propsForBackgroundLines: { stroke: COLORS.border },
            }}
            style={{ borderRadius: RADIUS.md }}
            showValuesOnTopOfBars
          />
        </View>
      )}
    </View>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statCardLabel}>{label}</Text>
      <Text style={[styles.statCardValue, highlight && { color: COLORS.secondary }]}>{value}</Text>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const [history, setHistory] = useStorage<HistoryEntry[]>('roll_history', []);
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'stats'>('history');

  const filtered = useMemo(() => {
    if (filter === 'all') return history as HistoryEntry[];
    return (history as HistoryEntry[]).filter((e) => e.type === filter);
  }, [history, filter]);

  const handleClear = () => {
    Alert.alert('Clear History', 'Delete all roll history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: () => setHistory([]),
      },
    ]);
  };

  const FILTERS: { label: string; value: Filter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Standard', value: 'standard' },
    { label: '40K', value: 'wh40k' },
    { label: 'Custom', value: 'custom' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Top tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>HISTORY</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>STATISTICS</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'history' ? (
        <>
          {/* Filter row */}
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
                onPress={() => setFilter(f.value)}
              >
                <Text style={[styles.filterChipText, filter === f.value && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Text style={styles.clearBtnText}>CLEAR</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.listContent}>
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🎲</Text>
                <Text style={styles.emptyText}>No rolls yet</Text>
                <Text style={styles.emptySubText}>Start rolling to build your history</Text>
              </View>
            ) : (
              filtered.map((entry) => {
                const expanded = expandedId === entry.id;
                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={[styles.entryCard, expanded && styles.entryCardExpanded]}
                    onPress={() => setExpandedId(expanded ? null : entry.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.entryMain}>
                      <View style={[styles.badge, { backgroundColor: entryBadgeColor(entry) }]}>
                        <Text style={styles.badgeText}>{entryBadgeLabel(entry)}</Text>
                      </View>
                      <View style={styles.entryMeta}>
                        <Text style={styles.entryTitle}>{entryTitle(entry)}</Text>
                        <Text style={styles.entryTime}>
                          {formatDate(entry.timestamp)} {formatTime(entry.timestamp)}
                        </Text>
                      </View>
                      <Text style={styles.entryValue}>{entryValue(entry)}</Text>
                    </View>
                    {expanded && (
                      entry.type === 'standard' ? (
                        <StandardDetail entry={entry as StandardRoll} />
                      ) : entry.type === 'wh40k' ? (
                        <WH40KDetail entry={entry as WH40KRoll} />
                      ) : null
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          <StatsPanel entries={history as HistoryEntry[]} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  tabTextActive: { color: COLORS.primary },

  filterRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    padding: SPACING.md,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primary },
  filterChipText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  filterChipTextActive: { color: COLORS.text },
  clearBtn: { marginLeft: 'auto' as any, padding: SPACING.xs },
  clearBtnText: { color: COLORS.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  listContent: { padding: SPACING.md, paddingBottom: SPACING.xxl, gap: SPACING.sm },

  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  emptySubText: { color: COLORS.textSecondary, fontSize: 13, marginTop: SPACING.xs },

  entryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  entryCardExpanded: { borderColor: COLORS.primary },
  entryMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: COLORS.white, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  entryMeta: { flex: 1 },
  entryTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  entryTime: { color: COLORS.textMuted, fontSize: 11 },
  entryValue: { color: COLORS.secondary, fontSize: 18, fontWeight: '800' },

  detail: {
    padding: SPACING.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailText: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 2 },
  detailRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xs },
  detailCell: { flex: 1, alignItems: 'center' },
  detailCellLabel: { color: COLORS.textMuted, fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  detailCellValue: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  detailSub: { color: COLORS.textMuted, fontSize: 11, marginTop: SPACING.xs },

  statsPanel: { gap: SPACING.md },
  statsPanelTitle: {
    color: COLORS.secondary,
    fontSize: 14,
    ...FONTS.heading,
    letterSpacing: 2,
    textAlign: 'center',
  },
  statCards: { flexDirection: 'row', gap: SPACING.sm },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  statCardLabel: { color: COLORS.textMuted, fontSize: 9, letterSpacing: 1, fontWeight: '700', marginBottom: 2 },
  statCardValue: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  chartTitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
});
