import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GradientButton from "../../components/GradientButton";
import ChipSelector from "../../components/ChipSelector";
import ProgressSteps from "../../components/ProgressSteps";
import useStore from "../../store/useStore";
import { FITNESS_GOALS, ACTIVITY_LEVELS } from "../../constants/onboarding";
import { COLORS, FONTS, SPACING } from "../../constants/theme";

export default function GoalsScreen({ navigation }) {
	const { onboardingData, updateOnboarding } = useStore();
	const [goals, setGoals] = useState(onboardingData.goals);
	const [activityLevel, setActivityLevel] = useState(
		onboardingData.activityLevel,
	);

	const canContinue = goals.length > 0 && activityLevel;

	const handleNext = () => {
		updateOnboarding({ goals, activityLevel });
		navigation.navigate("Diet");
	};

	return (
		<SafeAreaView style={styles.safe}>
			<ProgressSteps total={5} current={1} />
			<ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
				<Text style={styles.title}>Your Goals</Text>
				<Text style={styles.subtitle}>Select all that apply</Text>

				<Text style={styles.label}>Fitness Goals</Text>
				<ChipSelector
					options={FITNESS_GOALS}
					selected={goals}
					onToggle={setGoals}
					multi
				/>

				<Text style={styles.label}>Activity Level</Text>
				{ACTIVITY_LEVELS.map((level) => (
					<TouchableOpacity
						key={level.id}
						style={[
							styles.optionCard,
							activityLevel === level.id && styles.optionCardActive,
						]}
						onPress={() => setActivityLevel(level.id)}
						activeOpacity={0.8}
					>
						<Text
							style={[
								styles.optionLabel,
								activityLevel === level.id && styles.optionLabelActive,
							]}
						>
							{level.label}
						</Text>
						<Text style={styles.optionDesc}>{level.description}</Text>
					</TouchableOpacity>
				))}

				<View style={styles.buttonContainer}>
					<GradientButton
						title="Continue"
						onPress={handleNext}
						disabled={!canContinue}
					/>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: COLORS.background },
	scroll: { flex: 1 },
	content: { padding: SPACING.lg, paddingBottom: 100 },
	title: { ...FONTS.h1, fontSize: 44, lineHeight: 44, marginTop: SPACING.lg },
	subtitle: {
		...FONTS.bodySmall,
		marginTop: SPACING.xs,
		marginBottom: SPACING.xl,
	},
	label: { ...FONTS.caption, marginTop: SPACING.xl, marginBottom: SPACING.sm },
	optionCard: {
		backgroundColor: COLORS.surfaceLight,
		borderRadius: 10,
		padding: SPACING.md,
		marginBottom: SPACING.sm,
		borderWidth: 1.5,
		borderColor: COLORS.border,
	},
	optionCardActive: {
		borderColor: COLORS.primary,
		backgroundColor: COLORS.primary + "15",
	},
	optionLabel: { ...FONTS.body },
	optionLabelActive: { color: COLORS.primary },
	optionDesc: { ...FONTS.caption, marginTop: 2 },
	buttonContainer: { marginTop: SPACING.xl },
});
