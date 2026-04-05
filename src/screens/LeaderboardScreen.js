import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from "../constants/theme";
import {
	fetchLeaderboardRows,
	seedLeaderboardRemote,
} from "../services/mongoBackendService";

const MOCK_LEADERBOARD = [
	{ id: "u1", name: "Riya", xp: 3480, streak: 28, pr: "Deadlift 120kg" },
	{ id: "u2", name: "Arjun", xp: 3320, streak: 21, pr: "Bench 95kg" },
	{ id: "u3", name: "Mira", xp: 3150, streak: 18, pr: "5k in 23:40" },
	{ id: "u4", name: "Noah", xp: 2900, streak: 17, pr: "Squat 110kg" },
	{ id: "u5", name: "Ava", xp: 2760, streak: 16, pr: "10 pull-ups" },
	{ id: "u6", name: "Leo", xp: 2510, streak: 13, pr: "Plank 4:30" },
	{ id: "u7", name: "Sia", xp: 2350, streak: 12, pr: "Hip thrust 100kg" },
	{ id: "u8", name: "Ethan", xp: 2210, streak: 11, pr: "Row 2k in 7:35" },
];

function rankColor(rank) {
	if (rank === 1) return "#D4A017";
	if (rank === 2) return "#8C8C8C";
	if (rank === 3) return "#9C5A2E";
	return COLORS.textMuted;
}

export default function LeaderboardScreen({ navigation }) {
	const [rows, setRows] = useState(MOCK_LEADERBOARD);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;

		(async () => {
			try {
				let remoteRows = await fetchLeaderboardRows();
				if (!remoteRows.length) {
					await seedLeaderboardRemote();
					remoteRows = await fetchLeaderboardRows();
				}

				if (active && remoteRows.length) {
					setRows(remoteRows);
				}
			} catch (_) {
				// Keep mock rows if backend is unavailable.
			} finally {
				if (active) setLoading(false);
			}
		})();

		return () => {
			active = false;
		};
	}, []);

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => navigation.goBack()}
					style={styles.backBtn}
				>
					<Ionicons name="arrow-back" size={20} color={COLORS.text} />
				</TouchableOpacity>
				<Text style={styles.title}>Leaderboard</Text>
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.subtitle}>Weekly Mock Rankings</Text>
				{loading ? (
					<View style={styles.loadingWrap}>
						<ActivityIndicator size="small" color={COLORS.primary} />
						<Text style={styles.loadingText}>Loading leaderboard...</Text>
					</View>
				) : null}

				{rows.map((row, index) => {
					const rank = index + 1;
					return (
						<View key={row.id} style={styles.row}>
							<View style={styles.left}>
								<Text style={[styles.rank, { color: rankColor(rank) }]}>
									{rank}
								</Text>
								<View>
									<Text style={styles.name}>{row.name}</Text>
									<Text style={styles.pr}>{row.pr}</Text>
								</View>
							</View>
							<View style={styles.right}>
								<Text style={styles.xp}>{row.xp} XP</Text>
								<Text style={styles.streak}>{row.streak}d streak</Text>
							</View>
						</View>
					);
				})}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: COLORS.background },
	header: {
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.md,
		flexDirection: "row",
		alignItems: "center",
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
	},
	backBtn: {
		width: 34,
		height: 34,
		borderRadius: BORDER_RADIUS.sm,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.surfaceLight,
		borderWidth: 1,
		borderColor: COLORS.border,
		marginRight: SPACING.sm,
	},
	title: { ...FONTS.h2, fontSize: 38, lineHeight: 38 },
	content: { padding: SPACING.lg, paddingBottom: 100 },
	subtitle: { ...FONTS.caption, marginBottom: SPACING.md },
	loadingWrap: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		marginBottom: SPACING.sm,
	},
	loadingText: { ...FONTS.bodySmall },
	row: {
		backgroundColor: COLORS.surfaceLight,
		borderWidth: 1.5,
		borderColor: COLORS.border,
		borderTopWidth: 3,
		borderTopColor: COLORS.secondary,
		borderRadius: BORDER_RADIUS.md,
		padding: SPACING.md,
		marginBottom: SPACING.sm,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	left: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.md,
		flex: 1,
	},
	rank: { ...FONTS.h3, width: 26, textAlign: "center" },
	name: { ...FONTS.body },
	pr: { ...FONTS.bodySmall, marginTop: 2 },
	right: { alignItems: "flex-end" },
	xp: { ...FONTS.body },
	streak: { ...FONTS.caption, marginTop: 2 },
});
