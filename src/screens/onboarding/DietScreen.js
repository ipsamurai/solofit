import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GradientButton from "../../components/GradientButton";
import ChipSelector from "../../components/ChipSelector";
import ProgressSteps from "../../components/ProgressSteps";
import useStore from "../../store/useStore";
import { DIET_TYPES, COMMON_ALLERGIES } from "../../constants/onboarding";
import { COLORS, FONTS, SPACING } from "../../constants/theme";

export default function DietScreen({ navigation }) {
	const { onboardingData, updateOnboarding } = useStore();
	const [dietType, setDietType] = useState(onboardingData.dietType);
	const [allergies, setAllergies] = useState(onboardingData.allergies);

	const handleNext = () => {
		updateOnboarding({ dietType, allergies });
		navigation.navigate("Health");
	};

	return (
		<SafeAreaView style={styles.safe}>
			<ProgressSteps total={5} current={2} />
			<ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
				<Text style={styles.title}>Dietary Preferences</Text>
				<Text style={styles.subtitle}>
					We'll strictly respect these in every meal plan
				</Text>

				<Text style={styles.label}>Diet Type</Text>
				<ChipSelector
					options={DIET_TYPES}
					selected={dietType}
					onToggle={setDietType}
				/>

				<Text style={styles.label}>Allergies & Restrictions</Text>
				<Text style={styles.warning}>
					These will NEVER appear in your meal plans
				</Text>
				<ChipSelector
					options={COMMON_ALLERGIES}
					selected={allergies}
					onToggle={setAllergies}
					multi
				/>

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
	title: { ...FONTS.h1, fontSize: 44, lineHeight: 44, marginTop: SPACING.lg },
	subtitle: {
		...FONTS.bodySmall,
		marginTop: SPACING.xs,
		marginBottom: SPACING.xl,
	},
	label: { ...FONTS.caption, marginTop: SPACING.xl, marginBottom: SPACING.sm },
	warning: { ...FONTS.caption, color: COLORS.danger, marginBottom: SPACING.sm },
	buttonContainer: { marginTop: SPACING.xl },
});
