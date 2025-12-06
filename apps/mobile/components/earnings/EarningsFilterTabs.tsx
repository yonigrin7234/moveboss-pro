/**
 * EarningsFilterTabs Component
 *
 * Filter tabs for filtering settlements by status.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, radius } from '../../lib/theme';

type FilterType = 'all' | 'pending' | 'paid';

interface EarningsFilterTabsProps {
  selectedFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export function EarningsFilterTabs({ selectedFilter, onFilterChange }: EarningsFilterTabsProps) {
  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
  ];

  return (
    <View style={styles.filterTabs}>
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.value}
          style={[styles.filterTab, selectedFilter === filter.value && styles.filterTabActive]}
          onPress={() => onFilterChange(filter.value)}
        >
          <Text
            style={[
              styles.filterTabText,
              selectedFilter === filter.value && styles.filterTabTextActive,
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.xs,
    marginBottom: spacing.sectionGap,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
    minHeight: 44,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.textPrimary,
  },
});

export default EarningsFilterTabs;
