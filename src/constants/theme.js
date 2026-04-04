export const COLORS = {
	primary: "#FF5A1F",
	primaryDark: "#D9470F",
	primaryLight: "#FF8353",
	secondary: "#111111",
	accent: "#8A8A8A",
	success: "#1E9B55",
	warning: "#E68A00",
	danger: "#C0392B",

	background: "#E8E8E6",
	surface: "#EFEFEB",
	surfaceLight: "#F7F7F4",
	card: "#E1E1DD",

	text: "#131313",
	textSecondary: "#303030",
	textMuted: "#6F6F6F",
	textDark: "#0D0D0D",

	border: "#CACAC6",
	overlay: "rgba(10, 10, 10, 0.45)",

	heartRate: "#D9483B",
	breathing: "#1E7F8C",
	stress: "#C77700",
	readiness: "#FF5A1F",
};

export const FONT_FAMILIES = {
	display: "BebasNeue_400Regular",
	body: "SpaceGrotesk_400Regular",
	bodyMedium: "SpaceGrotesk_500Medium",
	bodyBold: "SpaceGrotesk_700Bold",
};

export const FONTS = {
	h1: {
		fontSize: 50,
		lineHeight: 50,
		letterSpacing: 1.2,
		fontFamily: FONT_FAMILIES.display,
		color: COLORS.text,
	},
	h2: {
		fontSize: 36,
		lineHeight: 38,
		letterSpacing: 0.9,
		fontFamily: FONT_FAMILIES.display,
		color: COLORS.text,
	},
	h3: {
		fontSize: 28,
		lineHeight: 30,
		letterSpacing: 0.7,
		fontFamily: FONT_FAMILIES.display,
		color: COLORS.text,
	},
	body: {
		fontSize: 16,
		lineHeight: 22,
		fontFamily: FONT_FAMILIES.bodyMedium,
		color: COLORS.text,
	},
	bodySmall: {
		fontSize: 14,
		lineHeight: 20,
		fontFamily: FONT_FAMILIES.body,
		color: COLORS.textSecondary,
	},
	caption: {
		fontSize: 12,
		lineHeight: 16,
		letterSpacing: 0.3,
		textTransform: "uppercase",
		fontFamily: FONT_FAMILIES.body,
		color: COLORS.textMuted,
	},
	button: {
		fontSize: 14,
		letterSpacing: 0.6,
		textTransform: "uppercase",
		fontFamily: FONT_FAMILIES.bodyBold,
		color: COLORS.text,
	},
};

export const SPACING = {
	xs: 4,
	sm: 8,
	md: 16,
	lg: 24,
	xl: 32,
	xxl: 48,
};

export const BORDER_RADIUS = {
	sm: 6,
	md: 10,
	lg: 14,
	xl: 20,
	full: 999,
};

export const ELEVATION = {
	card: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 10,
		elevation: 3,
	},
};
