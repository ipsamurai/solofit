import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS, BORDER_RADIUS, SPACING } from "../constants/theme";

export default function VitalCard({ icon, label, value, unit, color, style }) {
	return (
		<View style={[styles.card, { borderLeftColor: color }, style]}>
			<Ionicons name={icon} size={22} color={color} />
			<Text style={styles.label}>{label}</Text>
			<View style={styles.valueRow}>
				<Text style={[styles.value, { color }]}>{value ?? "--"}</Text>
				{unit && <Text style={styles.unit}>{unit}</Text>}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: COLORS.surfaceLight,
		borderRadius: BORDER_RADIUS.md,
		padding: SPACING.md,
		borderLeftWidth: 4,
		borderWidth: 1.5,
		borderColor: COLORS.border,
		flex: 1,
	},
	label: { ...FONTS.caption, marginTop: SPACING.xs },
	valueRow: {
		flexDirection: "row",
		alignItems: "baseline",
		marginTop: SPACING.xs,
	},
	value: { ...FONTS.h2, fontSize: 42, lineHeight: 42 },
	unit: { ...FONTS.caption, marginLeft: SPACING.xs },
});
