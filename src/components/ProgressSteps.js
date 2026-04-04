import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';

export default function ProgressSteps({ total, current }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.step,
            i <= current ? styles.active : styles.inactive,
            i < total - 1 && styles.gap,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', paddingHorizontal: SPACING.lg },
  step: { flex: 1, height: 4, borderRadius: 2 },
  active: { backgroundColor: COLORS.primary },
  inactive: { backgroundColor: COLORS.surfaceLight },
  gap: { marginRight: SPACING.xs },
});
