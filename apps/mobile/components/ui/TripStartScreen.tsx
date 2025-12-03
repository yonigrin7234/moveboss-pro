/**
 * TripStartScreen - Full-screen focused trip start experience
 *
 * Features:
 * - Large odometer input with big numbers
 * - Camera button for odometer photo
 * - "Let's Go" animated button
 * - Success celebration on start
 * - Auto-navigate to first load
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
  FadeIn,
  SlideInUp,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { SuccessCelebration } from './SuccessCelebration';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TripStartScreenProps {
  tripNumber: string;
  truckUnit?: string;
  onStart: (data: { odometer: number; photoUri: string }) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
  onSuccess: () => void;
}

export function TripStartScreen({
  tripNumber,
  truckUnit,
  onStart,
  onCancel,
  onSuccess,
}: TripStartScreenProps) {
  const [odometer, setOdometer] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const buttonScale = useSharedValue(1);
  const shakeX = useSharedValue(0);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera permission needed');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setError(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const shake = useCallback(() => {
    shakeX.value = withSequence(
      withSpring(-10, { damping: 2, stiffness: 400 }),
      withSpring(10, { damping: 2, stiffness: 400 }),
      withSpring(-10, { damping: 2, stiffness: 400 }),
      withSpring(0, { damping: 2, stiffness: 400 })
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  const handleStart = useCallback(async () => {
    const odometerValue = parseFloat(odometer);

    if (!odometer || isNaN(odometerValue) || odometerValue <= 0) {
      setError('Enter odometer reading');
      shake();
      return;
    }

    if (!photoUri) {
      setError('Take odometer photo');
      shake();
      return;
    }

    setSubmitting(true);
    setError(null);

    // Button press animation
    buttonScale.value = withSequence(
      withSpring(0.95, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 200 })
    );

    try {
      const result = await onStart({ odometer: odometerValue, photoUri });

      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowSuccess(true);
      } else {
        setError(result.error || 'Failed to start trip');
        shake();
      }
    } catch (err) {
      setError('Something went wrong');
      shake();
    } finally {
      setSubmitting(false);
    }
  }, [odometer, photoUri, onStart, shake]);

  const handleSuccessComplete = useCallback(() => {
    setShowSuccess(false);
    onSuccess();
  }, [onSuccess]);

  const inputStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const isReady = odometer && photoUri && parseFloat(odometer) > 0;

  if (showSuccess) {
    return (
      <SuccessCelebration
        title="Trip Started!"
        subtitle="Let's roll"
        icon="navigation"
        onComplete={handleSuccessComplete}
        autoDismissDelay={1800}
      />
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Animated.View entering={SlideInUp.delay(150).springify()}>
            <Text style={styles.title}>Start Trip</Text>
            <Text style={styles.tripInfo}>Trip #{tripNumber}</Text>
            {truckUnit && <Text style={styles.truckInfo}>Truck: {truckUnit}</Text>}
          </Animated.View>

          {/* Odometer Input */}
          <Animated.View
            entering={SlideInUp.delay(250).springify()}
            style={[styles.inputSection, inputStyle]}
          >
            <Text style={styles.inputLabel}>STARTING ODOMETER</Text>
            <TextInput
              style={styles.odometerInput}
              value={odometer}
              onChangeText={(text) => {
                setOdometer(text);
                setError(null);
              }}
              placeholder="00000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={7}
              autoFocus
            />
            <Text style={styles.inputHint}>Enter current mileage</Text>
          </Animated.View>

          {/* Photo Section */}
          <Animated.View
            entering={SlideInUp.delay(350).springify()}
            style={styles.photoSection}
          >
            <Text style={styles.inputLabel}>ODOMETER PHOTO</Text>
            {photoUri ? (
              <TouchableOpacity style={styles.photoPreviewContainer} onPress={takePhoto}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <View style={styles.retakeOverlay}>
                  <Text style={styles.retakeText}>Tap to retake</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
                <Text style={styles.cameraIcon}>📷</Text>
                <Text style={styles.cameraText}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Error */}
          {error && (
            <Animated.View entering={FadeIn} style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}
        </View>

        {/* Start Button */}
        <Animated.View
          entering={SlideInUp.delay(450).springify()}
          style={styles.footer}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleStart}
            disabled={submitting}
          >
            <Animated.View
              style={[
                styles.startButton,
                !isReady && styles.startButtonDisabled,
                buttonAnimatedStyle,
              ]}
            >
              <Text style={styles.startButtonText}>
                {submitting ? 'Starting...' : "Let's Go!"}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 60,
    paddingBottom: spacing.lg,
  },
  cancelButton: {
    padding: spacing.sm,
  },
  cancelText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.hero,
    fontSize: 40,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  tripInfo: {
    ...typography.headline,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxs,
  },
  truckInfo: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  inputSection: {
    marginBottom: spacing.xxl,
    alignItems: 'center',
  },
  inputLabel: {
    ...typography.label,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  odometerInput: {
    fontFamily: typography.numericLarge.fontFamily,
    fontSize: 56,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 4,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    minWidth: SCREEN_WIDTH - 80,
  },
  inputHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  photoSection: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xxxl,
    minWidth: SCREEN_WIDTH - 80,
  },
  cameraIcon: {
    fontSize: 32,
  },
  cameraText: {
    ...typography.headline,
    color: colors.textSecondary,
  },
  photoPreviewContainer: {
    position: 'relative',
    borderRadius: radius.lg,
    overflow: 'hidden',
    width: SCREEN_WIDTH - 80,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: radius.lg,
  },
  retakeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.overlay,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  retakeText: {
    ...typography.caption,
    color: colors.white,
  },
  errorContainer: {
    backgroundColor: colors.errorMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 40,
    paddingTop: spacing.lg,
  },
  startButton: {
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    paddingVertical: 20,
    alignItems: 'center',
    ...shadows.glowSuccess,
  },
  startButtonDisabled: {
    backgroundColor: colors.surfaceElevated,
    ...shadows.none,
  },
  startButtonText: {
    ...typography.button,
    fontSize: 20,
    letterSpacing: 0.5,
  },
});

export default TripStartScreen;
