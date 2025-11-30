import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLoadDetail } from '../../../../../../hooks/useLoadDetail';
import { useLoadActions } from '../../../../../../hooks/useLoadActions';
import { useImageUpload } from '../../../../../../hooks/useImageUpload';
import { PaymentMethod, ZelleRecipient } from '../../../../../../types';
import { DamageDocumentation } from '../../../../../../components/DamageDocumentation';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'cashier_check', label: "Cashier's Check", icon: '🏦' },
  { value: 'money_order', label: 'Money Order', icon: '📄' },
  { value: 'personal_check', label: 'Personal Check', icon: '✍️' },
  { value: 'zelle', label: 'Zelle', icon: '📱' },
  { value: 'already_paid', label: 'No Payment', icon: '✅' },
];

const ZELLE_RECIPIENTS: { value: ZelleRecipient; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'driver', label: 'Driver (Me)' },
  { value: 'original_company', label: 'Original Company' },
];

export default function PickupCompletionScreen() {
  const { id: tripId, loadId } = useLocalSearchParams<{ id: string; loadId: string }>();
  const router = useRouter();
  const { load, loading, error, refetch } = useLoadDetail(loadId);
  const actions = useLoadActions(loadId, refetch);
  const { uploading, progress, uploadLoadPhoto } = useImageUpload();

  // Contract details state
  const [ratePerCuft, setRatePerCuft] = useState('');
  const [linehaulOverride, setLinehaulOverride] = useState('');
  const [balanceDue, setBalanceDue] = useState('');

  // Accessorials state (collapsed by default)
  const [showAccessorials, setShowAccessorials] = useState(false);
  const [shuttle, setShuttle] = useState('');
  const [longCarry, setLongCarry] = useState('');
  const [stairs, setStairs] = useState('');
  const [bulky, setBulky] = useState('');
  const [packing, setPacking] = useState('');
  const [otherAccessorial, setOtherAccessorial] = useState('');
  const [accessorialNotes, setAccessorialNotes] = useState('');

  // Payment state
  const [amountCollected, setAmountCollected] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [zelleRecipient, setZelleRecipient] = useState<ZelleRecipient | null>(null);
  const [paymentPhotoFront, setPaymentPhotoFront] = useState<string | null>(null);
  const [paymentPhotoBack, setPaymentPhotoBack] = useState<string | null>(null);

  // Delivery scheduling state
  const [rfdDate, setRfdDate] = useState<Date | null>(null);
  const [rfdDateEnd, setRfdDateEnd] = useState<Date | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [showRfdPicker, setShowRfdPicker] = useState(false);
  const [showRfdEndPicker, setShowRfdEndPicker] = useState(false);

  // Documentation state
  const [contractPhoto, setContractPhoto] = useState<string | null>(null);
  const [inventoryPhotos, setInventoryPhotos] = useState<string[]>([]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // Initialize form values from load
  useState(() => {
    if (load) {
      setRatePerCuft(load.rate_per_cuft?.toString() || '');
      setBalanceDue(load.balance_due_on_delivery?.toString() || load.contract_balance_due?.toString() || '');
    }
  });

  // Calculated values
  const actualCuft = load?.actual_cuft_loaded || 0;
  const rateNum = parseFloat(ratePerCuft) || 0;
  const calculatedLinehaul = actualCuft * rateNum;
  const linehaulTotal = linehaulOverride ? parseFloat(linehaulOverride) : calculatedLinehaul;

  const accessorialsTotal = useMemo(() => {
    return (
      (parseFloat(shuttle) || 0) +
      (parseFloat(longCarry) || 0) +
      (parseFloat(stairs) || 0) +
      (parseFloat(bulky) || 0) +
      (parseFloat(packing) || 0) +
      (parseFloat(otherAccessorial) || 0)
    );
  }, [shuttle, longCarry, stairs, bulky, packing, otherAccessorial]);

  const totalContract = linehaulTotal + accessorialsTotal;
  const balanceDueNum = parseFloat(balanceDue) || 0;
  const collectedNum = parseFloat(amountCollected) || 0;
  const remainingBalance = balanceDueNum - collectedNum;

  // Check if payment method requires photos
  const requiresPhotos = paymentMethod === 'cashier_check' ||
                         paymentMethod === 'money_order' ||
                         paymentMethod === 'personal_check';

  // Check if payment method requires Zelle recipient
  const requiresZelleRecipient = paymentMethod === 'zelle';

  // Validation
  const isValid =
    rfdDate !== null &&
    (collectedNum === 0 || paymentMethod !== null) &&
    (!requiresPhotos || paymentPhotoFront !== null) &&
    (!requiresZelleRecipient || zelleRecipient !== null);

  const canSubmit = isValid && !submitting && !uploading;

  // Take photo helper
  const takePhoto = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  };

  const handleTakeContractPhoto = async () => {
    const uri = await takePhoto();
    if (uri) setContractPhoto(uri);
  };

  const handleTakeInventoryPhoto = async () => {
    const uri = await takePhoto();
    if (uri) setInventoryPhotos([...inventoryPhotos, uri]);
  };

  const handleTakePaymentPhoto = async (type: 'front' | 'back') => {
    const uri = await takePhoto();
    if (uri) {
      if (type === 'front') {
        setPaymentPhotoFront(uri);
      } else {
        setPaymentPhotoBack(uri);
      }
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !rfdDate) return;

    // Warn if no paperwork captured
    if (!contractPhoto && inventoryPhotos.length === 0) {
      Alert.alert(
        'No Paperwork',
        'You haven\'t captured any contract or inventory photos. Continue anyway?',
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Continue', onPress: () => doSubmit() },
        ]
      );
      return;
    }

    await doSubmit();
  };

  const doSubmit = async () => {
    if (!rfdDate) return;

    setSubmitting(true);
    try {
      // Upload photos
      let contractPhotoUrl: string | null = null;
      let paymentFrontUrl: string | null = null;
      let paymentBackUrl: string | null = null;

      if (contractPhoto) {
        const result = await uploadLoadPhoto(contractPhoto, loadId, 'document');
        if (result.success && result.url) {
          contractPhotoUrl = result.url;
        }
      }

      if (paymentPhotoFront) {
        const result = await uploadLoadPhoto(paymentPhotoFront, loadId, 'document');
        if (result.success && result.url) {
          paymentFrontUrl = result.url;
        }
      }

      if (paymentPhotoBack) {
        const result = await uploadLoadPhoto(paymentPhotoBack, loadId, 'document');
        if (result.success && result.url) {
          paymentBackUrl = result.url;
        }
      }

      // Complete pickup
      const result = await actions.completePickup({
        contractActualCuft: actualCuft,
        contractRatePerCuft: rateNum,
        contractLinehaulTotal: linehaulTotal,
        contractBalanceDue: balanceDueNum,
        accessorials: {
          shuttle: parseFloat(shuttle) || 0,
          longCarry: parseFloat(longCarry) || 0,
          stairs: parseFloat(stairs) || 0,
          bulky: parseFloat(bulky) || 0,
          packing: parseFloat(packing) || 0,
          other: parseFloat(otherAccessorial) || 0,
          notes: accessorialNotes || null,
        },
        amountCollectedAtPickup: collectedNum,
        paymentMethod: collectedNum > 0 ? paymentMethod : null,
        zelleRecipient: requiresZelleRecipient ? zelleRecipient : null,
        paymentPhotoFrontUrl: paymentFrontUrl,
        paymentPhotoBackUrl: paymentBackUrl,
        customerRfdDate: rfdDate.toISOString().split('T')[0],
        customerRfdDateEnd: rfdDateEnd ? rfdDateEnd.toISOString().split('T')[0] : null,
        deliveryNotes: deliveryNotes || null,
        contractPhotoUrl: contractPhotoUrl,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to complete pickup');
        return;
      }

      Alert.alert('Pickup Complete', 'Ready for delivery!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to complete pickup');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Complete Pickup' }} />
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      </>
    );
  }

  if (loading || !load) {
    return (
      <>
        <Stack.Screen options={{ title: 'Complete Pickup' }} />
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color="#0066CC" />
        </View>
      </>
    );
  }

  const customerInfo = load.customer_name || load.pickup_contact_name || 'Customer';
  const locationInfo = [load.pickup_city, load.pickup_state].filter(Boolean).join(', ');

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Complete Pickup',
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{customerInfo}</Text>
          {locationInfo && <Text style={styles.headerSubtitle}>{locationInfo}</Text>}
        </View>

        {/* Section 1: Loading Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loading Summary</Text>
          <Text style={styles.sectionSubtitle}>Captured during loading</Text>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Actual CUFT Loaded</Text>
              <Text style={styles.summaryValueLarge}>{actualCuft.toLocaleString()}</Text>
            </View>
          </View>

          {/* Loading photos thumbnails */}
          {(load.loading_start_photo || load.loading_end_photo) && (
            <View style={styles.photoThumbnails}>
              {load.loading_start_photo && (
                <View style={styles.thumbnailContainer}>
                  <Text style={styles.thumbnailLabel}>Start</Text>
                  <Image source={{ uri: load.loading_start_photo }} style={styles.thumbnail} />
                </View>
              )}
              {load.loading_end_photo && (
                <View style={styles.thumbnailContainer}>
                  <Text style={styles.thumbnailLabel}>End</Text>
                  <Image source={{ uri: load.loading_end_photo }} style={styles.thumbnail} />
                </View>
              )}
            </View>
          )}
        </View>

        {/* Section 2: Pre-Existing Damages */}
        <DamageDocumentation loadId={loadId} onUpdate={refetch} />

        {/* Section 3: Contract Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contract Details</Text>
          <Text style={styles.sectionSubtitle}>Final contract numbers</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Rate per CUFT</Text>
            <View style={styles.currencyInput}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={styles.inputWithPrefix}
                value={ratePerCuft}
                onChangeText={setRatePerCuft}
                placeholder="0.00"
                placeholderTextColor="#666"
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
                onChangeText={setLinehaulOverride}
                placeholder={calculatedLinehaul.toFixed(2)}
                placeholderTextColor="#666"
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
                    value={shuttle}
                    onChangeText={setShuttle}
                    placeholder="0"
                    placeholderTextColor="#666"
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
                    value={longCarry}
                    onChangeText={setLongCarry}
                    placeholder="0"
                    placeholderTextColor="#666"
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
                    value={stairs}
                    onChangeText={setStairs}
                    placeholder="0"
                    placeholderTextColor="#666"
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
                    value={bulky}
                    onChangeText={setBulky}
                    placeholder="0"
                    placeholderTextColor="#666"
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
                    value={packing}
                    onChangeText={setPacking}
                    placeholder="0"
                    placeholderTextColor="#666"
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
                    value={otherAccessorial}
                    onChangeText={setOtherAccessorial}
                    placeholder="0"
                    placeholderTextColor="#666"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <TextInput
                style={styles.textArea}
                value={accessorialNotes}
                onChangeText={setAccessorialNotes}
                placeholder="Accessorial notes..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={2}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Balance Due on Contract</Text>
            <View style={styles.currencyInput}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={styles.inputWithPrefix}
                value={balanceDue}
                onChangeText={setBalanceDue}
                placeholder="0.00"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
              />
            </View>
            <Text style={styles.helperText}>Amount customer owes (after deposit)</Text>
          </View>
        </View>

        {/* Section 4: Payment at Pickup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment at Pickup</Text>
          <Text style={styles.sectionSubtitle}>Customer may pay partial or full balance now</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount Collected</Text>
            <View style={styles.currencyInput}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={styles.inputWithPrefix}
                value={amountCollected}
                onChangeText={setAmountCollected}
                placeholder="0.00"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {collectedNum > 0 && (
            <>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.paymentGrid}>
                {PAYMENT_METHODS.filter(m => m.value !== 'already_paid').map((method) => (
                  <TouchableOpacity
                    key={method.value}
                    style={[
                      styles.paymentOption,
                      paymentMethod === method.value && styles.paymentOptionSelected,
                    ]}
                    onPress={() => {
                      setPaymentMethod(method.value);
                      if (method.value !== 'zelle') setZelleRecipient(null);
                      if (!['cashier_check', 'money_order', 'personal_check'].includes(method.value)) {
                        setPaymentPhotoFront(null);
                        setPaymentPhotoBack(null);
                      }
                    }}
                  >
                    <Text style={styles.paymentIcon}>{method.icon}</Text>
                    <Text
                      style={[
                        styles.paymentLabel,
                        paymentMethod === method.value && styles.paymentLabelSelected,
                      ]}
                    >
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Zelle Recipient */}
              {requiresZelleRecipient && (
                <View style={styles.zelleSection}>
                  <Text style={styles.label}>Who Received the Zelle?</Text>
                  <View style={styles.zelleOptions}>
                    {ZELLE_RECIPIENTS.map((recipient) => (
                      <TouchableOpacity
                        key={recipient.value}
                        style={[
                          styles.zelleOption,
                          zelleRecipient === recipient.value && styles.zelleOptionSelected,
                        ]}
                        onPress={() => setZelleRecipient(recipient.value)}
                      >
                        <View style={styles.radioOuter}>
                          {zelleRecipient === recipient.value && (
                            <View style={styles.radioInner} />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.zelleLabel,
                            zelleRecipient === recipient.value && styles.zelleLabelSelected,
                          ]}
                        >
                          {recipient.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Payment Photos */}
              {requiresPhotos && (
                <View style={styles.photoSection}>
                  <Text style={styles.label}>Payment Photo</Text>
                  <View style={styles.photoRow}>
                    <View style={styles.photoContainer}>
                      <Text style={styles.photoLabel}>Front *</Text>
                      <TouchableOpacity
                        style={styles.photoButton}
                        onPress={() => handleTakePaymentPhoto('front')}
                        disabled={submitting || uploading}
                      >
                        {paymentPhotoFront ? (
                          <Image source={{ uri: paymentPhotoFront }} style={styles.photoPreview} />
                        ) : (
                          <Text style={styles.photoButtonText}>Take Photo</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                    <View style={styles.photoContainer}>
                      <Text style={styles.photoLabel}>Back (optional)</Text>
                      <TouchableOpacity
                        style={styles.photoButton}
                        onPress={() => handleTakePaymentPhoto('back')}
                        disabled={submitting || uploading}
                      >
                        {paymentPhotoBack ? (
                          <Image source={{ uri: paymentPhotoBack }} style={styles.photoPreview} />
                        ) : (
                          <Text style={styles.photoButtonText}>Take Photo</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Section 5: Delivery Information */}
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
                if (date) setRfdDate(date);
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
                if (date) setRfdDateEnd(date);
              }}
            />
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Delivery Notes</Text>
            <TextInput
              style={styles.textArea}
              value={deliveryNotes}
              onChangeText={setDeliveryNotes}
              placeholder="Special instructions, access issues, etc."
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Section 6: Documentation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paperwork</Text>

          <TouchableOpacity
            style={styles.documentButton}
            onPress={handleTakeContractPhoto}
            disabled={submitting || uploading}
          >
            {contractPhoto ? (
              <View style={styles.documentCaptured}>
                <Image source={{ uri: contractPhoto }} style={styles.documentThumbnail} />
                <Text style={styles.documentCapturedText}>Contract/BOL captured</Text>
              </View>
            ) : (
              <>
                <Text style={styles.documentButtonIcon}>📄</Text>
                <Text style={styles.documentButtonText}>Scan Contract/BOL</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.documentButton}
            onPress={handleTakeInventoryPhoto}
            disabled={submitting || uploading}
          >
            {inventoryPhotos.length > 0 ? (
              <View style={styles.documentCaptured}>
                <View style={styles.inventoryThumbnails}>
                  {inventoryPhotos.slice(0, 3).map((uri, index) => (
                    <Image key={index} source={{ uri }} style={styles.inventoryThumb} />
                  ))}
                  {inventoryPhotos.length > 3 && (
                    <View style={styles.moreIndicator}>
                      <Text style={styles.moreText}>+{inventoryPhotos.length - 3}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.documentCapturedText}>
                  {inventoryPhotos.length} inventory photo(s)
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.documentButtonIcon}>📋</Text>
                <Text style={styles.documentButtonText}>Scan Inventory</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Section 7: Summary Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalTitle}>Summary</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Linehaul</Text>
            <Text style={styles.totalValue}>{formatCurrency(linehaulTotal)}</Text>
          </View>
          {accessorialsTotal > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Accessorials</Text>
              <Text style={styles.totalValue}>{formatCurrency(accessorialsTotal)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Contract</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalContract)}</Text>
          </View>
          {collectedNum > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Collected at Pickup</Text>
              <Text style={[styles.totalValue, styles.negativeValue]}>
                -{formatCurrency(collectedNum)}
              </Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.totalRowHighlight]}>
            <Text style={styles.totalLabelBold}>Balance Due at Delivery</Text>
            <Text style={styles.totalValueLarge}>{formatCurrency(remainingBalance)}</Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Text style={styles.submitButtonText}>
            {submitting
              ? 'Completing...'
              : uploading
              ? `Uploading... ${progress}%`
              : 'Complete Pickup'}
          </Text>
        </TouchableOpacity>

        {!rfdDate && (
          <Text style={styles.validationHint}>
            Please select a Ready-for-Delivery date
          </Text>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
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
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#888',
  },
  summaryValueLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10b981',
  },
  photoThumbnails: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  thumbnailContainer: {
    alignItems: 'center',
  },
  thumbnailLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#3a3a4e',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
  },
  currencyPrefix: {
    fontSize: 16,
    color: '#888',
    paddingLeft: 14,
  },
  inputWithPrefix: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: '#fff',
  },
  calculatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  calculatedLabel: {
    fontSize: 14,
    color: '#888',
  },
  calculatedValue: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  collapsibleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  collapsibleSubtitle: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
  },
  collapseIcon: {
    fontSize: 24,
    color: '#888',
  },
  accessorialGrid: {
    gap: 12,
    marginBottom: 16,
  },
  accessorialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accessorialLabel: {
    fontSize: 14,
    color: '#ccc',
    flex: 1,
  },
  currencyInputSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    width: 120,
  },
  currencyPrefixSmall: {
    fontSize: 14,
    color: '#888',
    paddingLeft: 12,
  },
  accessorialInput: {
    flex: 1,
    padding: 10,
    fontSize: 14,
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
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  paymentOption: {
    width: '31%',
    backgroundColor: '#2a2a3e',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentOptionSelected: {
    borderColor: '#0066CC',
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
  },
  paymentIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  paymentLabel: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
  },
  paymentLabelSelected: {
    color: '#0066CC',
    fontWeight: '600',
  },
  zelleSection: {
    marginBottom: 16,
  },
  zelleOptions: {
    gap: 10,
  },
  zelleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    borderRadius: 10,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  zelleOptionSelected: {
    borderColor: '#0066CC',
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0066CC',
  },
  zelleLabel: {
    fontSize: 14,
    color: '#ccc',
  },
  zelleLabelSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  photoSection: {
    marginBottom: 16,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoContainer: {
    flex: 1,
  },
  photoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  photoButton: {
    backgroundColor: '#2a2a3e',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#3a3a4e',
    borderStyle: 'dashed',
  },
  photoButtonText: {
    color: '#888',
    fontSize: 14,
  },
  photoPreview: {
    width: '100%',
    height: 80,
    borderRadius: 8,
  },
  dateButton: {
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 14,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  dateButtonPlaceholder: {
    color: '#666',
  },
  documentButton: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3a3a4e',
    borderStyle: 'dashed',
  },
  documentButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  documentButtonText: {
    fontSize: 16,
    color: '#888',
  },
  documentCaptured: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  documentThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  documentCapturedText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  inventoryThumbnails: {
    flexDirection: 'row',
    gap: 4,
  },
  inventoryThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  moreIndicator: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#3a3a4e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 12,
    color: '#888',
  },
  totalCard: {
    backgroundColor: '#0066CC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  totalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  totalRowHighlight: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    marginTop: 12,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  totalLabelBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  totalValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  totalValueLarge: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '700',
  },
  negativeValue: {
    color: '#ff6b6b',
  },
  submitButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  validationHint: {
    color: '#f59e0b',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  bottomSpacer: {
    height: 40,
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    margin: 20,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
  },
});
