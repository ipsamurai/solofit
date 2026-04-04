import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GradientButton from "../../components/GradientButton";
import ChipSelector from "../../components/ChipSelector";
import ProgressSteps from "../../components/ProgressSteps";
import useStore from "../../store/useStore";
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from "../../constants/theme";

export default function BasicInfoScreen({ navigation }) {
	const { onboardingData, updateOnboarding } = useStore();
	const [name, setName] = useState(onboardingData.name);
	const [age, setAge] = useState(onboardingData.age);
	const [weight, setWeight] = useState(onboardingData.weight);
	const [height, setHeight] = useState(onboardingData.height);
	const [gender, setGender] = useState(onboardingData.gender);

	const canContinue = name && age && weight && height && gender;

	const handleNext = () => {
		updateOnboarding({ name, age, weight, height, gender });
		navigation.navigate("Goals");
	};

	return (
		<SafeAreaView style={styles.safe}>
			<ProgressSteps total={5} current={0} />
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				style={{ flex: 1 }}
			>
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.content}
				>
					<Text style={styles.title}>About You</Text>
					<Text style={styles.subtitle}>Let's personalize your experience</Text>

					<Text style={styles.label}>Name</Text>
					<TextInput
						style={styles.input}
						value={name}
						onChangeText={setName}
						placeholder="Your name"
						placeholderTextColor={COLORS.textMuted}
					/>

					<Text style={styles.label}>Age</Text>
					<TextInput
						style={styles.input}
						value={age}
						onChangeText={setAge}
						placeholder="25"
						placeholderTextColor={COLORS.textMuted}
						keyboardType="number-pad"
					/>

					<View style={styles.row}>
						<View style={styles.halfInput}>
							<Text style={styles.label}>Weight (kg)</Text>
							<TextInput
								style={styles.input}
								value={weight}
								onChangeText={setWeight}
								placeholder="70"
								placeholderTextColor={COLORS.textMuted}
								keyboardType="decimal-pad"
							/>
						</View>
						<View style={styles.halfInput}>
							<Text style={styles.label}>Height (cm)</Text>
							<TextInput
								style={styles.input}
								value={height}
								onChangeText={setHeight}
								placeholder="175"
								placeholderTextColor={COLORS.textMuted}
								keyboardType="decimal-pad"
							/>
						</View>
					</View>

					<Text style={styles.label}>Gender</Text>
					<ChipSelector
						options={[
							{ id: "male", label: "Male" },
							{ id: "female", label: "Female" },
							{ id: "other", label: "Other" },
						]}
						selected={gender}
						onToggle={setGender}
					/>

					<View style={styles.buttonContainer}>
						<GradientButton
							title="Continue"
							onPress={handleNext}
							disabled={!canContinue}
						/>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
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
	label: { ...FONTS.caption, marginTop: SPACING.md, marginBottom: SPACING.sm },
	input: {
		backgroundColor: COLORS.surfaceLight,
		borderRadius: BORDER_RADIUS.md,
		padding: SPACING.md,
		...FONTS.body,
		borderWidth: 1.5,
		borderColor: COLORS.border,
	},
	row: { flexDirection: "row", gap: SPACING.md },
	halfInput: { flex: 1 },
	buttonContainer: { marginTop: SPACING.xl },
});
