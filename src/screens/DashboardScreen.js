import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import VitalCard from '../components/VitalCard';
import ReadinessGauge from '../components/ReadinessGauge';
import Card from '../components/Card';
import GradientButton from '../components/GradientButton';
import QuestCard from '../components/QuestCard';
import useStore from '../store/useStore';
import { startVitalsScan } from '../services/presageService';
import { getTodaysQuests } from '../utils/quests';
import { calculateReadiness } from '../utils/readinessEngine';
import { generateFitnessPlan } from '../services/geminiService';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

export default function DashboardScreen({ navigation }) {
  const {
    user, vitals, setVitals, readiness, setReadiness,
    fitnessPlan, setFitnessPlan, isGeneratingPlan, setIsGeneratingPlan,
    xp, streak, completedQuests, completeQuest,
  } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    try {
      const data = await startVitalsScan();
      setVitals(data);
      const r = calculateReadiness(data, user);
      setReadiness(r);
    } catch (e) {
      console.error(e);
    }
    setScanning(false);
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const plan = await generateFitnessPlan(user, vitals, readiness);
      setFitnessPlan(plan);
    } catch (e) {
      console.error(e);
    }
    setIsGeneratingPlan(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await handleScan();
    setRefreshing(false);
  };

  const todayWorkout = fitnessPlan?.workout_plan?.[0];
  const todayMeals = fitnessPlan?.diet_plan?.daily_meals;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey, {user?.name || 'Athlete'}</Text>
            <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={18} color={COLORS.warning} />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
        </View>

        {/* XP Bar */}
        <Card style={styles.xpCard}>
          <View style={styles.xpRow}>
            <Ionicons name="star" size={18} color={COLORS.primary} />
            <Text style={styles.xpText}>{xp} XP</Text>
            <Text style={styles.xpLevel}>Level {Math.floor(xp / 500) + 1}</Text>
          </View>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${(xp % 500) / 5}%` }]} />
          </View>
        </Card>

        {/* Vitals */}
        <Text style={styles.sectionTitle}>Live Vitals</Text>
        {vitals ? (
          <View style={styles.vitalsRow}>
            <VitalCard icon="heart" label="Heart Rate" value={vitals.heart_rate} unit="bpm" color={COLORS.heartRate} />
            <View style={{ width: SPACING.sm }} />
            <VitalCard icon="water" label="Breathing" value={vitals.breathing_rate} unit="/min" color={COLORS.breathing} />
          </View>
        ) : (
          <Card>
            <Text style={styles.emptyText}>No vitals data yet. Run a scan to start.</Text>
          </Card>
        )}

        <GradientButton
          title={scanning ? 'Scanning...' : 'Scan Vitals'}
          onPress={handleScan}
          loading={scanning}
          style={{ marginTop: SPACING.md }}
          variant={vitals ? 'secondary' : 'primary'}
        />

        {/* Readiness */}
        {readiness && (
          <View style={{ marginTop: SPACING.lg }}>
            <ReadinessGauge
              score={readiness.readiness_score}
              recommendation={readiness.recommendation}
              details={readiness.details}
            />
          </View>
        )}

        {/* Generate Plan */}
        {readiness && !fitnessPlan && (
          <GradientButton
            title="Generate AI Plan"
            onPress={handleGeneratePlan}
            loading={isGeneratingPlan}
            style={{ marginTop: SPACING.lg }}
          />
        )}

        {/* Today's Workout */}
        {todayWorkout && (
          <View style={{ marginTop: SPACING.lg }}>
            <Text style={styles.sectionTitle}>Today's Workout</Text>
            <TouchableOpacity onPress={() => navigation.navigate('WorkoutTab')}>
              <Card>
                <Text style={styles.workoutFocus}>{todayWorkout.focus}</Text>
                <Text style={styles.workoutMeta}>
                  {todayWorkout.exercises?.length} exercises ~ {todayWorkout.duration_minutes} min
                </Text>
                {todayWorkout.exercises?.slice(0, 3).map((ex, i) => (
                  <View key={i} style={styles.exerciseRow}>
                    <Text style={styles.exerciseName} numberOfLines={1}>{ex.name}</Text>
                    <Text style={styles.exerciseSets} numberOfLines={1}>{ex.sets}x{ex.reps}</Text>
                  </View>
                ))}
                {todayWorkout.exercises?.length > 3 && (
                  <Text style={styles.moreText}>+{todayWorkout.exercises.length - 3} more exercises</Text>
                )}
              </Card>
            </TouchableOpacity>
          </View>
        )}

        {/* Today's Meals */}
        {todayMeals && (
          <View style={{ marginTop: SPACING.lg }}>
            <Text style={styles.sectionTitle}>Today's Meals</Text>
            <TouchableOpacity onPress={() => navigation.navigate('DietTab')}>
              <Card>
                {todayMeals.map((meal, i) => (
                  <View key={i} style={styles.mealRow}>
                    <Text style={styles.mealType}>{meal.meal}</Text>
                    <Text style={styles.mealName} numberOfLines={2}>{meal.primary?.name}</Text>
                    <Text style={styles.mealCal}>{meal.primary?.calories} cal</Text>
                  </View>
                ))}
                <View style={styles.macroRow}>
                  <Text style={styles.macroText}>Total: {fitnessPlan.calories} cal</Text>
                  <Text style={styles.macroText}>Water: {fitnessPlan.hydration_liters}L</Text>
                </View>
              </Card>
            </TouchableOpacity>
          </View>
        )}

        {/* Daily Quests */}
        <View style={{ marginTop: SPACING.lg }}>
          <Text style={styles.sectionTitle}>Daily Quests</Text>
          {getTodaysQuests().map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              completed={completedQuests.includes(quest.id)}
              onComplete={() => completeQuest(quest.id)}
            />
          ))}
        </View>

        {/* Tips */}
        {fitnessPlan?.tips?.length > 0 && (
          <View style={{ marginTop: SPACING.lg, marginBottom: SPACING.xl }}>
            <Text style={styles.sectionTitle}>AI Tips</Text>
            <Card>
              {fitnessPlan.tips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Ionicons name="bulb" size={16} color={COLORS.warning} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { ...FONTS.h2 },
  date: { ...FONTS.bodySmall, marginTop: 2 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.warning + '20', paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full,
  },
  streakText: { ...FONTS.body, fontWeight: '700', color: COLORS.warning },
  xpCard: { marginTop: SPACING.md },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  xpText: { ...FONTS.body, fontWeight: '700' },
  xpLevel: { ...FONTS.caption, marginLeft: 'auto' },
  xpBarBg: { height: 6, backgroundColor: COLORS.surfaceLight, borderRadius: 3, marginTop: SPACING.sm, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  sectionTitle: { ...FONTS.h3, marginBottom: SPACING.sm },
  vitalsRow: { flexDirection: 'row' },
  emptyText: { ...FONTS.bodySmall, textAlign: 'center', paddingVertical: SPACING.lg },
  workoutFocus: { ...FONTS.h3, color: COLORS.primary },
  workoutMeta: { ...FONTS.caption, marginTop: 2, marginBottom: SPACING.md },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.xs, gap: SPACING.sm },
  exerciseName: { ...FONTS.body, flex: 1, flexShrink: 1 },
  exerciseSets: { ...FONTS.bodySmall, flexShrink: 0 },
  moreText: { ...FONTS.caption, color: COLORS.primary, marginTop: SPACING.xs },
  mealRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  mealType: { ...FONTS.caption, width: 70, flexShrink: 0 },
  mealName: { ...FONTS.body, flex: 1, marginHorizontal: SPACING.sm },
  mealCal: { ...FONTS.bodySmall, flexShrink: 0 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.md },
  macroText: { ...FONTS.bodySmall, fontWeight: '600' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  tipText: { ...FONTS.bodySmall, flex: 1 },
});
