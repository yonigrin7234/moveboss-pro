/**
 * AccessorialsSection Component
 *
 * Collapsible accessorials input grid for contract details.
 * Displays pre-charged accessorial amounts.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';

interface AccessorialsState {
  shuttle: string;
  longCarry: string;
  stairs: string;
  bulky: string;
  packing: string;
  other: string;
  notes: string;
}

interface AccessorialsSectionProps {
  accessorials: AccessorialsState;
  onAccessorialChange: (field: keyof AccessorialsState, value: string) => void;
}

export function AccessorialsSection({
  accessorials,
  onAccessorialChange,
}: AccessorialsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View>
          <Text style={styles.sectionTitle}>Pre-Charged Accessorials</Text>
          <Text style={styles.sectionSubtitle}>Charges already on the loading report</Text>
        </View>
        <Text style={styles.collapseIcon}>{expanded ? '−' : '+'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.section}>
          <Text style={styles.helperText}>
            These are NOT new charges - they're already billed to customer
          </Text>

          <View style={styles.accessorialGrid}>
            <View style={styles.accessorialItem}>
              <Text style={styles.accessorialLabel}>Shuttle</Text>
              <TextInput
                style={styles.accessorialInput}
                value={accessorials.shuttle}
                onChangeText={(v) => onAccessorialChange('shuttle', v)}
                placeholder="0"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.accessorialItem}>
              <Text style={styles.accessorialLabel}>Long Carry</Text>
              <TextInput
                style={styles.accessorialInput}
                value={accessorials.longCarry}
                onChangeText={(v) => onAccessorialChange('longCarry', v)}
                placeholder="0"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.accessorialItem}>
              <Text style={styles.accessorialLabel}>Stairs</Text>
              <TextInput
                style={styles.accessorialInput}
                value={accessorials.stairs}
                onChangeText={(v) => onAccessorialChange('stairs', v)}
                placeholder="0"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.accessorialItem}>
              <Text style={styles.accessorialLabel}>Bulky Items</Text>
              <TextInput
                style={styles.accessorialInput}
                value={accessorials.bulky}
                onChangeText={(v) => onAccessorialChange('bulky', v)}
                placeholder="0"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.accessorialItem}>
              <Text style={styles.accessorialLabel}>Packing</Text>
              <TextInput
                style={styles.accessorialInput}
                value={accessorials.packing}
                onChangeText={(v) => onAccessorialChange('packing', v)}
                placeholder="0"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.accessorialItem}>
              <Text style={styles.accessorialLabel}>Other</Text>
              <TextInput
                style={styles.accessorialInput}
                value={accessorials.other}
                onChangeText={(v) => onAccessorialChange('other', v)}
                placeholder="0"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <TextInput
            style={styles.textArea}
            value={accessorials.notes}
            onChangeText={(v) => onAccessorialChange('notes', v)}
            placeholder="Notes about accessorials..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={2}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  collapseIcon: {
    fontSize: 24,
    color: '#888',
  },
  section: {
    marginBottom: 24,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  accessorialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  accessorialItem: {
    width: '48%',
  },
  accessorialLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  accessorialInput: {
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    minHeight: 60,
    textAlignVertical: 'top',
  },
});

export default AccessorialsSection;
