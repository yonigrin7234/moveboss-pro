import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoadDetail } from '../../../../../../hooks/useLoadDetail';
import { useLoadActions } from '../../../../../../hooks/useLoadActions';
import { useImageUpload } from '../../../../../../hooks/useImageUpload';
import { useToast, LoadDetailSkeleton, Icon, IconName } from '../../../../../../components/ui';
import { PaymentMethod, ZelleRecipient } from '../../../../../../types';
import { DamageDocumentation } from '../../../../../../components/DamageDocumentation';
import { colors, typography, spacing, radius, shadows } from '../../../../../../lib/theme';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: IconName }[] = [
  { value: 'cash', label: 'Cash', icon: 'banknote' },
  { value: 'cashier_check', label: "Cashier's Check", icon: 'credit-card' },
  { value: 'money_order', label: 'Money Order', icon: 'file-text' },
  { value: 'personal_check', label: 'Personal Check', icon: 'edit' },
  { value: 'zelle', label: 'Zelle', icon: 'phone' },
  { value: 'already_paid', label: 'No Payment', icon: 'check-circle' },
];

const ZELLE_RECIPIENTS: { value: ZelleRecipient; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'driver', label: 'Driver (Me)' },
  { value: 'original_company', label: 'Original Company' },
];

export default function PickupCompletionScreen() {
  const { id: tripId, loadId } = useLocalSearchParams<{ id: string; loadId: string }>();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
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

  // Delivery scheduling state - default to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [rfdDate, setRfdDate] = useState<Date | null>(tomorrow);
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
      toast.warning('Camera permission needed');
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

    // Warn if no paperwork but proceed anyway (just a toast warning)
    if (!contractPhoto && inventoryPhotos.length === 0) {
      toast.warning('No paperwork photos captured');
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
        toast.error(result.error || 'Failed to complete pickup');
        return;
      }

      // Auto-navigate back with success toast
      toast.success('Pickup complete - Ready for delivery!');
      router.back();
    } catch (err) {
      toast.error('Failed to complete pickup');
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
        <View style={styles.container}>
          <LoadDetailSkeleton style={{ padding: spacing.screenPadding }} />
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
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.screenPadding }]}
        keyboardDismissMode="on-drag"
      >
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
                onChangeText={setLinehaulOverride}
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
                    value={shuttle}
                    onChangeText={setShuttle}
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
                    value={longCarry}
                    onChangeText={setLongCarry}
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
                    value={stairs}
                    onChangeText={setStairs}
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
                    value={bulky}
                    onChangeText={setBulky}
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
                    value={packing}
                    onChangeText={setPacking}
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
                    value={otherAccessorial}
                    onChangeText={setOtherAccessorial}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <TextInput
                style={styles.textArea}
                value={accessorialNotes}
                onChangeText={setAccessorialNotes}
                placeholder="Accessorial notes..."
                placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
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
                    <Icon
                      name={method.icon}
                      size="lg"
                      color={paymentMethod === method.value ? colors.primary : colors.textSecondary}
                    />
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
              placeholderTextColor={colors.textMuted}
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
                <Icon name="file-text" size="lg" color={colors.textSecondary} />
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
                <Icon name="clipboard-list" size="lg" color={colors.textSecondary} />
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
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.screenPadding,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.sectionGap,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
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
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.cardPadding,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  summaryValueLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.success,
  },
  photoThumbnails: {
    flexDirection: 'row',
    gap: spacing.itemGap,
    marginTop: spacing.itemGap,
  },
  thumbnailContainer: {
    alignItems: 'center',
  },
  thumbnailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    backgroundColor: colors.borderLight,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  currencyPrefix: {
    ...typography.body,
    color: colors.textSecondary,
    paddingLeft: spacing.cardPadding,
  },
  inputWithPrefix: {
    flex: 1,
    padding: spacing.cardPadding,
    ...typography.body,
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
  },
  currencyPrefixSmall: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    paddingLeft: spacing.itemGap,
  },
  accessorialInput: {
    flex: 1,
    padding: spacing.sm,
    ...typography.bodySmall,
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
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  paymentOption: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: spacing.sm,
    padding: spacing.itemGap,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 44,
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
  },
  paymentIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  paymentLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  paymentLabelSelected: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  zelleSection: {
    marginBottom: spacing.lg,
  },
  zelleOptions: {
    gap: spacing.sm,
  },
  zelleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.sm,
    padding: spacing.cardPadding,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 44,
  },
  zelleOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    marginRight: spacing.itemGap,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  zelleLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  zelleLabelSelected: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  photoSection: {
    marginBottom: spacing.lg,
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.itemGap,
  },
  photoContainer: {
    flex: 1,
  },
  photoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  photoButton: {
    backgroundColor: colors.surface,
    borderRadius: spacing.sm,
    padding: spacing.cardPadding,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
  },
  photoButtonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  photoPreview: {
    width: '100%',
    height: 80,
    borderRadius: radius.sm,
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
  documentButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.cardPaddingLarge,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.itemGap,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    minHeight: 44,
  },
  documentButtonIcon: {
    fontSize: 24,
    marginRight: spacing.itemGap,
  },
  documentButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  documentCaptured: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.itemGap,
  },
  documentThumbnail: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
  },
  documentCapturedText: {
    ...typography.bodySmall,
    color: colors.success,
    fontWeight: '500',
  },
  inventoryThumbnails: {
    flexDirection: 'row',
    gap: spacing.xs,
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
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  totalCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.sectionGap,
  },
  totalTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.lg,
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
    marginTop: spacing.itemGap,
    paddingTop: spacing.lg,
  },
  totalLabel: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
  },
  totalLabelBold: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  totalValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  totalValueLarge: {
    fontSize: 24,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  negativeValue: {
    color: '#ff6b6b',
  },
  submitButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    padding: 18,
    alignItems: 'center',
    minHeight: 44,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  validationHint: {
    ...typography.bodySmall,
    color: colors.warning,
    textAlign: 'center',
    marginTop: spacing.itemGap,
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    borderRadius: radius.md,
    padding: spacing.cardPadding,
    margin: spacing.screenPadding,
  },
  errorText: {
    ...typography.bodySmall,
    color: '#991b1b',
  },
});
