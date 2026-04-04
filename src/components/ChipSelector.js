import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS, BORDER_RADIUS, SPACING } from '../constants/theme';

export default function ChipSelector({ options, selected, onToggle, multi = false }) {
  const isSelected = (id) => {
    if (multi) return selected?.includes(id);
    return selected === id;
  };

  const handlePress = (id) => {
    if (multi) {
      const current = selected || [];
      if (current.includes(id)) {
        onToggle(current.filter((i) => i !== id));
      } else {
        onToggle([...current, id]);
      }
    } else {
      onToggle(id);
    }
  };

  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const id = typeof opt === 'string' ? opt : opt.id;
        const label = typeof opt === 'string' ? opt : opt.label;
        const active = isSelected(id);

        return (
          <TouchableOpacity
            key={id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => handlePress(id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary + '30',
    borderColor: COLORS.primary,
  },
  chipText: { ...FONTS.bodySmall },
  chipTextActive: { color: COLORS.primary, fontWeight: '600' },
});
