/**
 * CustomerDeliverySection Component
 *
 * Handles customer and delivery info inputs with action buttons:
 * - Customer name
 * - Customer phone with call button
 * - Delivery address with navigate button
 */

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';

interface CustomerDeliverySectionProps {
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (value: string) => void;
  deliveryAddress: string;
  onDeliveryAddressChange: (value: string) => void;
}

export function CustomerDeliverySection({
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  deliveryAddress,
  onDeliveryAddressChange,
}: CustomerDeliverySectionProps) {
  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleNavigate = (address: string) => {
    const encoded = encodeURIComponent(address);
    Linking.openURL(`https://maps.apple.com/?q=${encoded}`);
  };

  return (
    <View style={styles.section}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Customer Name</Text>
        <TextInput
          style={styles.input}
          value={customerName}
          onChangeText={onCustomerNameChange}
          placeholder="Optional"
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Customer Phone</Text>
        <View style={styles.inputWithAction}>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            value={customerPhone}
            onChangeText={onCustomerPhoneChange}
            placeholder="Optional"
            placeholderTextColor="#666"
            keyboardType="phone-pad"
          />
          {customerPhone && (
            <TouchableOpacity
              style={styles.inputAction}
              onPress={() => handleCall(customerPhone)}
            >
              <Text style={styles.inputActionText}>Call</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Delivery Address</Text>
        <View style={styles.inputWithAction}>
          <TextInput
            style={[styles.textArea, styles.inputFlex]}
            value={deliveryAddress}
            onChangeText={onDeliveryAddressChange}
            placeholder="Optional - enables tap to navigate"
            placeholderTextColor="#666"
            multiline
            numberOfLines={2}
          />
          {deliveryAddress && (
            <TouchableOpacity
              style={styles.inputAction}
              onPress={() => handleNavigate(deliveryAddress)}
            >
              <Text style={styles.inputActionText}>Nav</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.helperText}>
        Having this info lets you tap to call or navigate directly
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#fff',
  },
  inputWithAction: {
    flexDirection: 'row',
    gap: 8,
  },
  inputFlex: {
    flex: 1,
  },
  inputAction: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  inputActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default CustomerDeliverySection;
