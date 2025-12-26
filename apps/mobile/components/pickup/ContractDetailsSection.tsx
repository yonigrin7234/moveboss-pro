/**
 * ContractDetailsSection Component
 *
 * Handles contract details input for pickup completion:
 * - Rate per CUFT
 * - Linehaul calculation and override
 * - Collapsible accessorials grid
 * - Balance due
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { colors, typography, spacing, radius } from '../../lib/theme';

interface AccessorialsState {
  shuttle: string;
  longCarry: string;
  stairs: string;
  bulky: string;
  packing: string;
  other: string;
  notes: string;
}

interface ContractDetailsSectionProps {
  actualCuft: number;
  ratePerCuft: string;
  onRateChange: (value: string) => void;
  linehaulOverride: string;
  onLinehaulOverrideChange: (value: string) => void;
  calculatedLinehaul: number;
  accessorials: AccessorialsState;
  onAccessorialChange: (field: keyof AccessorialsState, value: string) => void;
  accessorialsTotal: number;
  balanceDue: string;
  onBalanceDueChange: (value: string) => void;
}

export function ContractDetailsSection({
  actualCuft,
  ratePerCuft,
  onRateChange,
  linehaulOverride,
  onLinehaulOverrideChange,
  calculatedLinehaul,
  accessorials,
  onAccessorialChange,
  accessorialsTotal,
  balanceDue,
  onBalanceDueChange,
}: ContractDetailsSectionProps) {
  const [showAccessorials, setShowAccessorials] = useState(false);

  const rateNum = parseFloat(ratePerCuft) || 0;

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Contract Details</Text>
      <Text style={styles.sectionSubtitle}>Final contract numbers</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Rate per CUFT <Text style={styles.required}>*</Text></Text>
        <View style={styles.currencyInput}>
          <Text style={styles.currencyPrefix}>$</Text>
          <TextInput
            style={styles.inputWithPrefix}
            value={ratePerCuft}
            onChangeText={onRateChange}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={styles.calculatedRow}>
        <Text style={styles.calculatedLabel}>
          Linehaul ({actualCuft} × ${rateNum.toFixed(2)})
        </Text>
        <Text style={styles.calculatedValue}>{formatCurrency(calculatedLinehaul)}</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Linehaul Override (if different)</Text>
        <View style={styles.currencyInput}>
          <Text style={styles.currencyPrefix}>$</Text>
          <TextInput
            style={styles.inputWithPrefix}
            value={linehaulOverride}
            onChangeText={onLinehaulOverrideChange}
            placeholder={calculatedLinehaul.toFixed(2)}
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {/* Accessorials (Collapsible) */}
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={() => setShowAccessorials(!showAccessorials)}
      >
        <View>
          <Text style={styles.collapsibleTitle}>Accessorials</Text>
          {accessorialsTotal > 0 && (
            <Text style={styles.collapsibleSubtitle}>
              Total: {formatCurrency(accessorialsTotal)}
            </Text>
          )}
        </View>
        <Text style={styles.collapseIcon}>{showAccessorials ? '−' : '+'}</Text>
      </TouchableOpacity>

      {showAccessorials && (
        <View style={styles.accessorialGrid}>
          <View style={styles.accessorialItem}>
            <Text style={styles.accessorialLabel}>Shuttle</Text>
            <View style={styles.currencyInputSmall}>
              <Text style={styles.currencyPrefixSmall}>$</Text>
              <TextInput
                style={styles.accessorialInput}
                value={accessorials.shuttle}
                onChangeText={(v) => onAccessorialChange('shuttle', v)}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View style={styles.accessorialItem}>
            <Text style={styles.accessorialLabel}>Long Carry</Text>
            <View style={styles.currencyInputSmall}>
              <Text style={styles.currencyPrefixSmall}>$</Text>
              <TextInput
                style={styles.accessorialInput}
                value={accessorials.longCarry}
                onChangeText={(v) => onAccessorialChange('longCarry', v)}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View style={styles.accessorialItem}>
            <Text style={styles.accessorialLabel}>Stairs</Text>
            <View style={styles.currencyInputSmall}>
              <Text style={styles.currencyPrefixSmall}>$</Text>
              <TextInput
                style={styles.accessorialInput}
                value={accessorials.stairs}
                onChangeText={(v) => onAccessorialChange('stairs', v)}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View style={styles.accessorialItem}>
            <Text style={styles.accessorialLabel}>Bulky Items</Text>
            <View style={styles.currencyInputSmall}>
              <Text style={styles.currencyPrefixSmall}>$</Text>
              <TextInput
                style={styles.accessorialInput}
                value={accessorials.bulky}
                onChangeText={(v) => onAccessorialChange('bulky', v)}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View style={styles.accessorialItem}>
            <Text style={styles.accessorialLabel}>Packing</Text>
            <View style={styles.currencyInputSmall}>
              <Text style={styles.currencyPrefixSmall}>$</Text>
              <TextInput
                style={styles.accessorialInput}
                value={accessorials.packing}
                onChangeText={(v) => onAccessorialChange('packing', v)}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View style={styles.accessorialItem}>
            <Text style={styles.accessorialLabel}>Other</Text>
            <View style={styles.currencyInputSmall}>
              <Text style={styles.currencyPrefixSmall}>$</Text>
              <TextInput
                style={styles.accessorialInput}
                value={accessorials.other}
                onChangeText={(v) => onAccessorialChange('other', v)}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <TextInput
            style={styles.textArea}
            value={accessorials.notes}
            onChangeText={(v) => onAccessorialChange('notes', v)}
            placeholder="Accessorial notes..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={2}
          />
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Balance Due on Contract <Text style={styles.required}>*</Text></Text>
        <View style={styles.currencyInput}>
          <Text style={styles.currencyPrefix}>$</Text>
          <TextInput
            style={styles.inputWithPrefix}
            value={balanceDue}
            onChangeText={onBalanceDueChange}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
        <Text style={styles.helperText}>Amount customer owes (after deposit)</Text>
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
  required: {
    color: colors.error,
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    minHeight: 52,
    paddingLeft: spacing.cardPadding,
  },
  currencyPrefix: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  inputWithPrefix: {
    flex: 1,
    paddingVertical: spacing.cardPadding,
    paddingRight: spacing.cardPadding,
    paddingLeft: spacing.xs,
    fontSize: 16,
    color: colors.textPrimary,
  },
  calculatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.cardPadding,
    marginBottom: spacing.lg,
  },
  calculatedLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  calculatedValue: {
    ...typography.body,
    color: colors.success,
    fontWeight: '600',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.cardPadding,
    marginBottom: spacing.lg,
    minHeight: 44,
  },
  collapsibleTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  collapsibleSubtitle: {
    ...typography.caption,
    color: colors.success,
    marginTop: 2,
  },
  collapseIcon: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  accessorialGrid: {
    gap: spacing.itemGap,
    marginBottom: spacing.lg,
  },
  accessorialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accessorialLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
  },
  currencyInputSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    width: 120,
    minHeight: 44,
    paddingLeft: spacing.itemGap,
  },
  currencyPrefixSmall: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  accessorialInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    paddingLeft: spacing.xs,
    fontSize: 14,
    color: colors.textPrimary,
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
  helperText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

export default ContractDetailsSection;
