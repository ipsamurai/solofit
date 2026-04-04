import React from "react";
import {
	TouchableOpacity,
	Text,
	View,
	StyleSheet,
	ActivityIndicator,
} from "react-native";
import { COLORS, FONTS, BORDER_RADIUS, SPACING } from "../constants/theme";

export default function GradientButton({
	title,
	onPress,
	disabled,
	loading,
	style,
	variant = "primary",
}) {
	const isSecondary = variant === "secondary";
	const bgColor = isSecondary ? COLORS.surfaceLight : COLORS.primary;
	const borderColor = isSecondary ? COLORS.secondary : COLORS.secondary;
	const textColor = isSecondary ? COLORS.text : COLORS.textDark;

	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={disabled || loading}
			activeOpacity={0.82}
			style={[styles.wrapper, style]}
		>
			<View
				style={[
					styles.button,
					{ backgroundColor: bgColor, borderColor },
					disabled && styles.buttonDisabled,
				]}
			>
				{loading ? (
					<ActivityIndicator color={textColor} />
				) : (
					<Text style={[styles.text, { color: textColor }]}>{title}</Text>
				)}
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	wrapper: { width: "100%" },
	button: {
		minHeight: 54,
		paddingVertical: SPACING.md,
		paddingHorizontal: SPACING.md,
		borderWidth: 2,
		borderRadius: BORDER_RADIUS.md,
		alignItems: "center",
		justifyContent: "center",
	},
	buttonDisabled: { opacity: 0.45 },
	text: { ...FONTS.button, textAlign: "center" },
});
