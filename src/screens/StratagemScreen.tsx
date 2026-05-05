import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import stratagemData from '../data/stratagems.json';
import { COLORS, SPACING, RADIUS, FONTS } from '../theme';

// ── Types ────────────────────────────────────────────────────────────────────

interface Stratagem {
  id: string;
  name: string;
  cp: number;
  phase: string;
  when: string;
  effect: string;
  restriction: string;
}

interface Detachment {
  id: string;
  name: string;
  stratagems: Stratagem[];
}

interface Faction {
  id: string;
  name: string;
  detachments: Detachment[];
}

// ── Phase config ─────────────────────────────────────────────────────────────

const PHASE_CONFIG: Record<string, { label: string; color: string; short: string }> = {
  command:  { label: 'Command',   color: '#4a90e2', short: 'CMD' },
  movement: { label: 'Movement',  color: '#4caf50', short: 'MOV' },
  shooting: { label: 'Shooting',  color: '#ff9800', short: 'SHT' },
  charge:   { label: 'Charge',    color: '#d4af37', short: 'CHG' },
  fight:    { label: 'Fight',     color: '#c41e3a', short: 'FGT' },
  any:      { label: 'Any Phase', color: '#9c27b0', short: 'ANY' },
  reaction: { label: 'Reaction',  color: '#607d8b', short: 'RXN' },
};

const PHASE_FILTERS = ['all', 'command', 'movement', 'shooting', 'charge', 'fight', 'reaction', 'any'];

// ── Sub-components ────────────────────────────────────────────────────────────

function CPBadge({ cp }: { cp: number }) {
  const bg = cp === 1 ? COLORS.secondary : cp === 2 ? COLORS.warning : COLORS.primary;
  return (
    <View style={[styles.cpBadge, { backgroundColor: bg }]}>
      <Text style={styles.cpText}>{cp}CP</Text>
    </View>
  );
}

function PhaseBadge({ phase }: { phase: string }) {
  const cfg = PHASE_CONFIG[phase] ?? { label: phase, color: COLORS.textMuted, short: '???' };
  return (
    <View style={[styles.phaseBadge, { borderColor: cfg.color }]}>
      <Text style={[styles.phaseText, { color: cfg.color }]}>{cfg.short}</Text>
    </View>
  );
}

