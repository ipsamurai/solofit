import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import ExerciseViewer3D from '../components/ExerciseViewer3D';
import useStore from '../store/useStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

export default function WorkoutScreen({ navigation }) {
  const { fitnessPlan, readiness, addXP } = useStore();
  const [selectedDay, setSelectedDay] = useState(0);
  const [completedExercises, setCompletedExercises] = useState({});

  const workoutPlan = fitnessPlan?.workout_plan;
  const todayWorkout = workoutPlan?.[selectedDay];

  const toggleExercise = (dayIdx, exIdx) => {
    const key = `${dayIdx}-${exIdx}`;
    setCompletedExercises((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
        addXP(10);
      }
      return next;
    });
  };

  if (!workoutPlan) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Ionicons name="barbell-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Workout Plan</Text>
          <Text style={styles.emptyText}>
            Go to Dashboard and scan your vitals, then generate an AI plan.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Workout Plan</Text>

        {readiness && (
          <View style={[styles.readinessBanner, { backgroundColor: readiness.readiness_score >= 75 ? COLORS.success + '20' : readiness.readiness_score >= 45 ? COLORS.warning + '20' : COLORS.danger + '20' }]}>
            <Text style={styles.readinessText}>
              Readiness: {readiness.readiness_score}/100 — {readiness.recommendation}
            </Text>
          </View>
        )}

        {/* Day Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
          {workoutPlan.map((day, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dayChip, selectedDay === i && styles.dayChipActive]}
              onPress={() => setSelectedDay(i)}
            >
              <Text style={[styles.dayChipText, selectedDay === i && styles.dayChipTextActive]}>
                Day {i + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Selected Day */}
        {todayWorkout && (
          <>
            <Card style={styles.focusCard}>
              <Text style={styles.focusTitle}>{todayWorkout.focus}</Text>
              <Text style={styles.focusMeta}>{todayWorkout.duration_minutes} minutes</Text>
            </Card>

            {todayWorkout.exercises?.map((ex, i) => {
              const key = `${selectedDay}-${i}`;
              const done = completedExercises[key];
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => toggleExercise(selectedDay, i)}
                  activeOpacity={0.7}
                >
                  <Card style={[styles.exerciseCard, done && styles.exerciseCardDone]}>
                    <View style={styles.exerciseHeader}>
                      <View style={[styles.checkbox, done && styles.checkboxDone]}>
                        {done && <Ionicons name="checkmark" size={14} color={COLORS.text} />}
                      </View>
                      <Text style={[styles.exerciseName, done && styles.exerciseNameDone]}>
                        {ex.name}
                      </Text>
                    </View>
                    <View style={styles.exerciseDetails}>
                      <View style={styles.detailChip}>
                        <Text style={styles.detailText}>{ex.sets} sets</Text>
                      </View>
                      <View style={styles.detailChip}>
                        <Text style={styles.detailText}>{ex.reps} reps</Text>
                      </View>
                      <View style={styles.detailChip}>
                        <Text style={styles.detailText}>{ex.rest} rest</Text>
                      </View>
                    </View>
                    {ex.notes && <Text style={styles.notes}>{ex.notes}</Text>}
                  </Card>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* 3D Exercise Viewer */}
        <View style={{ marginTop: SPACING.lg }}>
          <ExerciseViewer3D
            exercise={todayWorkout?.focus}
            highlightJoints={['l_knee', 'r_knee', 'l_hip', 'r_hip']}
          />
        </View>

        {/* Risk Notes */}
        {fitnessPlan?.risk_notes?.length > 0 && (
          <Card style={styles.riskCard}>
            <View style={styles.riskHeader}>
              <Ionicons name="warning" size={18} color={COLORS.warning} />
              <Text style={styles.riskTitle}>Safety Notes</Text>
            </View>
            {fitnessPlan.risk_notes.map((note, i) => (
              <Text key={i} style={styles.riskText}>• {note}</Text>
            ))}
          </Card>
        )}
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
  readinessBanner: { padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.md },
  readinessText: { ...FONTS.bodySmall, fontWeight: '600', textAlign: 'center' },
  dayScroll: { marginBottom: SPACING.md },
  dayChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.sm,
  },
  dayChipActive: { backgroundColor: COLORS.primary },
  dayChipText: { ...FONTS.bodySmall },
  dayChipTextActive: { color: COLORS.text, fontWeight: '700' },
  focusCard: { marginBottom: SPACING.md },
  focusTitle: { ...FONTS.h2, color: COLORS.primary },
  focusMeta: { ...FONTS.caption, marginTop: 2 },
  exerciseCard: { marginBottom: SPACING.sm },
  exerciseCardDone: { opacity: 0.6 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: COLORS.textMuted, alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  exerciseName: { ...FONTS.body, fontWeight: '600', flex: 1 },
  exerciseNameDone: { textDecorationLine: 'line-through' },
  exerciseDetails: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm, marginLeft: 36 },
  detailChip: { backgroundColor: COLORS.surfaceLight, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.sm },
  detailText: { ...FONTS.caption },
  notes: { ...FONTS.caption, color: COLORS.textSecondary, marginTop: SPACING.xs, marginLeft: 36 },
  riskCard: { marginTop: SPACING.lg, borderLeftWidth: 3, borderLeftColor: COLORS.warning },
  riskHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  riskTitle: { ...FONTS.body, fontWeight: '600', color: COLORS.warning },
  riskText: { ...FONTS.bodySmall, marginBottom: 4 },
});
