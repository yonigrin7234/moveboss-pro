import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoadDetail } from '../../../../../../hooks/useLoadDetail';
import { useLoadActions } from '../../../../../../hooks/useLoadActions';
import { useImageUpload } from '../../../../../../hooks/useImageUpload';
import { useToast, LoadDetailSkeleton } from '../../../../../../components/ui';
import { ErrorState } from '../../../../../../components/ui';
import { PaymentMethod, ZelleRecipient } from '../../../../../../types';
import { DamageDocumentation } from '../../../../../../components/DamageDocumentation';
import {
  ContractDetailsSection,
  PaymentCollectionSection,
  DeliveryScheduleSection,
  PaperworkSection,
  SummaryCard,
  PickupCompletionHeader,
  PickupLoadingSummary,
  PickupSubmitButton,
} from '../../../../../../components/pickup';
import ErrorBoundary from '../../../../../../components/ui/ErrorBoundary';
import { colors, typography, spacing, radius } from '../../../../../../lib/theme';

interface AccessorialsState {
  shuttle: string;
  longCarry: string;
  stairs: string;
  bulky: string;
  packing: string;
  other: string;
  notes: string;
}

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

  // Accessorials state
  const [accessorials, setAccessorials] = useState<AccessorialsState>({
    shuttle: '',
    longCarry: '',
    stairs: '',
    bulky: '',
    packing: '',
    other: '',
    notes: '',
  });

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
      (parseFloat(accessorials.shuttle) || 0) +
      (parseFloat(accessorials.longCarry) || 0) +
      (parseFloat(accessorials.stairs) || 0) +
      (parseFloat(accessorials.bulky) || 0) +
      (parseFloat(accessorials.packing) || 0) +
      (parseFloat(accessorials.other) || 0)
    );
  }, [accessorials]);

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

  // Accessorial change handler
  const handleAccessorialChange = (field: keyof AccessorialsState, value: string) => {
    setAccessorials(prev => ({ ...prev, [field]: value }));
  };

  // Payment method change handler
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method !== 'zelle') setZelleRecipient(null);
    if (!['cashier_check', 'money_order', 'personal_check'].includes(method)) {
      setPaymentPhotoFront(null);
      setPaymentPhotoBack(null);
    }
  };

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
          shuttle: parseFloat(accessorials.shuttle) || 0,
          longCarry: parseFloat(accessorials.longCarry) || 0,
          stairs: parseFloat(accessorials.stairs) || 0,
          bulky: parseFloat(accessorials.bulky) || 0,
          packing: parseFloat(accessorials.packing) || 0,
          other: parseFloat(accessorials.other) || 0,
          notes: accessorials.notes || null,
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

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Complete Pickup' }} />
        <View style={styles.container}>
          <ErrorState title="Unable to load pickup" message={error} actionLabel="Retry" onAction={refetch} />
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
    <ErrorBoundary fallback={<FallbackView />}>
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
          <PickupCompletionHeader title={customerInfo} subtitle={locationInfo} />

          <PickupLoadingSummary
            actualCuft={actualCuft}
            startPhoto={load.loading_start_photo}
            endPhoto={load.loading_end_photo}
          />

          {/* Section 2: Pre-Existing Damages */}
          <DamageDocumentation loadId={loadId} onUpdate={refetch} />

          {/* Section 3: Contract Details */}
          <ContractDetailsSection
            actualCuft={actualCuft}
            ratePerCuft={ratePerCuft}
            onRateChange={setRatePerCuft}
            linehaulOverride={linehaulOverride}
            onLinehaulOverrideChange={setLinehaulOverride}
            calculatedLinehaul={calculatedLinehaul}
            accessorials={accessorials}
            onAccessorialChange={handleAccessorialChange}
            accessorialsTotal={accessorialsTotal}
            balanceDue={balanceDue}
            onBalanceDueChange={setBalanceDue}
          />

          {/* Section 4: Payment at Pickup */}
          <PaymentCollectionSection
            amountCollected={amountCollected}
            onAmountChange={setAmountCollected}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={handlePaymentMethodChange}
            zelleRecipient={zelleRecipient}
            onZelleRecipientChange={setZelleRecipient}
            paymentPhotoFront={paymentPhotoFront}
            paymentPhotoBack={paymentPhotoBack}
            onTakePaymentPhoto={handleTakePaymentPhoto}
            disabled={submitting || uploading}
          />

          {/* Section 5: Delivery Information */}
          <DeliveryScheduleSection
            rfdDate={rfdDate}
            onRfdDateChange={setRfdDate}
            rfdDateEnd={rfdDateEnd}
            onRfdDateEndChange={setRfdDateEnd}
            deliveryNotes={deliveryNotes}
            onDeliveryNotesChange={setDeliveryNotes}
          />

          {/* Section 6: Documentation */}
          <PaperworkSection
            contractPhoto={contractPhoto}
            onTakeContractPhoto={handleTakeContractPhoto}
            inventoryPhotos={inventoryPhotos}
            onTakeInventoryPhoto={handleTakeInventoryPhoto}
            disabled={submitting || uploading}
          />

          {/* Section 7: Summary Card */}
          <SummaryCard
            linehaulTotal={linehaulTotal}
            accessorialsTotal={accessorialsTotal}
            totalContract={totalContract}
            amountCollected={collectedNum}
            remainingBalance={remainingBalance}
          />

          <PickupSubmitButton
            canSubmit={canSubmit}
            submitting={submitting}
            uploading={uploading}
            progress={progress}
            onSubmit={handleSubmit}
            showValidationHint={!rfdDate}
          />
        </ScrollView>
      </>
    </ErrorBoundary>
  );
}

function FallbackView() {
  return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={styles.errorText}>Something went wrong. Please try again.</Text>
    </View>
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
  errorText: {
    ...typography.body,
    color: colors.error,
  },
});
