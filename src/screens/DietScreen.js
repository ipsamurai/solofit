import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import useStore from '../store/useStore';
import { generateMealSwap } from '../services/geminiService';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

function MacroBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <View style={styles.macroItem}>
      <View style={styles.macroLabelRow}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>{value}g</Text>
      </View>
      <View style={styles.macroBarBg}>
        <View style={[styles.macroBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function DietScreen() {
  const { fitnessPlan, setFitnessPlan, user } = useStore();
  const [swapping, setSwapping] = useState(null);

  const dietPlan = fitnessPlan?.diet_plan;
  const meals = dietPlan?.daily_meals;

  const handleSwap = async (mealIndex, optionIndex) => {
    const meal = meals[mealIndex];
    const current = optionIndex === -1 ? meal.primary : meal.alternatives[optionIndex];

    setSwapping(`${mealIndex}-${optionIndex}`);
    try {
      const newMeal = await generateMealSwap(current, user);

      const updatedPlan = { ...fitnessPlan };
      const updatedMeals = [...updatedPlan.diet_plan.daily_meals];
      if (optionIndex === -1) {
        updatedMeals[mealIndex] = { ...updatedMeals[mealIndex], primary: newMeal };
      } else {
        const alts = [...updatedMeals[mealIndex].alternatives];
        alts[optionIndex] = newMeal;
        updatedMeals[mealIndex] = { ...updatedMeals[mealIndex], alternatives: alts };
      }
      updatedPlan.diet_plan = { ...updatedPlan.diet_plan, daily_meals: updatedMeals };
      setFitnessPlan(updatedPlan);
    } catch (e) {
      Alert.alert('Swap Failed', e.message);
    }
    setSwapping(null);
  };

  if (!dietPlan) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Ionicons name="restaurant-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Diet Plan</Text>
          <Text style={styles.emptyText}>
            Generate an AI plan from the Dashboard first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const macros = fitnessPlan?.macros;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Diet Plan</Text>

        {/* Daily summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{fitnessPlan?.calories}</Text>
              <Text style={styles.summaryLabel}>Calories</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{fitnessPlan?.hydration_liters}L</Text>
              <Text style={styles.summaryLabel}>Water</Text>
            </View>
          </View>
          {macros && (
            <View style={styles.macros}>
              <MacroBar label="Protein" value={macros.protein} total={macros.protein + macros.carbs + macros.fat} color={COLORS.primary} />
              <MacroBar label="Carbs" value={macros.carbs} total={macros.protein + macros.carbs + macros.fat} color={COLORS.accent} />
              <MacroBar label="Fat" value={macros.fat} total={macros.protein + macros.carbs + macros.fat} color={COLORS.warning} />
            </View>
          )}
        </Card>

        {/* Meals */}
        {meals?.map((meal, mi) => (
          <Card key={mi} style={styles.mealCard}>
            <Text style={styles.mealType}>{meal.meal}</Text>

            {/* Primary */}
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionName}>{meal.primary?.name}</Text>
                <Text style={styles.optionCal}>{meal.primary?.calories} cal | P:{meal.primary?.protein}g C:{meal.primary?.carbs}g F:{meal.primary?.fat}g</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleSwap(mi, -1)}
                disabled={swapping === `${mi}--1`}
                style={styles.swapBtn}
              >
                <Ionicons name="swap-horizontal" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Alternatives */}
            {meal.alternatives?.map((alt, ai) => (
              <View key={ai} style={styles.altRow}>
                <View style={styles.optionInfo}>
                  <Text style={styles.altLabel}>Alternative {ai + 1}</Text>
                  <Text style={styles.altName}>{alt.name}</Text>
                  <Text style={styles.optionCal}>{alt.calories} cal | P:{alt.protein}g C:{alt.carbs}g F:{alt.fat}g</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleSwap(mi, ai)}
                  disabled={swapping === `${mi}-${ai}`}
                  style={styles.swapBtn}
                >
                  <Ionicons name="swap-horizontal" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 100 },
  title: { ...FONTS.h1, marginBottom: SPACING.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  emptyTitle: { ...FONTS.h2, marginTop: SPACING.lg },
  emptyText: { ...FONTS.bodySmall, textAlign: 'center', marginTop: SPACING.sm },
  summaryCard: { marginBottom: SPACING.lg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.md },
  summaryItem: { alignItems: 'center' },
  summaryValue: { ...FONTS.h2, color: COLORS.primary },
  summaryLabel: { ...FONTS.caption },
  macros: { gap: SPACING.sm },
  macroItem: {},
  macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroLabel: { ...FONTS.caption },
  macroValue: { ...FONTS.caption, fontWeight: '600' },
  macroBarBg: { height: 6, backgroundColor: COLORS.surfaceLight, borderRadius: 3, marginTop: 4, overflow: 'hidden' },
  macroBarFill: { height: '100%', borderRadius: 3 },
  mealCard: { marginBottom: SPACING.md },
  mealType: { ...FONTS.h3, color: COLORS.primary, marginBottom: SPACING.sm },
  optionRow: { flexDirection: 'row', alignItems: 'center' },
  optionInfo: { flex: 1 },
  optionName: { ...FONTS.body, fontWeight: '600' },
  optionCal: { ...FONTS.caption, marginTop: 2 },
  swapBtn: { padding: SPACING.sm },
  altRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm,
    paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  altLabel: { ...FONTS.caption, color: COLORS.textMuted },
  altName: { ...FONTS.bodySmall, fontWeight: '500' },
});
