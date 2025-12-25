import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useLoadDetail } from '../../../../../../hooks/useLoadDetail';
import { useLoadActions } from '../../../../../../hooks/useLoadActions';
import { useImageUpload } from '../../../../../../hooks/useImageUpload';
import { useToast, LoadDetailSkeleton, ErrorState } from '../../../../../../components/ui';
import { DamageDocumentation } from '../../../../../../components/DamageDocumentation';
import {
  DocumentScanner,
  CustomerDeliverySection,
  AccessorialsSection,
  ContractSummaryCard,
} from '../../../../../../components/contract';

interface AccessorialsState {
  shuttle: string;
  longCarry: string;
  stairs: string;
  bulky: string;
  packing: string;
  other: string;
  notes: string;
}

export default function ContractDetailsScreen() {
  const { id: tripId, loadId } = useLocalSearchParams<{ id: string; loadId: string }>();
  const router = useRouter();
  const toast = useToast();
  const { load, loading, error, refetch } = useLoadDetail(loadId);
  const actions = useLoadActions(loadId, refetch);
  const { uploading, progress, uploadLoadPhoto } = useImageUpload();

  // Form state
  const [balanceDue, setBalanceDue] = useState('');
  const [ratePerCuft, setRatePerCuft] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // Initialize rate from load data if already set
  const [rateInitialized, setRateInitialized] = useState(false);
  if (!rateInitialized && load?.rate_per_cuft && !ratePerCuft) {
    setRatePerCuft(load.rate_per_cuft.toString());
    setRateInitialized(true);
  }

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

  // Photo state
  const [loadingReportPhoto, setLoadingReportPhoto] = useState<string | null>(null);
  const [bolPhoto, setBolPhoto] = useState<string | null>(null);
  const [loadingReportUrl, setLoadingReportUrl] = useState<string | null>(null);
  const [bolUrl, setBolUrl] = useState<string | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // Computed values
  const actualCuft = load?.actual_cuft_loaded || 0;
  const ratePerCuftNum = parseFloat(ratePerCuft) || 0;
  const linehaulTotal = actualCuft * ratePerCuftNum;

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

  const totalRevenue = linehaulTotal + accessorialsTotal;
  const balanceDueNum = parseFloat(balanceDue) || 0;
  const amountCompanyOwes = totalRevenue - balanceDueNum;

  const canSubmit = balanceDue.trim() !== '' && ratePerCuft.trim() !== '' && !submitting && !uploading;

  // Accessorial change handler
  const handleAccessorialChange = (field: keyof AccessorialsState, value: string) => {
    setAccessorials(prev => ({ ...prev, [field]: value }));
  };

  // Handle loading report scan data
  const handleLoadingReportData = (data: Record<string, unknown>) => {
    if (data.balance_due) {
      setBalanceDue(String(data.balance_due));
    }
    if (data.job_number) {
      setJobNumber(String(data.job_number));
    }
    if (data.rate_per_cuft) {
      setRatePerCuft(String(data.rate_per_cuft));
    }
  };

  // Handle BOL scan data
  const handleBolData = (data: Record<string, unknown>) => {
    if (data.customer_name) {
      setCustomerName(String(data.customer_name));
    }
    if (data.customer_phone) {
      setCustomerPhone(String(data.customer_phone));
    }
    if (data.delivery_address) {
      setDeliveryAddress(String(data.delivery_address));
    }
  };

  // Save and Continue
  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      // Upload photos if taken
      let loadingReportPhotoUrl = loadingReportUrl;
      let bolPhotoUrl = bolUrl;

      if (loadingReportPhoto && !loadingReportUrl) {
        const result = await uploadLoadPhoto(loadingReportPhoto, loadId, 'document');
        if (result.success && result.url) {
          loadingReportPhotoUrl = result.url;
          setLoadingReportUrl(result.url);
        }
      }

      if (bolPhoto && !bolUrl) {
        const result = await uploadLoadPhoto(bolPhoto, loadId, 'document');
        if (result.success && result.url) {
          bolPhotoUrl = result.url;
          setBolUrl(result.url);
        }
      }

      // Save contract details
      const result = await actions.saveContractDetails({
        contractBalanceDue: parseFloat(balanceDue),
        contractRatePerCuft: ratePerCuftNum,
        contractJobNumber: jobNumber || null,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        deliveryAddressFull: deliveryAddress || null,
        contractLinehaulTotal: linehaulTotal,
        amountCompanyOwes,
        accessorials: {
          shuttle: parseFloat(accessorials.shuttle) || 0,
          longCarry: parseFloat(accessorials.longCarry) || 0,
          stairs: parseFloat(accessorials.stairs) || 0,
          bulky: parseFloat(accessorials.bulky) || 0,
          packing: parseFloat(accessorials.packing) || 0,
          other: parseFloat(accessorials.other) || 0,
          notes: accessorials.notes || null,
        },
        loadingReportPhotoUrl,
        contractPhotoUrl: bolPhotoUrl,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to save');
        return;
      }

      toast.success('Contract saved - Ready for delivery!');
      // Navigate explicitly to load detail (ready for delivery)
      router.replace(`/(app)/trips/${tripId}/loads/${loadId}`);
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Contract Details' }} />
        <View style={styles.container}>
          <ErrorState title="Unable to load contract details" message={error} actionLabel="Retry" onAction={refetch} />
        </View>
      </>
    );
  }

  if (loading || !load) {
    return (
      <>
        <Stack.Screen options={{ title: 'Contract Details' }} />
        <View style={styles.container}>
          <LoadDetailSkeleton style={{ padding: 20 }} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Enter Contract Details',
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Section 1: Loading Report Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loading Report Details</Text>
          <Text style={styles.sectionSubtitle}>From your loading report</Text>

          <DocumentScanner
            label="Scan Loading Report"
            endpoint="loading-report"
            photo={loadingReportPhoto}
            onPhotoTaken={setLoadingReportPhoto}
            onDataExtracted={handleLoadingReportData}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Balance Due on Delivery *</Text>
            <TextInput
              style={styles.input}
              value={balanceDue}
              onChangeText={setBalanceDue}
              placeholder="0.00"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />
            <Text style={styles.helperText}>Amount to collect from customer</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Job Number (optional)</Text>
            <TextInput
              style={styles.input}
              value={jobNumber}
              onChangeText={setJobNumber}
              placeholder="Company's reference number"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Rate per CUFT *</Text>
            <TextInput
              style={styles.input}
              value={ratePerCuft}
              onChangeText={setRatePerCuft}
              placeholder="0.00"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />
            <Text style={styles.helperText}>From your loading report</Text>
          </View>

          {/* Auto-calculated summary */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Actual CUFT</Text>
              <Text style={styles.infoValue}>{actualCuft}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rate per CUFT</Text>
              <Text style={styles.infoValue}>{formatCurrency(ratePerCuftNum)}</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowHighlight]}>
              <Text style={styles.infoLabel}>Linehaul Total</Text>
              <Text style={styles.infoValueLarge}>{formatCurrency(linehaulTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Section 2: Pre-Existing Damages */}
        <DamageDocumentation loadId={loadId} onUpdate={refetch} />

        {/* Section 3: Customer & Delivery Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer & Delivery Info</Text>
          <Text style={styles.sectionSubtitle}>From the Bill of Lading (for navigation & contact)</Text>

          <DocumentScanner
            label="Scan Bill of Lading"
            endpoint="bill-of-lading"
            photo={bolPhoto}
            onPhotoTaken={setBolPhoto}
            onDataExtracted={handleBolData}
          />

          <CustomerDeliverySection
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            customerPhone={customerPhone}
            onCustomerPhoneChange={setCustomerPhone}
            deliveryAddress={deliveryAddress}
            onDeliveryAddressChange={setDeliveryAddress}
          />
        </View>

        {/* Section 4: Accessorials (Collapsible) */}
        <AccessorialsSection
          accessorials={accessorials}
          onAccessorialChange={handleAccessorialChange}
        />

        {/* Section 5: Summary */}
        <ContractSummaryCard
          linehaulTotal={linehaulTotal}
          accessorialsTotal={accessorialsTotal}
          totalRevenue={totalRevenue}
          balanceDue={balanceDueNum}
          amountCompanyOwes={amountCompanyOwes}
        />

        {/* Document Photos */}
        <View style={styles.documentsSection}>
          <Text style={styles.documentsTitle}>Document Photos</Text>
          <View style={styles.documentThumbnails}>
            <View style={styles.documentItem}>
              <Text style={styles.documentLabel}>Loading Report</Text>
              {loadingReportPhoto ? (
                <Image source={{ uri: loadingReportPhoto }} style={styles.documentThumb} />
              ) : (
                <View style={styles.documentPlaceholder}>
                  <Text style={styles.documentPlaceholderText}>Not captured</Text>
                </View>
              )}
            </View>
            <View style={styles.documentItem}>
              <Text style={styles.documentLabel}>Bill of Lading</Text>
              {bolPhoto ? (
                <Image source={{ uri: bolPhoto }} style={styles.documentThumb} />
              ) : (
                <View style={styles.documentPlaceholder}>
                  <Text style={styles.documentPlaceholderText}>Not captured</Text>
                </View>
              )}
            </View>
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
              ? 'Saving...'
              : uploading
              ? `Uploading... ${progress}%`
              : 'Save & Continue'}
          </Text>
        </TouchableOpacity>

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
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoRowHighlight: {
    borderTopWidth: 1,
    borderTopColor: '#3a3a4e',
    marginTop: 8,
    paddingTop: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  infoValueLarge: {
    fontSize: 20,
    color: '#10b981',
    fontWeight: '700',
  },
  documentsSection: {
    marginBottom: 24,
  },
  documentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  documentThumbnails: {
    flexDirection: 'row',
    gap: 16,
  },
  documentItem: {
    flex: 1,
  },
  documentLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  documentThumb: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    backgroundColor: '#2a2a3e',
  },
  documentPlaceholder: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    backgroundColor: '#2a2a3e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentPlaceholderText: {
    fontSize: 12,
    color: '#666',
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
  bottomSpacer: {
    height: 40,
  },
});
