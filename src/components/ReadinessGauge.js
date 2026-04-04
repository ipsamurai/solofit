import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, BORDER_RADIUS, SPACING } from '../constants/theme';

export default function ReadinessGauge({ score, recommendation, details }) {
  const getColor = () => {
    if (score >= 75) return COLORS.success;
    if (score >= 45) return COLORS.warning;
    return COLORS.danger;
  };

  const getLabel = () => {
    if (score >= 75) return 'Ready';
    if (score >= 45) return 'Moderate';
    return 'Fatigued';
  };

  const color = getColor();
  const barWidth = `${Math.max(score, 5)}%`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Readiness Score</Text>
        <View style={[styles.badge, { backgroundColor: color + '25' }]}>
          <Text style={[styles.badgeText, { color }]}>{getLabel()}</Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <Text style={[styles.score, { color }]}>{score}</Text>
        <Text style={styles.total}>/100</Text>
      </View>

      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: barWidth, backgroundColor: color }]} />
      </View>

      <Text style={styles.recommendation}>{recommendation?.replace('_', ' ')}</Text>
      {details && <Text style={styles.details}>{details}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...FONTS.h3 },
  badge: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: SPACING.sm },
  score: { fontSize: 48, fontWeight: '800' },
  total: { ...FONTS.textSecondary, fontSize: 20, marginLeft: 4, color: COLORS.textMuted },
  barBg: {
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.md,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: BORDER_RADIUS.full },
  recommendation: {
    ...FONTS.body,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginTop: SPACING.md,
  },
  details: { ...FONTS.bodySmall, marginTop: SPACING.xs },
});
