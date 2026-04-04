import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, BORDER_RADIUS, SPACING } from '../constants/theme';

export default function VitalCard({ icon, label, value, unit, color, style }) {
  return (
    <View style={[styles.card, { borderLeftColor: color }, style]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color }]}>{value ?? '--'}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 3,
    flex: 1,
  },
  label: { ...FONTS.caption, marginTop: SPACING.xs },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: SPACING.xs },
  value: { fontSize: 28, fontWeight: '700' },
  unit: { ...FONTS.caption, marginLeft: SPACING.xs },
});
