import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS, FONTS, BORDER_RADIUS, SPACING } from "../constants/theme";

export default function ChipSelector({
	options,
	selected,
	onToggle,
	multi = false,
}) {
	const isSelected = (id) => {
		if (multi) return selected?.includes(id);
		return selected === id;
	};

	const handlePress = (id) => {
		if (multi) {
			const current = selected || [];
			if (current.includes(id)) {
				onToggle(current.filter((i) => i !== id));
			} else {
				onToggle([...current, id]);
			}
		} else {
			onToggle(id);
		}
	};

	return (
		<View style={styles.container}>
			{options.map((opt) => {
				const id = typeof opt === "string" ? opt : opt.id;
				const label = typeof opt === "string" ? opt : opt.label;
				const active = isSelected(id);

				return (
					<Pressable
						key={id}
						style={[styles.chip, active && styles.chipActive]}
						onPress={() => handlePress(id)}
						hitSlop={6}
					>
						<Text style={[styles.chipText, active && styles.chipTextActive]}>
							{label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
	chip: {
		minHeight: 40,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.xs + 2,
		borderRadius: BORDER_RADIUS.md,
		backgroundColor: COLORS.surface,
		borderWidth: 1.5,
		borderColor: COLORS.border,
		justifyContent: "center",
	},
	chipActive: {
		backgroundColor: COLORS.primary,
		borderColor: COLORS.secondary,
	},
	chipText: { ...FONTS.caption, color: COLORS.textSecondary },
	chipTextActive: { color: COLORS.textDark },
});
