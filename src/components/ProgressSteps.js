import React from "react";
import { View, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../constants/theme";

export default function ProgressSteps({ total, current }) {
	return (
		<View style={styles.container}>
			{Array.from({ length: total }, (_, i) => (
				<View
					key={i}
					style={[
						styles.step,
						i <= current ? styles.active : styles.inactive,
						i < total - 1 && styles.gap,
					]}
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		paddingHorizontal: SPACING.lg,
		paddingTop: SPACING.sm,
	},
	step: { flex: 1, height: 6, borderRadius: 0 },
	active: { backgroundColor: COLORS.primary },
	inactive: { backgroundColor: COLORS.card },
	gap: { marginRight: SPACING.xs },
});
