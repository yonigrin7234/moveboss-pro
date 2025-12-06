/**
 * WorkflowActionCard Component
 *
 * Displays the appropriate action card based on load status.
 * Handles the entire load lifecycle: pending → accepted → loading → loaded → in_transit → delivered
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useLoadActions } from '../../hooks/useLoadActions';
import { useImageUpload } from '../../hooks/useImageUpload';
import { useToast } from '../ui';
import { LoadStatus } from '../../types';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';

interface WorkflowActionCardProps {
  loadId: string;
  tripId: string;
  loadStatus: LoadStatus;
  loadSource: 'own_customer' | 'partner' | 'marketplace' | null;
  postingType: 'pickup' | 'load' | 'live_load' | null;
  pickupCompletedAt: string | null;
  actions: ReturnType<typeof useLoadActions>;
  balanceDue: number | null;
  company?: { name: string; phone: string | null; trust_level?: 'trusted' | 'cod_required' } | null;
  deliveryOrder: number | null;
  loadUpdatedAt: string;
}

// Trust Level Badge
function TrustLevelBadge({ trustLevel }: { trustLevel: 'trusted' | 'cod_required' }) {
  const isTrusted = trustLevel === 'trusted';
  return (
    <View style={[
      styles.trustBadge,
      isTrusted ? styles.trustBadgeTrusted : styles.trustBadgeCod
    ]}>
      <Text style={styles.trustBadgeText}>
        {isTrusted ? '✓ Trusted Company' : '⚠ Verify Before Unload'}
      </Text>
    </View>
  );
}

export function WorkflowActionCard({
  loadId,
  tripId,
  loadStatus,
  loadSource,
  postingType,
  pickupCompletedAt,
  actions,
  balanceDue,
  company,
  deliveryOrder,
  loadUpdatedAt,
}: WorkflowActionCardProps) {
  const router = useRouter();
  const toast = useToast();
  const trustLevel = company?.trust_level || 'cod_required';
  const [cuftInput, setCuftInput] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { uploading, progress, uploadLoadPhoto } = useImageUpload();

  // Delivery order check state
  const [deliveryOrderCheck, setDeliveryOrderCheck] = useState<{
    allowed: boolean;
    reason?: string;
    checking: boolean;
  }>({ allowed: true, checking: true, reason: undefined });

  // Check delivery order when status is 'loaded' or when load/trip is updated
  useEffect(() => {
    if (loadStatus === 'loaded') {
      setDeliveryOrderCheck(prev => ({ ...prev, checking: true }));
      actions.checkDeliveryOrder().then(result => {
        setDeliveryOrderCheck({
          allowed: result.allowed,
          reason: result.reason,
          checking: false,
        });
      });
    } else {
      setDeliveryOrderCheck({ allowed: true, checking: false, reason: undefined });
    }
  }, [loadStatus, loadUpdatedAt]);

  // Check if this load requires pickup completion (pickup from customer's home)
  const requiresPickupCompletion = postingType === 'pickup' && !pickupCompletedAt;

  // Check if this load requires contract details entry after loading
  const requiresContractDetails = (loadSource === 'partner' || loadSource === 'marketplace') && !requiresPickupCompletion;

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast.warning('Camera permission needed');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleActionWithPhoto = async (
    action: (photoUrl?: string) => Promise<{ success: boolean; error?: string }>,
    photoType: 'loading-start' | 'loading-end' | 'delivery' | 'document'
  ) => {
    setSubmitting(true);
    try {
      let photoUrl: string | undefined;

      if (photo) {
        const uploadResult = await uploadLoadPhoto(photo, loadId, photoType);
        if (!uploadResult.success) {
          toast.error(uploadResult.error || 'Failed to upload photo');
          return;
        }
        photoUrl = uploadResult.url;
      }

      const result = await action(photoUrl);
      if (!result.success) {
        toast.error(result.error || 'Action failed');
      } else {
        setPhoto(null);
        setCuftInput('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (action: () => Promise<{ success: boolean; error?: string }>) => {
    const result = await action();
    if (!result.success) {
      toast.error(result.error || 'Action failed');
    }
  };

  const isLoading = actions.loading || submitting || uploading;
  const buttonText = uploading ? `Uploading... ${progress}%` : submitting ? 'Saving...' : null;

  // Pending → Accept
  if (loadStatus === 'pending') {
    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Accept Load</Text>
        <Text style={styles.actionDescription}>
          Review the load details and accept when ready
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, actions.loading && styles.buttonDisabled]}
          onPress={() => handleAction(actions.acceptLoad)}
          disabled={actions.loading}
        >
          <Text style={styles.primaryButtonText}>
            {actions.loading ? 'Accepting...' : 'Accept Load'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Accepted → Start Loading
  if (loadStatus === 'accepted') {
    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Start Loading</Text>
        <Text style={styles.actionDescription}>
          Enter starting CUFT and take a photo (optional)
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Starting CUFT"
          placeholderTextColor={colors.textMuted}
          value={cuftInput}
          onChangeText={setCuftInput}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.photoButton} onPress={takePhoto} disabled={isLoading}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photoPreview} />
          ) : (
            <Text style={styles.photoButtonText}>Take Photo</Text>
          )}
        </TouchableOpacity>
        {photo && (
          <TouchableOpacity onPress={() => setPhoto(null)} disabled={isLoading}>
            <Text style={styles.removePhotoText}>Remove Photo</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={() => handleActionWithPhoto(
            (url) => actions.startLoading(cuftInput ? parseFloat(cuftInput) : undefined, url),
            'loading-start'
          )}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>
            {buttonText || 'Start Loading'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading → Finish Loading
  if (loadStatus === 'loading') {
    const handleFinishLoading = async () => {
      setSubmitting(true);
      try {
        let photoUrl: string | undefined;

        if (photo) {
          const uploadResult = await uploadLoadPhoto(photo, loadId, 'loading-end');
          if (!uploadResult.success) {
            toast.error(uploadResult.error || 'Failed to upload photo');
            return;
          }
          photoUrl = uploadResult.url;
        }

        const result = await actions.finishLoading(cuftInput ? parseFloat(cuftInput) : undefined, photoUrl);
        if (!result.success) {
          toast.error(result.error || 'Action failed');
          return;
        }

        setPhoto(null);
        setCuftInput('');
        toast.success('Loading complete');

        // Auto-navigate based on load type
        if (requiresPickupCompletion) {
          router.push(`/trips/${tripId}/loads/${loadId}/pickup-completion`);
        } else if (requiresContractDetails) {
          router.push(`/trips/${tripId}/loads/${loadId}/contract-details`);
        }
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Finish Loading</Text>
        <Text style={styles.actionDescription}>
          Enter ending CUFT and take a photo (optional)
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ending CUFT"
          placeholderTextColor={colors.textMuted}
          value={cuftInput}
          onChangeText={setCuftInput}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.photoButton} onPress={takePhoto} disabled={isLoading}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photoPreview} />
          ) : (
            <Text style={styles.photoButtonText}>Take Photo</Text>
          )}
        </TouchableOpacity>
        {photo && (
          <TouchableOpacity onPress={() => setPhoto(null)} disabled={isLoading}>
            <Text style={styles.removePhotoText}>Remove Photo</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleFinishLoading}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>
            {buttonText || 'Finish Loading'}
          </Text>
        </TouchableOpacity>
        {requiresPickupCompletion && (
          <Text style={styles.contractDetailsHint}>
            You'll complete pickup details next
          </Text>
        )}
        {requiresContractDetails && !requiresPickupCompletion && (
          <Text style={styles.contractDetailsHint}>
            You'll enter contract details next
          </Text>
        )}
      </View>
    );
  }

  // Loaded → Start Delivery (collect payment first if balance due)
  if (loadStatus === 'loaded') {
    const effectiveBalanceDue = balanceDue || 0;
    const hasBalanceDue = effectiveBalanceDue > 0;

    const deliveryOrderBadge = deliveryOrder ? (
      <View style={styles.deliveryOrderBadge}>
        <Text style={styles.deliveryOrderBadgeText}>Delivery #{deliveryOrder}</Text>
      </View>
    ) : null;

    if (deliveryOrderCheck.checking) {
      return (
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Checking delivery order...</Text>
          {deliveryOrderBadge}
        </View>
      );
    }

    if (!deliveryOrderCheck.allowed) {
      return (
        <View style={[styles.actionCard, styles.blockedCard]}>
          <View style={styles.blockedHeader}>
            <Text style={styles.blockedIcon}>🔒</Text>
            <Text style={styles.blockedTitle}>Delivery Locked</Text>
          </View>
          {deliveryOrderBadge}
          <Text style={styles.blockedReason}>{deliveryOrderCheck.reason}</Text>
          <Text style={styles.blockedHint}>
            Loads must be delivered in order. Complete the earlier delivery first.
          </Text>
        </View>
      );
    }

    if (hasBalanceDue) {
      return (
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Collect Payment & Start Delivery</Text>
          {deliveryOrderBadge}
          <TrustLevelBadge trustLevel={trustLevel} />
          <Text style={styles.actionDescription}>
            Balance due: ${effectiveBalanceDue.toFixed(2)}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push(`/trips/${tripId}/loads/${loadId}/collect-payment`)}
          >
            <Text style={styles.primaryButtonText}>
              Collect Payment
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    const handleStartDelivery = async () => {
      if (trustLevel === 'cod_required') {
        toast.warning(`Verify ${company?.name || 'company'} has settled before unloading`);
      }
      await handleAction(() => actions.startDelivery());
    };

    return (
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Start Delivery</Text>
        {deliveryOrderBadge}
        <TrustLevelBadge trustLevel={trustLevel} />
        <Text style={styles.actionDescription}>
          No payment to collect - ready to deliver
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, actions.loading && styles.buttonDisabled]}
          onPress={handleStartDelivery}
          disabled={actions.loading}
        >
          <Text style={styles.primaryButtonText}>
            {actions.loading ? 'Starting...' : 'Start Delivery'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // In Transit → Navigate to full-screen delivery completion
  if (loadStatus === 'in_transit') {
    return (
      <View style={styles.deliveryActionCard}>
        <Text style={styles.deliveryEmoji}>📦</Text>
        <Text style={styles.deliveryActionTitle}>Ready to Deliver?</Text>
        <Text style={styles.deliveryActionDescription}>
          Confirm when the delivery is complete
        </Text>
        <TouchableOpacity
          style={styles.completeDeliveryButton}
          onPress={() => router.push(`/trips/${tripId}/loads/${loadId}/complete-delivery`)}
        >
          <Text style={styles.completeDeliveryButtonText}>Complete Delivery ✓</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Delivered
  if (loadStatus === 'delivered') {
    return (
      <View style={[styles.actionCard, styles.completedCard]}>
        <Text style={styles.completedTitle}>Delivered</Text>
        <Text style={styles.completedDescription}>
          This load has been completed
        </Text>
      </View>
    );
  }

  // Storage completed
  if (loadStatus === 'storage_completed') {
    return (
      <View style={[styles.actionCard, styles.completedCard]}>
        <Text style={styles.completedTitle}>In Storage</Text>
        <Text style={styles.completedDescription}>
          This load is in storage
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  actionCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.lg,
  },
  actionTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  actionDescription: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.sm,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    minHeight: 44,
  },
  photoButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.sm,
    padding: spacing.cardPadding,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    minHeight: 80,
  },
  photoButtonText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  photoPreview: {
    width: '100%',
    height: 120,
    borderRadius: radius.sm,
  },
  removePhotoText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    padding: spacing.cardPadding,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.primary,
  },
  contractDetailsHint: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: spacing.itemGap,
    fontStyle: 'italic',
  },
  // Trust Badge
  trustBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.itemGap,
    paddingVertical: spacing.xs,
    borderRadius: radius.card,
    marginBottom: spacing.itemGap,
  },
  trustBadgeTrusted: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
  },
  trustBadgeCod: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
  },
  trustBadgeText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  // Delivery Order Badge
  deliveryOrderBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  deliveryOrderBadgeText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  // Blocked Card
  blockedCard: {
    backgroundColor: colors.borderLight,
  },
  blockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  blockedIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  blockedTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  blockedReason: {
    ...typography.body,
    color: colors.warning,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  blockedHint: {
    ...typography.label,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
  // Completed Card
  completedCard: {
    backgroundColor: colors.success,
  },
  completedTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  completedDescription: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  // Delivery Action Card
  deliveryActionCard: {
    backgroundColor: colors.success,
    borderRadius: radius.card,
    padding: spacing.sectionGap,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  deliveryEmoji: {
    fontSize: 48,
    marginBottom: spacing.itemGap,
  },
  deliveryActionTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  deliveryActionDescription: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.sectionGap,
    textAlign: 'center',
  },
  completeDeliveryButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.cardPadding,
    paddingHorizontal: 32,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    ...shadows.md,
  },
  completeDeliveryButtonText: {
    ...typography.headline,
    color: colors.success,
  },
});

export default WorkflowActionCard;
