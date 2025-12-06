/**
 * DeliveryScheduleSection Component
 *
 * Handles delivery scheduling inputs:
 * - First available date (RFD)
 * - Delivery window end date
 * - Delivery notes
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, typography, spacing, radius } from '../../lib/theme';

interface DeliveryScheduleSectionProps {
  rfdDate: Date | null;
  onRfdDateChange: (date: Date) => void;
  rfdDateEnd: Date | null;
  onRfdDateEndChange: (date: Date | null) => void;
  deliveryNotes: string;
  onDeliveryNotesChange: (notes: string) => void;
}

export function DeliveryScheduleSection({
  rfdDate,
  onRfdDateChange,
  rfdDateEnd,
  onRfdDateEndChange,
  deliveryNotes,
  onDeliveryNotesChange,
}: DeliveryScheduleSectionProps) {
  const [showRfdPicker, setShowRfdPicker] = useState(false);
  const [showRfdEndPicker, setShowRfdEndPicker] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Delivery Schedule</Text>
      <Text style={styles.sectionSubtitle}>When is customer ready to receive?</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>First Available Date (RFD) *</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowRfdPicker(true)}
        >
          <Text style={[styles.dateButtonText, !rfdDate && styles.dateButtonPlaceholder]}>
            {formatDate(rfdDate)}
          </Text>
        </TouchableOpacity>
      </View>

      {showRfdPicker && (
        <DateTimePicker
          value={rfdDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            setShowRfdPicker(Platform.OS === 'ios');
            if (date) onRfdDateChange(date);
          }}
        />
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Delivery Window End (optional)</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowRfdEndPicker(true)}
        >
          <Text style={[styles.dateButtonText, !rfdDateEnd && styles.dateButtonPlaceholder]}>
            {rfdDateEnd ? formatDate(rfdDateEnd) : 'Select end date'}
          </Text>
        </TouchableOpacity>
      </View>

      {showRfdEndPicker && (
        <DateTimePicker
          value={rfdDateEnd || rfdDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={rfdDate || new Date()}
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            setShowRfdEndPicker(Platform.OS === 'ios');
            if (date) onRfdDateEndChange(date);
          }}
        />
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Delivery Notes</Text>
        <TextInput
          style={styles.textArea}
          value={deliveryNotes}
          onChangeText={onDeliveryNotesChange}
          placeholder="Special instructions, access issues, etc."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.sectionGap,
  },
  sectionTitle: {
    ...typography.subheadline,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  dateButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.cardPadding,
    minHeight: 44,
  },
  dateButtonText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  dateButtonPlaceholder: {
    ...typography.body,
    color: colors.textMuted,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.cardPadding,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 60,
    textAlignVertical: 'top',
  },
});

export default DeliveryScheduleSection;
