import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, FONTS, BORDER_RADIUS, SPACING } from '../constants/theme';

export default function GradientButton({ title, onPress, disabled, loading, style, variant = 'primary' }) {
  const bgColor = variant === 'secondary' ? COLORS.surfaceLight : COLORS.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[styles.wrapper, style]}
    >
      <View style={[styles.button, { backgroundColor: bgColor }]}>
        {loading ? (
          <ActivityIndicator color={COLORS.text} />
        ) : (
          <Text style={[styles.text, disabled && styles.disabled]}>{title}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  button: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { ...FONTS.button },
  disabled: { opacity: 0.5 },
});
