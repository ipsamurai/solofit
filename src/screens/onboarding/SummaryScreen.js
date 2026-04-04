import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import GradientButton from "../../components/GradientButton";
import Card from "../../components/Card";
import ProgressSteps from "../../components/ProgressSteps";
import useStore from "../../store/useStore";
import { COLORS, FONTS, SPACING } from "../../constants/theme";

function SummaryRow({ icon, label, value }) {
	return (
		<View style={styles.row}>
			<Ionicons name={icon} size={18} color={COLORS.primary} />
			<Text style={styles.rowLabel}>{label}</Text>
			<Text style={styles.rowValue}>{value || "Not set"}</Text>
		</View>
	);
}

export default function SummaryScreen() {
	const { onboardingData, setHasOnboarded, setUser } = useStore();

	const handleFinish = () => {
		setUser(onboardingData);
		setHasOnboarded(true);
	};

	const d = onboardingData;

	return (
		<SafeAreaView style={styles.safe}>
			<ProgressSteps total={5} current={4} />
			<ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
				<Text style={styles.title}>Your Profile</Text>
				<Text style={styles.subtitle}>Review and confirm your details</Text>

				<Card style={styles.card}>
					<Text style={styles.sectionTitle}>Basic Info</Text>
					<SummaryRow icon="person" label="Name" value={d.name} />
					<SummaryRow icon="calendar" label="Age" value={d.age} />
					<SummaryRow
						icon="scale"
						label="Weight"
						value={d.weight ? `${d.weight} kg` : null}
					/>
					<SummaryRow
						icon="resize"
						label="Height"
						value={d.height ? `${d.height} cm` : null}
					/>
				</Card>

				<Card style={styles.card}>
					<Text style={styles.sectionTitle}>Goals & Lifestyle</Text>
					<SummaryRow icon="trophy" label="Goals" value={d.goals?.join(", ")} />
					<SummaryRow
						icon="speedometer"
						label="Activity"
						value={d.activityLevel}
					/>
				</Card>

				<Card style={styles.card}>
					<Text style={styles.sectionTitle}>Diet</Text>
					<SummaryRow icon="restaurant" label="Type" value={d.dietType} />
					<SummaryRow
						icon="warning"
						label="Allergies"
						value={d.allergies?.join(", ") || "None"}
					/>
				</Card>

				<Card style={styles.card}>
					<Text style={styles.sectionTitle}>Health & Equipment</Text>
					<SummaryRow
						icon="medkit"
						label="Issues"
						value={d.healthIssues?.join(", ") || "None"}
					/>
					<SummaryRow
						icon="barbell"
						label="Equipment"
						value={d.equipment?.join(", ") || "None"}
					/>
				</Card>

				<View style={styles.buttonContainer}>
					<GradientButton title="Start My Journey" onPress={handleFinish} />
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
	card: { marginBottom: SPACING.md },
	sectionTitle: { ...FONTS.h3, marginBottom: SPACING.md },
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: SPACING.sm,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
	},
	rowLabel: { ...FONTS.bodySmall, flex: 1, marginLeft: SPACING.sm },
	rowValue: { ...FONTS.body, flex: 1, textAlign: "right" },
	buttonContainer: { marginTop: SPACING.lg },
});
