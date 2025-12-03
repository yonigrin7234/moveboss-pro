import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { useLoadDetail } from '../../../../../../hooks/useLoadDetail';
import { useLoadActions } from '../../../../../../hooks/useLoadActions';
import { useImageUpload } from '../../../../../../hooks/useImageUpload';
import { useToast, LoadDetailSkeleton } from '../../../../../../components/ui';
import { supabase } from '../../../../../../lib/supabase';
import { DamageDocumentation } from '../../../../../../components/DamageDocumentation';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '.vercel.app') ||
  '';

export default function ContractDetailsScreen() {
  const { id: tripId, loadId } = useLocalSearchParams<{ id: string; loadId: string }>();
  const router = useRouter();
  const toast = useToast();
  const { load, loading, error, refetch } = useLoadDetail(loadId);
  const actions = useLoadActions(loadId, refetch);
  const { uploading, progress, uploadLoadPhoto } = useImageUpload();

  // Form state
  const [balanceDue, setBalanceDue] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // Accessorials state (collapsed by default)
  const [showAccessorials, setShowAccessorials] = useState(false);
  const [shuttle, setShuttle] = useState('');
  const [longCarry, setLongCarry] = useState('');
  const [stairs, setStairs] = useState('');
  const [bulky, setBulky] = useState('');
  const [packing, setPacking] = useState('');
  const [otherAccessorial, setOtherAccessorial] = useState('');
  const [accessorialNotes, setAccessorialNotes] = useState('');

  // Photo state
  const [loadingReportPhoto, setLoadingReportPhoto] = useState<string | null>(null);
  const [bolPhoto, setBolPhoto] = useState<string | null>(null);
  const [loadingReportUrl, setLoadingReportUrl] = useState<string | null>(null);
  const [bolUrl, setBolUrl] = useState<string | null>(null);

  // OCR state
  const [scanningLoadingReport, setScanningLoadingReport] = useState(false);
  const [scanningBol, setScanningBol] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // Computed values
  const actualCuft = load?.actual_cuft_loaded || 0;
  const ratePerCuft = load?.rate_per_cuft || 0;
  const linehaulTotal = actualCuft * ratePerCuft;

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

  const totalRevenue = linehaulTotal + accessorialsTotal;
  const balanceDueNum = parseFloat(balanceDue) || 0;
  const amountCompanyOwes = totalRevenue - balanceDueNum;

  const canSubmit = balanceDue.trim() !== '' && !submitting && !uploading;

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

  // Scan Loading Report
  const scanLoadingReport = async () => {
    const photoUri = await takePhoto();
    if (!photoUri) return;

    setLoadingReportPhoto(photoUri);
    setScanningLoadingReport(true);

    try {
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Read file as base64
      const base64 = await readAsStringAsync(photoUri, {
        encoding: EncodingType.Base64,
      });

      // Convert to blob
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'loading-report.jpg',
      } as unknown as Blob);

      // Call OCR API
      const response = await fetch(`${API_BASE_URL}/api/ocr/loading-report`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data) {
        if (result.data.balance_due) {
          setBalanceDue(result.data.balance_due.toString());
        }
        if (result.data.job_number) {
          setJobNumber(result.data.job_number);
        }
        toast.success('Scanned! Verify values are correct');
      } else {
        toast.warning(result.error || 'Could not extract data');
      }
    } catch (err) {
      console.error('OCR error:', err);
      toast.error('Scan failed - enter manually');
    } finally {
      setScanningLoadingReport(false);
    }
  };

  // Scan Bill of Lading
  const scanBillOfLading = async () => {
    const photoUri = await takePhoto();
    if (!photoUri) return;

    setBolPhoto(photoUri);
    setScanningBol(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('file', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'bill-of-lading.jpg',
      } as unknown as Blob);

      const response = await fetch(`${API_BASE_URL}/api/ocr/bill-of-lading`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data) {
        if (result.data.customer_name) {
          setCustomerName(result.data.customer_name);
        }
        if (result.data.customer_phone) {
          setCustomerPhone(result.data.customer_phone);
        }
        if (result.data.delivery_address) {
          setDeliveryAddress(result.data.delivery_address);
        }
        toast.success('Scanned! Verify values are correct');
      } else {
        toast.warning(result.error || 'Could not extract data');
      }
    } catch (err) {
      console.error('OCR error:', err);
      toast.error('Scan failed - enter manually');
    } finally {
      setScanningBol(false);
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
        contractJobNumber: jobNumber || null,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        deliveryAddressFull: deliveryAddress || null,
        contractLinehaulTotal: linehaulTotal,
        amountCompanyOwes,
        accessorials: {
          shuttle: parseFloat(shuttle) || 0,
          longCarry: parseFloat(longCarry) || 0,
          stairs: parseFloat(stairs) || 0,
          bulky: parseFloat(bulky) || 0,
          packing: parseFloat(packing) || 0,
          other: parseFloat(otherAccessorial) || 0,
          notes: accessorialNotes || null,
        },
        loadingReportPhotoUrl,
        contractPhotoUrl: bolPhotoUrl,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to save');
        return;
      }

      // Auto-navigate back with success toast
      toast.success('Contract saved - Ready for delivery!');
      router.back();
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleNavigate = (address: string) => {
    const encoded = encodeURIComponent(address);
    Linking.openURL(`https://maps.apple.com/?q=${encoded}`);
  };

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Contract Details' }} />
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

          <TouchableOpacity
            style={styles.scanButton}
            onPress={scanLoadingReport}
            disabled={scanningLoadingReport}
          >
            {loadingReportPhoto ? (
              <Image source={{ uri: loadingReportPhoto }} style={styles.scanPreview} />
            ) : scanningLoadingReport ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.scanButtonText}>Scan Loading Report</Text>
            )}
          </TouchableOpacity>

          {scanningLoadingReport && (
            <Text style={styles.scanningText}>Analyzing document...</Text>
          )}

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

          {/* Read-only load info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Actual CUFT</Text>
              <Text style={styles.infoValue}>{actualCuft}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rate per CUFT</Text>
              <Text style={styles.infoValue}>{formatCurrency(ratePerCuft)}</Text>
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

          <TouchableOpacity
            style={styles.scanButton}
            onPress={scanBillOfLading}
            disabled={scanningBol}
          >
            {bolPhoto ? (
              <Image source={{ uri: bolPhoto }} style={styles.scanPreview} />
            ) : scanningBol ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.scanButtonText}>Scan Bill of Lading</Text>
            )}
          </TouchableOpacity>

          {scanningBol && (
            <Text style={styles.scanningText}>Analyzing document...</Text>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Customer Name</Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
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
                onChangeText={setCustomerPhone}
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
                onChangeText={setDeliveryAddress}
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

        {/* Section 4: Accessorials (Collapsible) */}
        <TouchableOpacity
          style={styles.collapsibleHeader}
          onPress={() => setShowAccessorials(!showAccessorials)}
        >
          <View>
            <Text style={styles.sectionTitle}>Pre-Charged Accessorials</Text>
            <Text style={styles.sectionSubtitle}>Charges already on the loading report</Text>
          </View>
          <Text style={styles.collapseIcon}>{showAccessorials ? '−' : '+'}</Text>
        </TouchableOpacity>

        {showAccessorials && (
          <View style={styles.section}>
            <Text style={styles.helperText}>
              These are NOT new charges - they're already billed to customer
            </Text>

            <View style={styles.accessorialGrid}>
              <View style={styles.accessorialItem}>
                <Text style={styles.accessorialLabel}>Shuttle</Text>
                <TextInput
                  style={styles.accessorialInput}
                  value={shuttle}
                  onChangeText={setShuttle}
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.accessorialItem}>
                <Text style={styles.accessorialLabel}>Long Carry</Text>
                <TextInput
                  style={styles.accessorialInput}
                  value={longCarry}
                  onChangeText={setLongCarry}
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.accessorialItem}>
                <Text style={styles.accessorialLabel}>Stairs</Text>
                <TextInput
                  style={styles.accessorialInput}
                  value={stairs}
                  onChangeText={setStairs}
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.accessorialItem}>
                <Text style={styles.accessorialLabel}>Bulky Items</Text>
                <TextInput
                  style={styles.accessorialInput}
                  value={bulky}
                  onChangeText={setBulky}
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.accessorialItem}>
                <Text style={styles.accessorialLabel}>Packing</Text>
                <TextInput
                  style={styles.accessorialInput}
                  value={packing}
                  onChangeText={setPacking}
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.accessorialItem}>
                <Text style={styles.accessorialLabel}>Other</Text>
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
              placeholder="Notes about accessorials..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={2}
            />
          </View>
        )}

        {/* Section 5: Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Linehaul</Text>
            <Text style={styles.summaryValue}>{formatCurrency(linehaulTotal)}</Text>
          </View>
          {accessorialsTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Accessorials</Text>
              <Text style={styles.summaryValue}>{formatCurrency(accessorialsTotal)}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalRevenue)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Balance Driver Collects</Text>
            <Text style={[styles.summaryValue, styles.negativeValue]}>
              -{formatCurrency(balanceDueNum)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowHighlight]}>
            <Text style={styles.summaryLabelBold}>Amount Company Owes You</Text>
            <Text style={styles.summaryValueLarge}>
              {formatCurrency(amountCompanyOwes)}
            </Text>
          </View>
        </View>

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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  scanButton: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 80,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanPreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  scanningText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
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
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  collapseIcon: {
    fontSize: 24,
    color: '#888',
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
  summaryCard: {
    backgroundColor: '#0066CC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryRowHighlight: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    marginTop: 12,
    paddingTop: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  summaryLabelBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  summaryValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  summaryValueLarge: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '700',
  },
  negativeValue: {
    color: '#ff6b6b',
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
