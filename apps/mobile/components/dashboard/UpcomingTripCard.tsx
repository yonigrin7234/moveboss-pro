/**
 * UpcomingTripCard Component
 *
 * Card showing upcoming trip summary with route and date.
 */

import { View, Text, StyleSheet } from 'react-native';
import { TripWithLoads } from '../../types';
import { colors, typography, spacing } from '../../lib/theme';

interface UpcomingTripCardProps {
  trip: TripWithLoads;
}

export function UpcomingTripCard({ trip }: UpcomingTripCardProps) {
  const route = `${trip.origin_city || '?'}, ${trip.origin_state || ''} → ${trip.destination_city || '?'}, ${trip.destination_state || ''}`;
  const loadCount = trip.trip_loads?.length || 0;
  const dateStr = trip.start_date
    ? new Date(trip.start_date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : 'TBD';

  return (
    <View style={styles.upcomingCard}>
      <View style={styles.upcomingCardLeft}>
        <Text style={styles.upcomingTripNumber}>Trip #{trip.trip_number}</Text>
        <Text style={styles.upcomingRoute} numberOfLines={1}>
          {route}
        </Text>
      </View>
      <View style={styles.upcomingCardRight}>
        <Text style={styles.upcomingDate}>{dateStr}</Text>
        <Text style={styles.upcomingLoads}>
          {loadCount} load{loadCount !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  upcomingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  upcomingCardLeft: {
    flex: 1,
  },
  upcomingCardRight: {
    alignItems: 'flex-end',
  },
  upcomingTripNumber: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  upcomingRoute: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  upcomingDate: {
    ...typography.caption,
    color: colors.primary,
    marginBottom: spacing.xxs,
  },
  upcomingLoads: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

export default UpcomingTripCard;
