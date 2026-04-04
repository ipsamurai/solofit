import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

export default function QuestCard({ quest, completed, onComplete }) {
  return (
    <TouchableOpacity
      style={[styles.card, completed && styles.cardDone]}
      onPress={!completed ? onComplete : undefined}
      activeOpacity={completed ? 1 : 0.7}
    >
      <View style={[styles.iconCircle, completed && styles.iconCircleDone]}>
        <Ionicons
          name={completed ? 'checkmark' : quest.icon}
          size={20}
          color={completed ? COLORS.text : COLORS.primary}
        />
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, completed && styles.titleDone]}>{quest.title}</Text>
        <Text style={styles.description}>{quest.description}</Text>
      </View>
      <View style={styles.xpBadge}>
        <Text style={styles.xpText}>+{quest.xp} XP</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardDone: { opacity: 0.6, borderColor: COLORS.success + '40' },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  iconCircleDone: { backgroundColor: COLORS.success },
  info: { flex: 1, marginLeft: SPACING.sm },
  title: { ...FONTS.body, fontWeight: '600' },
  titleDone: { textDecorationLine: 'line-through' },
  description: { ...FONTS.caption, marginTop: 2 },
  xpBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  xpText: { ...FONTS.caption, color: COLORS.primary, fontWeight: '700' },
});
