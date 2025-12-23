/**
 * MoveBoss Logo Component
 *
 * Reusable SVG logo that matches the web app branding.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { colors } from '../../lib/theme';

interface LogoProps {
  size?: number;
  showText?: boolean;
  style?: ViewStyle;
}

/**
 * MoveBoss Logo - M icon in a rounded rectangle
 *
 * @param size - Size of the logo (default: 48)
 * @param showText - Whether to show "MoveBoss" text (future feature)
 * @param style - Additional styles for the container
 */
export function Logo({ size = 48, style }: LogoProps) {
  return (
    <View style={[styles.container, style]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
      >
        {/* Background rounded rectangle with stroke */}
        <Rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="12"
          stroke={colors.primary}
          strokeWidth="3"
          fill="#1a1a2e"
        />
        {/* M shape */}
        <Path
          d="M16 46V18L32 34L48 18V46"
          fill={colors.primary}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Logo;
