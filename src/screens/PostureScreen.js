import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Card from "../components/Card";
import GradientButton from "../components/GradientButton";
import useStore from "../store/useStore";
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from "../constants/theme";

// MediaPipe posture detection — mock implementation for demo
// In production, this would use expo-camera + MediaPipe pose landmark detection
function analyzePose() {
	// Simulated joint detection results
	const poses = [
		{
			posture: "good",
			angle: 172,
			feedback: "Great form! Keep your back straight.",
		},
		{
			posture: "fair",
			angle: 155,
			feedback: "Slight forward lean detected. Engage your core more.",
		},
		{
			posture: "poor",
			angle: 130,
			feedback: "Significant slouching. Risk of lower back strain.",
		},
	];
	return poses[Math.floor(Math.random() * poses.length)];
}

export default function PostureScreen() {
	const { vitals, readiness } = useStore();
	const [analyzing, setAnalyzing] = useState(false);
	const [result, setResult] = useState(null);

	const handleAnalyze = () => {
		setAnalyzing(true);
		setTimeout(() => {
			const pose = analyzePose();
			setResult(pose);
			setAnalyzing(false);
		}, 2000);
	};

	const getPostureColor = (posture) => {
		if (posture === "good") return COLORS.success;
		if (posture === "fair") return COLORS.warning;
		return COLORS.danger;
	};

	const showFatigueWarning =
		result?.posture === "poor" && readiness?.readiness_score < 45;

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.container}>
				<Text style={styles.title}>Posture Check</Text>
				<Text style={styles.subtitle}>
					Camera-based form analysis using pose detection
				</Text>

				{/* Camera Preview Area */}
				<View style={styles.cameraArea}>
					<View style={styles.cameraPlaceholder}>
						<Ionicons name="body" size={80} color={COLORS.textMuted} />
						<Text style={styles.cameraText}>
							{analyzing
								? "Analyzing posture..."
								: "Position yourself in frame"}
						</Text>
					</View>

					{/* Pose Overlay Visualization */}
					{result && (
						<View
							style={[
								styles.postureBadge,
								{ backgroundColor: getPostureColor(result.posture) + "20" },
							]}
						>
							<Text
								style={[
									styles.postureText,
									{ color: getPostureColor(result.posture) },
								]}
							>
								{result.posture.toUpperCase()}
							</Text>
						</View>
					)}
				</View>

				{/* Results */}
				{result && (
					<Card style={styles.resultCard}>
						<View style={styles.resultHeader}>
							<Ionicons
								name={
									result.posture === "good"
										? "checkmark-circle"
										: result.posture === "fair"
											? "alert-circle"
											: "close-circle"
								}
								size={24}
								color={getPostureColor(result.posture)}
							/>
							<Text style={styles.resultTitle}>Posture Analysis</Text>
						</View>
						<Text style={styles.feedback}>{result.feedback}</Text>
						<View style={styles.angleRow}>
							<Text style={styles.angleLabel}>Spine Angle</Text>
							<Text
								style={[
									styles.angleValue,
									{ color: getPostureColor(result.posture) },
								]}
							>
								{result.angle}°
							</Text>
						</View>
					</Card>
				)}

				{/* Fatigue + Posture Warning */}
				{showFatigueWarning && (
					<Card style={styles.warningCard}>
						<View style={styles.warningRow}>
							<Ionicons name="warning" size={22} color={COLORS.danger} />
							<View style={styles.warningContent}>
								<Text style={styles.warningTitle}>High Risk Detected</Text>
								<Text style={styles.warningText}>
									Poor posture combined with high fatigue. Consider stopping the
									exercise to prevent injury.
								</Text>
							</View>
						</View>
					</Card>
				)}

				{/* Joint Highlights */}
				{result && (
					<Card style={styles.jointsCard}>
						<Text style={styles.jointsTitle}>Tracked Joints</Text>
						<View style={styles.jointsGrid}>
							{["Shoulders", "Hips", "Knees", "Ankles", "Spine", "Neck"].map(
								(joint, i) => (
									<View key={i} style={styles.jointItem}>
										<View
											style={[
												styles.jointDot,
												{ backgroundColor: getPostureColor(result.posture) },
											]}
										/>
										<Text style={styles.jointLabel}>{joint}</Text>
									</View>
								),
							)}
						</View>
					</Card>
				)}

				<View style={styles.bottom}>
					<GradientButton
						title={analyzing ? "Analyzing..." : "Analyze Posture"}
						onPress={handleAnalyze}
						loading={analyzing}
					/>
				</View>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: COLORS.background },
	container: { flex: 1, padding: SPACING.lg },
	title: {
		...FONTS.h1,
		fontSize: 44,
		lineHeight: 44,
		color: COLORS.primaryDark,
	},
	subtitle: { ...FONTS.bodySmall, marginTop: SPACING.xs },
	cameraArea: {
		height: 250,
		backgroundColor: COLORS.surfaceLight,
		borderRadius: BORDER_RADIUS.lg,
		marginTop: SPACING.xl,
		overflow: "hidden",
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 1.5,
		borderColor: COLORS.border,
		borderTopWidth: 3,
		borderTopColor: COLORS.secondary,
	},
	cameraPlaceholder: { alignItems: "center" },
	cameraText: { ...FONTS.bodySmall, marginTop: SPACING.sm },
	postureBadge: {
		position: "absolute",
		top: SPACING.md,
		right: SPACING.md,
		paddingHorizontal: SPACING.sm,
		paddingVertical: SPACING.xs,
		borderRadius: BORDER_RADIUS.sm,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	postureText: { ...FONTS.caption },
	resultCard: { marginTop: SPACING.md },
	resultHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		marginBottom: SPACING.sm,
	},
	resultTitle: { ...FONTS.h3 },
	feedback: { ...FONTS.body, lineHeight: 22 },
	angleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: SPACING.md,
	},
	angleLabel: { ...FONTS.bodySmall },
	angleValue: { ...FONTS.h3 },
	warningCard: {
		marginTop: SPACING.sm,
		borderLeftWidth: 3,
		borderLeftColor: COLORS.danger,
	},
	warningRow: { flexDirection: "row", gap: SPACING.sm },
	warningContent: { flex: 1 },
	warningTitle: { ...FONTS.body, color: COLORS.danger },
	warningText: { ...FONTS.bodySmall, marginTop: 2 },
	jointsCard: { marginTop: SPACING.sm },
	jointsTitle: { ...FONTS.body, marginBottom: SPACING.sm },
	jointsGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
	jointItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.xs,
		width: "45%",
	},
	jointDot: { width: 8, height: 8, borderRadius: 4 },
	jointLabel: { ...FONTS.bodySmall },
	bottom: { marginTop: "auto", paddingBottom: SPACING.lg },
});
