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
	const hasArrayValue = Array.isArray(value);
	const listValues = hasArrayValue
		? value.filter(Boolean).map((v) => String(v).replace(/_/g, " "))
		: [];
	const displayValue = hasArrayValue ? null : value || "Not set";

	return (
		<View style={styles.row}>
			<Ionicons name={icon} size={18} color={COLORS.primary} />
			<Text style={styles.rowLabel}>{label}</Text>
			<View style={styles.rowValueWrap}>
				{hasArrayValue ? (
					listValues.length > 0 ? (
						<View style={styles.valueChipWrap}>
							{listValues.map((item, idx) => (
								<View key={`${label}-${idx}`} style={styles.valueChip}>
									<Text style={styles.valueChipText}>{item}</Text>
								</View>
							))}
						</View>
					) : (
						<Text style={styles.rowValue}>None</Text>
					)
				) : (
					<Text style={styles.rowValue}>{displayValue}</Text>
				)}
			</View>
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
					<SummaryRow icon="trophy" label="Goals" value={d.goals} />
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
						value={d.allergies}
					/>
				</Card>

				<Card style={styles.card}>
					<Text style={styles.sectionTitle}>Health & Equipment</Text>
					<SummaryRow
						icon="medkit"
						label="Issues"
						value={d.healthIssues}
					/>
					<SummaryRow
						icon="barbell"
						label="Equipment"
						value={d.equipment}
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
		alignItems: "flex-start",
		paddingVertical: SPACING.sm,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
	},
	rowLabel: {
		...FONTS.bodySmall,
		width: 98,
		marginLeft: SPACING.sm,
		marginTop: 2,
	},
	rowValueWrap: {
		flex: 1,
		alignItems: "flex-end",
	},
	rowValue: {
		...FONTS.body,
		textAlign: "right",
		flexShrink: 1,
	},
	valueChipWrap: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "flex-end",
		gap: SPACING.xs,
	},
	valueChip: {
		backgroundColor: COLORS.surface,
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 999,
		paddingHorizontal: SPACING.xs + 2,
		paddingVertical: 2,
	},
	valueChipText: {
		...FONTS.caption,
		color: COLORS.textSecondary,
		textTransform: "capitalize",
	},
	buttonContainer: { marginTop: SPACING.lg },
});
