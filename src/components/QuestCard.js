import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from "../constants/theme";

export default function QuestCard({ quest, completed, onComplete }) {
	return (
		<TouchableOpacity
			style={[styles.card, completed && styles.cardDone]}
			onPress={!completed ? onComplete : undefined}
			activeOpacity={completed ? 1 : 0.7}
		>
			<View style={[styles.iconCircle, completed && styles.iconCircleDone]}>
				<Ionicons
					name={completed ? "checkmark" : quest.icon}
					size={20}
					color={completed ? COLORS.text : COLORS.primary}
				/>
			</View>
			<View style={styles.info}>
				<Text style={[styles.title, completed && styles.titleDone]}>
					{quest.title}
				</Text>
				<Text style={styles.description}>{quest.description}</Text>
			</View>
			<View style={styles.xpBadge}>
				<Text style={styles.xpText}>+{quest.xp} XP</Text>
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	card: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.surfaceLight,
		borderRadius: BORDER_RADIUS.md,
		padding: SPACING.md,
		marginBottom: SPACING.sm,
		borderWidth: 1.5,
		borderColor: COLORS.border,
	},
	cardDone: { opacity: 0.65, borderColor: COLORS.success },
	iconCircle: {
		width: 42,
		height: 42,
		borderRadius: BORDER_RADIUS.sm,
		backgroundColor: COLORS.card,
		borderWidth: 1.5,
		borderColor: COLORS.border,
		alignItems: "center",
		justifyContent: "center",
	},
	iconCircleDone: { backgroundColor: COLORS.success },
	info: { flex: 1, marginLeft: SPACING.sm },
	title: { ...FONTS.body, fontFamily: "SpaceGrotesk_700Bold" },
	titleDone: { textDecorationLine: "line-through" },
	description: { ...FONTS.caption, marginTop: 2 },
	xpBadge: {
		backgroundColor: COLORS.secondary,
		paddingHorizontal: SPACING.sm,
		paddingVertical: SPACING.xs,
		borderRadius: BORDER_RADIUS.sm,
	},
	xpText: {
		...FONTS.caption,
		color: COLORS.surfaceLight,
		fontFamily: "SpaceGrotesk_700Bold",
	},
});
