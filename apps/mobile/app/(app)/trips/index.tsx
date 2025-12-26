import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDriverTrips, TripWithLoadSummary } from '../../../hooks/useDriverTrips';
import { TripCard } from '../../../components/TripCard';
import { EmptyState, TripCardSkeleton, ErrorState, Icon } from '../../../components/ui';
import { TripStatus } from '../../../types';
import { colors, typography, spacing, radius } from '../../../lib/theme';

// Active statuses that get hero treatment
const ACTIVE_STATUSES: TripStatus[] = ['active', 'en_route'];

// Section type for SectionList
interface TripSection {
  title: string;
  type: 'active' | 'upcoming' | 'past';
  data: TripWithLoadSummary[];
}

// Sort trips within sections by date
function sortByDate(trips: TripWithLoadSummary[], ascending: boolean = false): TripWithLoadSummary[] {
  return [...trips].sort((a, b) => {
    const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
    const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
    return ascending ? dateA - dateB : dateB - dateA;
  });
}

// Categorize trips into sections
function categorizTrips(trips: TripWithLoadSummary[]): TripSection[] {
  const activeTrips = trips.filter(t => ACTIVE_STATUSES.includes(t.status));
  const upcomingTrips = trips.filter(t => t.status === 'planned');
  const pastTrips = trips.filter(t =>
    t.status === 'completed' || t.status === 'settled' || t.status === 'cancelled'
  );

  const sections: TripSection[] = [];

  if (activeTrips.length > 0) {
    sections.push({
      title: 'Active Trip',
      type: 'active',
      data: sortByDate(activeTrips, true), // Oldest first for active (started first)
    });
  }

  if (upcomingTrips.length > 0) {
    sections.push({
      title: 'Upcoming',
      type: 'upcoming',
      data: sortByDate(upcomingTrips, true), // Soonest first
    });
  }

  if (pastTrips.length > 0) {
    sections.push({
      title: 'Past Trips',
      type: 'past',
      data: sortByDate(pastTrips, false), // Most recent first
    });
  }

  return sections;
}

// Memoized trip cards for performance
const ActiveTripCard = React.memo(function ActiveTripCard({ trip }: { trip: TripWithLoadSummary }) {
  return <TripCard trip={trip} variant="hero" />;
});

const CompactTripCard = React.memo(function CompactTripCard({ trip }: { trip: TripWithLoadSummary }) {
  return <TripCard trip={trip} variant="compact" />;
});

export default function TripsScreen() {
  const { trips, loading, error, refetch } = useDriverTrips();
  const insets = useSafeAreaInsets();

  // Memoize sections to prevent recalculation
  const sections = useMemo(() => categorizTrips(trips), [trips]);

  // Render section header
  const renderSectionHeader = useCallback(({ section }: { section: TripSection }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderContent}>
        <Icon
          name={section.type === 'active' ? 'zap' : section.type === 'upcoming' ? 'clock' : 'check-circle'}
          size="sm"
          color={section.type === 'active' ? colors.primary : colors.textMuted}
        />
        <Text style={[
          styles.sectionTitle,
          section.type === 'active' && styles.sectionTitleActive
        ]}>
          {section.title}
        </Text>
      </View>
      <Text style={styles.sectionCount}>
        {section.data.length} trip{section.data.length !== 1 ? 's' : ''}
      </Text>
    </View>
  ), []);

  // Render item based on section type
  const renderItem = useCallback(({ item, section }: { item: TripWithLoadSummary; section: TripSection }) => {
    if (section.type === 'active') {
      return <ActiveTripCard trip={item} />;
    }
    return <CompactTripCard trip={item} />;
  }, []);

  const keyExtractor = useCallback((item: TripWithLoadSummary) => item.id, []);

  // Empty state component
  const ListEmptyComponent = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.skeletonList}>
          <View style={styles.skeletonSection}>
            <View style={styles.skeletonHeader} />
            <TripCardSkeleton style={styles.skeletonCard} />
          </View>
          <View style={styles.skeletonSection}>
            <View style={styles.skeletonHeader} />
            <TripCardSkeleton style={styles.skeletonCard} />
            <TripCardSkeleton />
          </View>
        </View>
      );
    }
    return (
      <EmptyState
        illustration="no-trips"
        title="No trips yet"
        description="Trips assigned to you will appear here"
      />
    );
  }, [loading]);

  // Section separator
  const renderSectionFooter = useCallback(({ section }: { section: TripSection }) => {
    // Add extra space after active section for visual separation
    if (section.type === 'active') {
      return <View style={styles.activeSectionFooter} />;
    }
    return null;
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Trips',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <View style={styles.container}>
        {error && (
          <View style={{ margin: spacing.screenPadding, marginBottom: 0 }}>
            <ErrorState title="Unable to load trips" message={error} actionLabel="Retry" onAction={refetch} />
          </View>
        )}

        <SectionList
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          renderSectionFooter={renderSectionFooter}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxxl },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={loading && trips.length > 0}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={ListEmptyComponent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          initialNumToRender={5}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.screenPadding,
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.subheadline,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitleActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  sectionCount: {
    ...typography.caption,
    color: colors.textMuted,
  },
  activeSectionFooter: {
    height: spacing.md,
  },
  skeletonList: {
    gap: spacing.xl,
  },
  skeletonSection: {
    gap: spacing.md,
  },
  skeletonHeader: {
    width: 120,
    height: 16,
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  skeletonCard: {
    marginBottom: spacing.md,
  },
});
