import React from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Card from "../components/Card";
import useStore from "../store/useStore";
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from "../constants/theme";

function StatBox({ label, value, icon, color }) {
	return (
		<View style={styles.statBox}>
			<Ionicons name={icon} size={22} color={color} />
			<Text style={[styles.statValue, { color }]}>{value}</Text>
			<Text style={styles.statLabel}>{label}</Text>
		</View>
	);
}

function InfoRow({ label, value }) {
	const hasArrayValue = Array.isArray(value);
	const displayText =
		hasArrayValue ? null : value || "Not set";
	const listValues = hasArrayValue
		? value.filter(Boolean).map((v) => String(v).replace(/_/g, " "))
		: [];

	return (
		<View style={styles.infoRow}>
			<Text style={styles.infoLabel}>{label}</Text>
			<View style={styles.infoValueWrap}>
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
						<Text style={styles.infoValue}>None</Text>
					)
				) : (
					<Text style={styles.infoValue}>{displayText}</Text>
				)}
			</View>
		</View>
	);
}

export default function ProfileScreen({ navigation }) {
	const {
		user,
		xp,
		streak,
		completedQuests,
		setHasOnboarded,
		setFitnessPlan,
		setVitals,
		setReadiness,
	} = useStore();

	const handleReset = () => {
		Alert.alert(
			"Reset Profile",
			"This will clear your plan and return to onboarding. Continue?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Reset",
					style: "destructive",
					onPress: () => {
						setFitnessPlan(null);
						setVitals(null);
						setReadiness(null);
						setHasOnboarded(false);
					},
				},
			],
		);
	};

	const level = Math.floor(xp / 500) + 1;

	return (
		<SafeAreaView style={styles.safe}>
			<ScrollView contentContainerStyle={styles.content}>
				{/* Avatar & Name */}
				<View style={styles.avatarSection}>
					<View style={styles.avatar}>
						<Text style={styles.avatarText}>
							{(user?.name || "A")[0].toUpperCase()}
						</Text>
					</View>
					<Text style={styles.name}>{user?.name || "Athlete"}</Text>
					<Text style={styles.bio}>Level {level} Fitness Warrior</Text>
				</View>

				{/* Stats */}
				<View style={styles.statsRow}>
					<StatBox label="XP" value={xp} icon="star" color={COLORS.primary} />
					<StatBox
						label="Streak"
						value={streak}
						icon="flame"
						color={COLORS.warning}
					/>
					<StatBox
						label="Quests"
						value={completedQuests.length}
						icon="trophy"
						color={COLORS.accent}
					/>
				</View>

				{/* Profile Info */}
				<Card style={styles.card}>
					<Text style={styles.sectionTitle}>Personal Info</Text>
					<InfoRow label="Age" value={user?.age} />
					<InfoRow
						label="Weight"
						value={user?.weight ? `${user.weight} kg` : null}
					/>
					<InfoRow
						label="Height"
						value={user?.height ? `${user.height} cm` : null}
					/>
					<InfoRow label="Gender" value={user?.gender} />
					<InfoRow label="Activity" value={user?.activityLevel} />
				</Card>

				<Card style={styles.card}>
					<Text style={styles.sectionTitle}>Diet & Health</Text>
					<InfoRow label="Diet Type" value={user?.dietType} />
					<InfoRow
						label="Allergies"
						value={user?.allergies}
					/>
					<InfoRow
						label="Health Issues"
						value={user?.healthIssues}
					/>
					<InfoRow
						label="Equipment"
						value={user?.equipment}
					/>
				</Card>

				<Card style={styles.card}>
					<Text style={styles.sectionTitle}>Goals</Text>
					<View style={styles.goalsWrap}>
						{user?.goals?.map((g, i) => (
							<View key={i} style={styles.goalChip}>
								<Text style={styles.goalText}>{g.replace("_", " ")}</Text>
							</View>
						))}
					</View>
				</Card>

				<Card style={styles.card}>
					<Text style={styles.sectionTitle}>Community</Text>
					<View style={styles.actionsRow}>
						<TouchableOpacity
							style={styles.actionBtn}
							onPress={() => navigation.navigate("Leaderboard")}
						>
							<Ionicons
								name="podium-outline"
								size={18}
								color={COLORS.primary}
							/>
							<Text style={styles.actionText}>Leaderboard</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.actionBtn}
							onPress={() => navigation.navigate("Community")}
						>
							<Ionicons
								name="images-outline"
								size={18}
								color={COLORS.primary}
							/>
							<Text style={styles.actionText}>Share Posts</Text>
						</TouchableOpacity>
					</View>
				</Card>

				<TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
					<Ionicons name="refresh" size={18} color={COLORS.danger} />
					<Text style={styles.resetText}>Reset Profile & Re-onboard</Text>
				</TouchableOpacity>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: COLORS.background },
	content: { padding: SPACING.lg, paddingBottom: 100 },
	avatarSection: { alignItems: "center", marginBottom: SPACING.xl },
	avatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: COLORS.primary,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 2,
		borderColor: COLORS.secondary,
	},
	avatarText: {
		...FONTS.h2,
		color: COLORS.textDark,
		fontSize: 38,
		lineHeight: 38,
	},
	name: { ...FONTS.h2, marginTop: SPACING.md },
	bio: { ...FONTS.bodySmall, color: COLORS.primaryLight },
	statsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: SPACING.lg,
	},
	statBox: {
		flex: 1,
		alignItems: "center",
		backgroundColor: COLORS.surfaceLight,
		padding: SPACING.md,
		borderRadius: BORDER_RADIUS.lg,
		marginHorizontal: 4,
		borderWidth: 1.5,
		borderColor: COLORS.border,
	},
	statValue: { ...FONTS.h3, marginTop: SPACING.xs },
	statLabel: { ...FONTS.caption, marginTop: 2 },
	card: {
		marginBottom: SPACING.md,
	},
	sectionTitle: { ...FONTS.h3, marginBottom: SPACING.md, color: COLORS.primaryDark },
	infoRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		paddingVertical: SPACING.sm,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
	},
	infoLabel: { ...FONTS.bodySmall, width: 96, marginTop: 2 },
	infoValueWrap: {
		flex: 1,
		alignItems: "flex-end",
	},
	infoValue: {
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
		borderRadius: BORDER_RADIUS.md,
		paddingHorizontal: SPACING.xs + 2,
		paddingVertical: 2,
	},
	valueChipText: {
		...FONTS.caption,
		color: COLORS.textSecondary,
		textTransform: "capitalize",
	},
	goalsWrap: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
	goalChip: {
		backgroundColor: COLORS.surface,
		paddingHorizontal: SPACING.sm,
		paddingVertical: SPACING.xs,
		borderRadius: BORDER_RADIUS.md,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	goalText: {
		...FONTS.caption,
		color: COLORS.primary,
		textTransform: "capitalize",
	},
	actionsRow: { gap: SPACING.sm },
	actionBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		paddingVertical: SPACING.sm,
		paddingHorizontal: SPACING.md,
		borderRadius: BORDER_RADIUS.md,
		borderWidth: 1,
		borderColor: COLORS.border,
		backgroundColor: COLORS.surface,
	},
	actionText: { ...FONTS.bodySmall, color: COLORS.text },
	resetBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: SPACING.sm,
		marginTop: SPACING.lg,
		padding: SPACING.md,
		borderWidth: 1.5,
		borderColor: COLORS.danger,
		borderRadius: BORDER_RADIUS.md,
		backgroundColor: COLORS.surfaceLight,
	},
	resetText: { ...FONTS.body, color: COLORS.danger },
});
