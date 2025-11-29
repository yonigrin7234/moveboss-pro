import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Trip } from '../types';
import { StatusBadge } from './StatusBadge';

interface TripCardProps {
  trip: Trip;
  variant?: 'default' | 'compact';
}

export function TripCard({ trip, variant = 'default' }: TripCardProps) {
  const router = useRouter();

  const formatRoute = () => {
    const origin = [trip.origin_city, trip.origin_state].filter(Boolean).join(', ');
    const destination = [trip.destination_city, trip.destination_state].filter(Boolean).join(', ');
    if (origin && destination) {
      return `${origin} → ${destination}`;
    }
    return origin || destination || 'No route set';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handlePress = () => {
    router.push(`/(app)/trips/${trip.id}`);
  };

  if (variant === 'compact') {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={handlePress}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactTripNumber}>Trip #{trip.trip_number}</Text>
          <StatusBadge status={trip.status} size="small" />
        </View>
        <Text style={styles.compactRoute} numberOfLines={1}>
          {formatRoute()}
        </Text>
        {trip.start_date && (
          <Text style={styles.compactDate}>{formatDate(trip.start_date)}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.header}>
        <View>
          <Text style={styles.tripNumber}>Trip #{trip.trip_number}</Text>
          <Text style={styles.route}>{formatRoute()}</Text>
        </View>
        <StatusBadge status={trip.status} />
      </View>

      <View style={styles.details}>
        {trip.start_date && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Start Date</Text>
            <Text style={styles.detailValue}>{formatDate(trip.start_date)}</Text>
          </View>
        )}
        {trip.actual_miles && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Miles</Text>
            <Text style={styles.detailValue}>{trip.actual_miles.toLocaleString()}</Text>
          </View>
        )}
        {trip.total_cuft && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>CUFT</Text>
            <Text style={styles.detailValue}>{trip.total_cuft.toLocaleString()}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.viewDetails}>View Details →</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2a2a3e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tripNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  route: {
    fontSize: 16,
    color: '#888',
  },
  details: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  detailItem: {},
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#3a3a4e',
    paddingTop: 12,
  },
  viewDetails: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '600',
  },
  // Compact variant
  compactCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactTripNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  compactRoute: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  compactDate: {
    fontSize: 12,
    color: '#666',
  },
});
