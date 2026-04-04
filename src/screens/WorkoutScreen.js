import { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Image,
	LayoutAnimation,
	Platform,
	UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Card from "../components/Card";
import ExerciseViewer3D from "../components/ExerciseViewer3D";
import useStore from "../store/useStore";
import { findExerciseGif } from "../utils/exerciseGifs";
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from "../constants/theme";

// Enable LayoutAnimation on Android
if (
	Platform.OS === "android" &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function WorkoutScreen() {
	const { fitnessPlan, readiness, addXP } = useStore();
	const [selectedDay, setSelectedDay] = useState(0);
	const [completedExercises, setCompletedExercises] = useState({});
	const [expandedGifs, setExpandedGifs] = useState(new Set());

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

	const toggleGif = (key) => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setExpandedGifs((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
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
					<View
						style={[
							styles.readinessBanner,
							{
								backgroundColor:
									readiness.readiness_score >= 75
										? COLORS.success + "20"
										: readiness.readiness_score >= 45
											? COLORS.warning + "20"
											: COLORS.danger + "20",
							},
						]}
					>
						<Text style={styles.readinessText}>
							Readiness: {readiness.readiness_score}/100 —{" "}
							{readiness.recommendation}
						</Text>
					</View>
				)}

				{/* Day Selector */}
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={styles.dayScroll}
				>
					{workoutPlan.map((_, i) => (
						<TouchableOpacity
							key={i}
							style={[
								styles.dayChip,
								selectedDay === i && styles.dayChipActive,
							]}
							onPress={() => setSelectedDay(i)}
						>
							<Text
								style={[
									styles.dayChipText,
									selectedDay === i && styles.dayChipTextActive,
								]}
							>
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
							<Text style={styles.focusMeta}>
								{todayWorkout.duration_minutes} minutes
							</Text>
						</Card>

						{todayWorkout.exercises?.map((ex, i) => {
							const key = `${selectedDay}-${i}`;
							const done = completedExercises[key];
							const gifOpen = expandedGifs.has(key);
							const gifResult = findExerciseGif(ex.name, todayWorkout.focus);

							return (
								<Card
									key={i}
									style={[styles.exerciseCard, done && styles.exerciseCardDone]}
								>
									{/* Tap row to mark complete */}
									<TouchableOpacity
										onPress={() => toggleExercise(selectedDay, i)}
										activeOpacity={0.7}
									>
										<View style={styles.exerciseHeader}>
											<View
												style={[styles.checkbox, done && styles.checkboxDone]}
											>
												{done && (
													<Ionicons
														name="checkmark"
														size={14}
														color={COLORS.text}
													/>
												)}
											</View>
											<Text
												style={[
													styles.exerciseName,
													done && styles.exerciseNameDone,
												]}
											>
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
									</TouchableOpacity>

									{/* How-to GIF dropdown — only shown when a match exists */}
									{gifResult && (
										<>
											<TouchableOpacity
												style={styles.gifToggle}
												onPress={() => toggleGif(key)}
												activeOpacity={0.75}
											>
												<Ionicons
													name="play-circle-outline"
													size={15}
													color={COLORS.primary}
												/>
												<Text style={styles.gifToggleText}>How to perform</Text>
												<Ionicons
													name={gifOpen ? "chevron-up" : "chevron-down"}
													size={15}
													color={COLORS.textSecondary}
													style={{ marginLeft: "auto" }}
												/>
											</TouchableOpacity>

											{gifOpen && (
												<View style={styles.gifContainer}>
													<Image
														source={gifResult.source}
														style={styles.gifImage}
														resizeMode="contain"
													/>
													<Text style={styles.gifCaption}>
														{gifResult.matchedName}
													</Text>
												</View>
											)}
										</>
									)}
								</Card>
							);
						})}
					</>
				)}

				{/* 3D Exercise Viewer */}
				<View style={{ marginTop: SPACING.lg }}>
					<ExerciseViewer3D
						exercise={todayWorkout?.focus}
						highlightJoints={["l_knee", "r_knee", "l_hip", "r_hip"]}
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
							<Text key={i} style={styles.riskText}>
								• {note}
							</Text>
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
	title: {
		...FONTS.h1,
		fontSize: 44,
		lineHeight: 44,
		marginBottom: SPACING.md,
	},
	empty: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: SPACING.xl,
	},
	emptyTitle: { ...FONTS.h2, marginTop: SPACING.lg },
	emptyText: { ...FONTS.bodySmall, textAlign: "center", marginTop: SPACING.sm },
	readinessBanner: {
		padding: SPACING.sm,
		borderRadius: BORDER_RADIUS.md,
		marginBottom: SPACING.md,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	readinessText: { ...FONTS.bodySmall, textAlign: "center" },
	dayScroll: { marginBottom: SPACING.md },
	dayChip: {
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.sm,
		backgroundColor: COLORS.surfaceLight,
		borderRadius: BORDER_RADIUS.md,
		borderWidth: 1,
		borderColor: COLORS.border,
		marginRight: SPACING.sm,
	},
	dayChipActive: { backgroundColor: COLORS.primary },
	dayChipText: { ...FONTS.caption },
	dayChipTextActive: { color: COLORS.textDark },
	focusCard: { marginBottom: SPACING.md },
	focusTitle: { ...FONTS.h2, color: COLORS.primary },
	focusMeta: { ...FONTS.caption, marginTop: 2 },

	// Exercise card
	exerciseCard: { marginBottom: SPACING.sm },
	exerciseCardDone: { opacity: 0.55 },
	exerciseHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
	},
	checkbox: {
		width: 24,
		height: 24,
		borderRadius: BORDER_RADIUS.sm,
		borderWidth: 2,
		borderColor: COLORS.textMuted,
		alignItems: "center",
		justifyContent: "center",
	},
	checkboxDone: {
		backgroundColor: COLORS.success,
		borderColor: COLORS.success,
	},
	exerciseName: { ...FONTS.body, flex: 1 },
	exerciseNameDone: { textDecorationLine: "line-through" },
	exerciseDetails: {
		flexDirection: "row",
		gap: SPACING.sm,
		marginTop: SPACING.sm,
		marginLeft: 36,
	},
	detailChip: {
		backgroundColor: COLORS.surface,
		paddingHorizontal: SPACING.sm,
		paddingVertical: 2,
		borderRadius: BORDER_RADIUS.sm,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	detailText: { ...FONTS.caption },
	notes: {
		...FONTS.caption,
		color: COLORS.textSecondary,
		marginTop: SPACING.xs,
		marginLeft: 36,
	},

	// GIF dropdown toggle row
	gifToggle: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: SPACING.sm,
		paddingTop: SPACING.sm,
		borderTopWidth: 1,
		borderTopColor: COLORS.border,
	},
	gifToggleText: {
		...FONTS.caption,
		color: COLORS.primary,
	},

	// GIF panel
	gifContainer: {
		alignItems: "center",
		paddingTop: SPACING.md,
		paddingBottom: SPACING.xs,
		gap: SPACING.xs,
	},
	gifImage: {
		width: 200,
		height: 200,
		borderRadius: BORDER_RADIUS.md,
		backgroundColor: COLORS.surfaceLight,
	},
	gifCaption: {
		...FONTS.caption,
		color: COLORS.textSecondary,
		textAlign: "center",
		textTransform: "capitalize",
	},

	// Risk notes
	riskCard: {
		marginTop: SPACING.lg,
		borderLeftWidth: 3,
		borderLeftColor: COLORS.warning,
	},
	riskHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		marginBottom: SPACING.sm,
	},
	riskTitle: { ...FONTS.body, color: COLORS.warning },
	riskText: { ...FONTS.bodySmall, marginBottom: 4 },
});