function StratagemCard({
  stratagem,
  expanded,
  onPress,
}: {
  stratagem: Stratagem;
  expanded: boolean;
  onPress: () => void;
}) {
  const cfg = PHASE_CONFIG[stratagem.phase] ?? { color: COLORS.textMuted };
  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: cfg.color }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardName} numberOfLines={expanded ? 0 : 1}>
          {stratagem.name}
        </Text>
        <View style={styles.cardBadges}>
          <PhaseBadge phase={stratagem.phase} />
          <CPBadge cp={stratagem.cp} />
        </View>
      </View>

      <Text style={styles.cardWhen} numberOfLines={expanded ? 0 : 1}>
        {stratagem.when}
      </Text>

      <Text style={styles.cardEffect} numberOfLines={expanded ? 0 : 2}>
        {stratagem.effect}
      </Text>

      {expanded && stratagem.restriction ? (
        <View style={styles.restrictionRow}>
          <Text style={styles.restrictionLabel}>Restriction: </Text>
          <Text style={styles.restrictionText}>{stratagem.restriction}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function StratagemScreen() {
  const factions: Faction[] = stratagemData.factions as Faction[];
  const universal: Stratagem[] = stratagemData.universal as Stratagem[];

  const [selectedFactionId, setSelectedFactionId] = useState<string | null>(null);
  const [selectedDetachmentId, setSelectedDetachmentId] = useState<string | null>(null);
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const selectedFaction = factions.find(f => f.id === selectedFactionId) ?? null;
  const selectedDetachment =
    selectedFaction?.detachments.find(d => d.id === selectedDetachmentId) ?? null;

  // Reset detachment when faction changes
  const selectFaction = (id: string) => {
    if (id === selectedFactionId) {
      setSelectedFactionId(null);
      setSelectedDetachmentId(null);
    } else {
      setSelectedFactionId(id);
      setSelectedDetachmentId(null);
    }
    setExpandedId(null);
  };

  const selectDetachment = (id: string) => {
    setSelectedDetachmentId(prev => (prev === id ? null : id));
    setExpandedId(null);
  };

  const applyPhaseFilter = (items: Stratagem[]) =>
    phaseFilter === 'all' ? items : items.filter(s => s.phase === phaseFilter);

  const detachmentStratagems = useMemo(
    () => applyPhaseFilter(selectedDetachment?.stratagems ?? []),
    [selectedDetachment, phaseFilter],
  );

  const universalStratagems = useMemo(
    () => applyPhaseFilter(universal),
    [phaseFilter],
  );

  const allStratagems: Array<Stratagem & { _section?: string }> = [
    ...(selectedDetachment
      ? detachmentStratagems.map(s => ({ ...s, _section: 'detachment' }))
      : []),
    ...universalStratagems.map(s => ({ ...s, _section: 'universal' })),
  ];

  const renderHeader = () => (
    <>
      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>STRATAGEMS</Text>
      </View>

      {/* Faction selector */}
      <Text style={styles.sectionLabel}>FACTION</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {factions.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[styles.chip, selectedFactionId === f.id && styles.chipActive]}
            onPress={() => selectFaction(f.id)}
          >
            <Text
              style={[styles.chipText, selectedFactionId === f.id && styles.chipTextActive]}
            >
              {f.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Detachment selector */}
      {selectedFaction && (
        <>
          <Text style={styles.sectionLabel}>DETACHMENT</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {selectedFaction.detachments.map(d => (
              <TouchableOpacity
                key={d.id}
                style={[
                  styles.chip,
                  styles.chipDetachment,
                  selectedDetachmentId === d.id && styles.chipDetachmentActive,
                ]}
                onPress={() => selectDetachment(d.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedDetachmentId === d.id && styles.chipTextActive,
                  ]}
                >
                  {d.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* Phase filter */}
      <Text style={styles.sectionLabel}>PHASE</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {PHASE_FILTERS.map(p => {
          const cfg = p === 'all' ? null : PHASE_CONFIG[p];
          const active = phaseFilter === p;
          return (
            <TouchableOpacity
              key={p}
              style={[
                styles.chip,
                styles.phaseChip,
                active && {
                  backgroundColor: cfg ? cfg.color : COLORS.primary,
                  borderColor: cfg ? cfg.color : COLORS.primary,
                },
                !active && cfg && { borderColor: cfg.color },
              ]}
              onPress={() => setPhaseFilter(p)}
            >
              <Text
                style={[
                  styles.chipText,
                  active && { color: COLORS.white },
                  !active && cfg && { color: cfg.color },
                ]}
              >
                {p === 'all' ? 'All' : PHASE_CONFIG[p].label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.divider} />

      {/* Section headers inline before the list */}
      {selectedDetachment && detachmentStratagems.length > 0 && (
        <View style={styles.listSectionHeader}>
          <Text style={styles.listSectionTitle}>
            {selectedDetachment.name.toUpperCase()}
          </Text>
          <Text style={styles.listSectionCount}>{detachmentStratagems.length}</Text>
        </View>
      )}
      {selectedDetachment && detachmentStratagems.length === 0 && (
        <Text style={styles.emptySection}>
          No {selectedDetachment.name} stratagems for this phase.
        </Text>
      )}
    </>
  );

  const renderFooter = () =>
    universalStratagems.length > 0 ? (
      <View style={styles.listSectionHeader}>
        <Text style={styles.listSectionTitle}>UNIVERSAL</Text>
        <Text style={styles.listSectionCount}>{universalStratagems.length}</Text>
      </View>
    ) : null;

  // We need to inject the "UNIVERSAL" header between detachment and universal items.
  // Build an augmented list with a separator item.
  type ListItem =
    | { _type: 'stratagem'; data: Stratagem }
    | { _type: 'separator' };

  const listItems: ListItem[] = [];

  if (selectedDetachment) {
    detachmentStratagems.forEach(s =>
      listItems.push({ _type: 'stratagem', data: s }),
    );
  }

  if (universalStratagems.length > 0) {
    listItems.push({ _type: 'separator' });
    universalStratagems.forEach(s =>
      listItems.push({ _type: 'stratagem', data: s }),
    );
  }

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item._type === 'separator') {
      return (
        <View style={styles.listSectionHeader}>
          <Text style={styles.listSectionTitle}>UNIVERSAL</Text>
          <Text style={styles.listSectionCount}>{universalStratagems.length}</Text>
        </View>
      );
    }
    const s = item.data;
    return (
      <StratagemCard
        stratagem={s}
        expanded={expandedId === s.id}
        onPress={() => setExpandedId(prev => (prev === s.id ? null : s.id))}
      />
    );
  };

  // Empty state
  const showEmpty = !selectedFaction;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {showEmpty ? (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <>
              {renderHeader()}
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>⚡</Text>
                <Text style={styles.emptyTitle}>SELECT A FACTION</Text>
                <Text style={styles.emptySubtitle}>
                  Choose your faction and detachment to see available stratagems
                </Text>
                <View style={styles.divider} />
                <View style={styles.listSectionHeader}>
                  <Text style={styles.listSectionTitle}>UNIVERSAL</Text>
                  <Text style={styles.listSectionCount}>{universalStratagems.length}</Text>
                </View>
                {universalStratagems.map(s => (
                  <StratagemCard
                    key={s.id}
                    stratagem={s}
                    expanded={expandedId === s.id}
                    onPress={() => setExpandedId(prev => (prev === s.id ? null : s.id))}
                  />
                ))}
              </View>
            </>
          }
          contentContainerStyle={styles.listContent}
          keyExtractor={() => 'empty'}
        />
      ) : (
        <FlatList
          data={listItems}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
            item._type === 'separator' ? 'separator' : item.data.id
          }
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  titleRow: {
    paddingTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  title: {
    ...FONTS.heading,
    fontSize: 22,
    color: COLORS.primary,
    letterSpacing: 3,
  },
  sectionLabel: {
    ...FONTS.heading,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  chipRow: {
    paddingBottom: SPACING.sm,
    gap: SPACING.xs,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipDetachment: {
    borderColor: COLORS.secondary,
  },
  chipDetachmentActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  phaseChip: {
    borderColor: COLORS.border,
  },
  chipText: {
    ...FONTS.subheading,
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  listSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  listSectionTitle: {
    ...FONTS.heading,
    fontSize: 11,
    color: COLORS.secondary,
    letterSpacing: 2,
  },
  listSectionCount: {
    ...FONTS.mono,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  emptySection: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SPACING.sm,
  },
  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: SPACING.xs,
  },
  cardName: {
    ...FONTS.subheading,
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  cardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardWhen: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  cardEffect: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 17,
  },
  restrictionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  restrictionLabel: {
    fontSize: 11,
    color: COLORS.warning,
    fontWeight: '700',
  },
  restrictionText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
  },
  // Badges
  cpBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  cpText: {
    ...FONTS.heading,
    fontSize: 10,
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  phaseBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  phaseText: {
    ...FONTS.heading,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    ...FONTS.heading,
    fontSize: 16,
    color: COLORS.textSecondary,
    letterSpacing: 2,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
});
