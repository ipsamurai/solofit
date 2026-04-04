import React from "react";
import { View, StyleSheet } from "react-native";
import { COLORS, BORDER_RADIUS, ELEVATION, SPACING } from "../constants/theme";

export default function Card({ children, style }) {
	return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: COLORS.surfaceLight,
		borderRadius: BORDER_RADIUS.lg,
		padding: SPACING.lg,
		borderWidth: 1.5,
		borderColor: COLORS.border,
		borderTopWidth: 3,
		borderTopColor: COLORS.secondary,
		...ELEVATION.card,
	},
});
