import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientButton from '../../components/GradientButton';
import ChipSelector from '../../components/ChipSelector';
import ProgressSteps from '../../components/ProgressSteps';
import useStore from '../../store/useStore';
import { HEALTH_ISSUES, EQUIPMENT_OPTIONS } from '../../constants/onboarding';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

export default function HealthScreen({ navigation }) {
  const { onboardingData, updateOnboarding } = useStore();
  const [healthIssues, setHealthIssues] = useState(onboardingData.healthIssues);
  const [equipment, setEquipment] = useState(onboardingData.equipment);

  const handleNext = () => {
    updateOnboarding({ healthIssues, equipment });
    navigation.navigate('Summary');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ProgressSteps total={5} current={3} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Health & Equipment</Text>
        <Text style={styles.subtitle}>Helps us keep you safe during workouts</Text>

        <Text style={styles.label}>Health Issues / Injuries</Text>
        <Text style={styles.hint}>Select any that apply — we'll avoid risky exercises</Text>
        <ChipSelector options={HEALTH_ISSUES} selected={healthIssues} onToggle={setHealthIssues} multi />

        <Text style={styles.label}>Available Equipment</Text>
        <ChipSelector options={EQUIPMENT_OPTIONS} selected={equipment} onToggle={setEquipment} multi />

        <View style={styles.buttonContainer}>
          <GradientButton title="Continue" onPress={handleNext} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: 100 },
  title: { ...FONTS.h1, marginTop: SPACING.lg },
  subtitle: { ...FONTS.bodySmall, marginTop: SPACING.xs, marginBottom: SPACING.xl },
  label: { ...FONTS.body, fontWeight: '600', marginTop: SPACING.xl, marginBottom: SPACING.sm },
  hint: { ...FONTS.caption, marginBottom: SPACING.sm },
  buttonContainer: { marginTop: SPACING.xl },
});
