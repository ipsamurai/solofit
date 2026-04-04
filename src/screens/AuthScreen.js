import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	ActivityIndicator,
	Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import {
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	sendPasswordResetEmail,
	updateProfile,
	GoogleAuthProvider,
	signInWithCredential,
} from "firebase/auth";
import { auth } from "../services/firebaseConfig";
import {
	COLORS,
	FONTS,
	SPACING,
	BORDER_RADIUS,
	FONT_FAMILIES,
} from "../constants/theme";
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID } from "@env";

WebBrowser.maybeCompleteAuthSession();

// Both client IDs must be real values (not placeholders) for Google auth to work
const GOOGLE_CONFIGURED =
	GOOGLE_WEB_CLIENT_ID &&
	!GOOGLE_WEB_CLIENT_ID.startsWith("YOUR_") &&
	GOOGLE_ANDROID_CLIENT_ID &&
	!GOOGLE_ANDROID_CLIENT_ID.startsWith("YOUR_");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function friendlyError(code) {
	switch (code) {
		case "auth/invalid-email":
			return "Invalid email address.";
		case "auth/user-not-found":
			return "No account found with this email.";
		case "auth/wrong-password":
			return "Incorrect password.";
		case "auth/invalid-credential":
			return "Invalid email or password.";
		case "auth/email-already-in-use":
			return "This email is already registered.";
		case "auth/weak-password":
			return "Password must be at least 6 characters.";
		case "auth/too-many-requests":
			return "Too many attempts. Try again later.";
		case "auth/operation-not-allowed":
			return "Email/password sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.";
		case "auth/network-request-failed":
			return "Network error. Check your internet connection.";
		case "auth/internal-error":
			return "Firebase internal error. Check your project configuration.";
		case "auth/configuration-not-found":
			return "Firebase project not configured correctly.";
		default:
			return `Error: ${code ?? "unknown"}. Check the console for details.`;
	}
}

// ─── Input Field ─────────────────────────────────────────────────────────────

function InputField({ icon, rightIcon, onRightIconPress, style, ...props }) {
	return (
		<View style={[inputStyles.wrap, style]}>
			<Ionicons
				name={icon}
				size={18}
				color={COLORS.textMuted}
				style={inputStyles.leftIcon}
			/>
			<TextInput
				style={inputStyles.input}
				placeholderTextColor={COLORS.textMuted}
				selectionColor={COLORS.primary}
				{...props}
			/>
			{rightIcon && (
				<TouchableOpacity
					onPress={onRightIconPress}
					style={inputStyles.rightIcon}
					hitSlop={8}
				>
					<Ionicons name={rightIcon} size={18} color={COLORS.textMuted} />
				</TouchableOpacity>
			)}
		</View>
	);
}

const inputStyles = StyleSheet.create({
	wrap: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.surfaceLight,
		borderWidth: 1.5,
		borderColor: COLORS.border,
		borderRadius: BORDER_RADIUS.md,
		paddingHorizontal: SPACING.md,
		height: 52,
		marginBottom: SPACING.md,
	},
	leftIcon: { marginRight: SPACING.sm },
	input: { flex: 1, ...FONTS.body, color: COLORS.text, paddingVertical: 0 },
	rightIcon: { paddingLeft: SPACING.sm },
});

// ─── Google Sign-In Button (isolated so useAuthRequest only runs when configured)

function GoogleSignInButton({ onError }) {
	const [loading, setLoading] = useState(false);

	const [request, response, promptAsync] = Google.useAuthRequest({
		webClientId: GOOGLE_WEB_CLIENT_ID,
		androidClientId: GOOGLE_ANDROID_CLIENT_ID,
	});

	useEffect(() => {
		if (!response) return;
		if (response.type === "success") {
			const { id_token } = response.params;
			const credential = GoogleAuthProvider.credential(id_token);
			signInWithCredential(auth, credential)
				.catch((e) => onError(friendlyError(e.code)))
				.finally(() => setLoading(false));
		} else if (response.type === "error") {
			onError("Google sign-in failed. Please try again.");
			setLoading(false);
		} else {
			setLoading(false);
		}
	}, [response]);

	async function handlePress() {
		setLoading(true);
		try {
			await promptAsync();
		} catch {
			setLoading(false);
		}
	}

	return (
		<TouchableOpacity
			style={styles.googleBtn}
			onPress={handlePress}
			activeOpacity={0.8}
			disabled={loading || !request}
		>
			{loading ? (
				<ActivityIndicator size="small" color={COLORS.text} />
			) : (
				<>
					<AntDesign
						name="google"
						size={18}
						color="#EA4335"
						style={{ marginRight: SPACING.sm }}
					/>
					<Text style={styles.googleBtnText}>Continue with Google</Text>
				</>
			)}
		</TouchableOpacity>
	);
}

function GoogleButtonPlaceholder() {
	return (
		<TouchableOpacity
			style={[styles.googleBtn, { opacity: 0.45 }]}
			disabled
			activeOpacity={1}
		>
			<AntDesign
				name="google"
				size={18}
				color="#EA4335"
				style={{ marginRight: SPACING.sm }}
			/>
			<Text style={styles.googleBtnText}>Continue with Google</Text>
		</TouchableOpacity>
	);
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AuthScreen() {
	const [mode, setMode] = useState("signin");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const isSignUp = mode === "signup";

	function switchMode(m) {
		setMode(m);
		setError("");
		setName("");
		setPassword("");
		setConfirmPassword("");
	}

	async function handleAuth() {
		setError("");
		if (isSignUp && !name.trim()) {
			setError("Please enter your full name.");
			return;
		}
		if (!email.trim()) {
			setError("Please enter your email.");
			return;
		}
		if (!password) {
			setError("Please enter a password.");
			return;
		}
		if (isSignUp && password !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}
		if (password.length < 6) {
			setError("Password must be at least 6 characters.");
			return;
		}

		setLoading(true);
		try {
			if (isSignUp) {
				const cred = await createUserWithEmailAndPassword(
					auth,
					email.trim(),
					password,
				);
				await updateProfile(cred.user, { displayName: name.trim() });
			} else {
				await signInWithEmailAndPassword(auth, email.trim(), password);
			}
		} catch (e) {
			console.error("[Auth] code:", e.code, "| message:", e.message);
			setError(friendlyError(e.code));
		} finally {
			setLoading(false);
		}
	}

	async function handleForgotPassword() {
		if (!email.trim()) {
			setError("Enter your email above to reset your password.");
			return;
		}
		try {
			await sendPasswordResetEmail(auth, email.trim());
			Alert.alert(
				"Check your inbox",
				`A password reset link has been sent to ${email.trim()}.`,
			);
		} catch (e) {
			setError(friendlyError(e.code));
		}
	}

	return (
		<KeyboardAvoidingView
			style={styles.root}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<ScrollView
				contentContainerStyle={styles.scroll}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.blob1} pointerEvents="none" />
				<View style={styles.blob2} pointerEvents="none" />

				{/* ── Branding ── */}
				<View style={styles.header}>
					<LinearGradient
						colors={[COLORS.primary + "40", COLORS.primary + "10"]}
						style={styles.iconRing}
					>
						<LinearGradient
							colors={[COLORS.primary, COLORS.primaryDark]}
							style={styles.iconInner}
						>
							<Ionicons name="fitness" size={32} color="#fff" />
						</LinearGradient>
					</LinearGradient>
					<Text style={styles.appName}>Solofit</Text>
					<Text style={styles.tagline}>Your AI-Powered Fitness Coach</Text>
				</View>

				{/* ── Card ── */}
				<View style={styles.card}>
					{/* Tab toggle */}
					<View style={styles.tabRow}>
						{["signin", "signup"].map((t) => {
							const active = mode === t;
							const label = t === "signin" ? "Sign In" : "Create Account";
							return (
								<TouchableOpacity
									key={t}
									style={styles.tab}
									onPress={() => switchMode(t)}
									activeOpacity={0.75}
								>
									{active ? (
										<LinearGradient
											colors={[COLORS.primary, COLORS.primaryDark]}
											start={{ x: 0, y: 0 }}
											end={{ x: 1, y: 0 }}
											style={styles.tabGradient}
										>
											<Text style={styles.tabLabelActive}>{label}</Text>
										</LinearGradient>
									) : (
										<Text style={styles.tabLabel}>{label}</Text>
									)}
								</TouchableOpacity>
							);
						})}
					</View>

					<View style={styles.form}>
						{/* Google button — only mounts the hook-containing component when configured */}
						{GOOGLE_CONFIGURED ? (
							<GoogleSignInButton onError={setError} />
						) : (
							<GoogleButtonPlaceholder />
						)}

						{/* Divider */}
						<View style={styles.divider}>
							<View style={styles.dividerLine} />
							<Text style={styles.dividerText}>or</Text>
							<View style={styles.dividerLine} />
						</View>

						{isSignUp && (
							<InputField
								icon="person-outline"
								placeholder="Full Name"
								value={name}
								onChangeText={(v) => {
									setName(v);
									setError("");
								}}
								autoCapitalize="words"
								autoCorrect={false}
							/>
						)}

						<InputField
							icon="mail-outline"
							placeholder="Email address"
							value={email}
							onChangeText={(v) => {
								setEmail(v);
								setError("");
							}}
							keyboardType="email-address"
							autoCapitalize="none"
							autoCorrect={false}
						/>

						<InputField
							icon="lock-closed-outline"
							placeholder="Password"
							value={password}
							onChangeText={(v) => {
								setPassword(v);
								setError("");
							}}
							secureTextEntry={!showPassword}
							rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
							onRightIconPress={() => setShowPassword((p) => !p)}
							autoCapitalize="none"
						/>

						{isSignUp && (
							<InputField
								icon="lock-closed-outline"
								placeholder="Confirm Password"
								value={confirmPassword}
								onChangeText={(v) => {
									setConfirmPassword(v);
									setError("");
								}}
								secureTextEntry={!showConfirm}
								rightIcon={showConfirm ? "eye-off-outline" : "eye-outline"}
								onRightIconPress={() => setShowConfirm((p) => !p)}
								autoCapitalize="none"
								style={{ marginBottom: 0 }}
							/>
						)}

						{!!error && (
							<View style={styles.errorBox}>
								<Ionicons
									name="alert-circle-outline"
									size={15}
									color={COLORS.danger}
								/>
								<Text style={styles.errorText}>{error}</Text>
							</View>
						)}

						{!isSignUp && (
							<TouchableOpacity
								onPress={handleForgotPassword}
								style={styles.forgotRow}
							>
								<Text style={styles.forgotText}>Forgot password?</Text>
							</TouchableOpacity>
						)}

						<TouchableOpacity
							onPress={handleAuth}
							activeOpacity={0.85}
							disabled={loading}
							style={[styles.ctaWrap, loading && { opacity: 0.7 }]}
						>
							<LinearGradient
								colors={[
									COLORS.primaryLight,
									COLORS.primary,
									COLORS.primaryDark,
								]}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 0 }}
								style={styles.cta}
							>
								{loading ? (
									<ActivityIndicator color="#fff" />
								) : (
									<View style={styles.ctaInner}>
										<Text style={styles.ctaText}>
											{isSignUp ? "Create Account" : "Sign In"}
										</Text>
										<Ionicons
											name="arrow-forward"
											size={18}
											color="#fff"
											style={{ marginLeft: 8 }}
										/>
									</View>
								)}
							</LinearGradient>
						</TouchableOpacity>
					</View>
				</View>

				<Text style={styles.footerText}>
					{isSignUp ? "Already have an account?  " : "New to Solofit?  "}
					<Text
						style={styles.footerLink}
						onPress={() => switchMode(isSignUp ? "signin" : "signup")}
					>
						{isSignUp ? "Sign In" : "Create one"}
					</Text>
				</Text>

				<View style={styles.pills}>
					{[
						{ icon: "pulse", label: "Live Biometrics" },
						{ icon: "sparkles", label: "AI Adaptive Plans" },
						{ icon: "body", label: "Posture Analysis" },
					].map((p) => (
						<View key={p.label} style={styles.pill}>
							<Ionicons name={p.icon} size={13} color={COLORS.primary} />
							<Text style={styles.pillText}>{p.label}</Text>
						</View>
					))}
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: COLORS.background },
	scroll: {
		flexGrow: 1,
		paddingHorizontal: SPACING.lg,
		paddingTop: 72,
		paddingBottom: SPACING.xl,
		alignItems: "center",
	},

	blob1: {
		position: "absolute",
		width: 280,
		height: 280,
		borderRadius: 140,
		backgroundColor: COLORS.primary + "14",
		top: -60,
		right: -80,
	},
	blob2: {
		position: "absolute",
		width: 200,
		height: 200,
		borderRadius: 100,
		backgroundColor: COLORS.card,
		bottom: 80,
		left: -60,
	},

	header: { alignItems: "center", marginBottom: SPACING.xl },
	iconRing: {
		width: 88,
		height: 88,
		borderRadius: 44,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: SPACING.md,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	iconInner: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignItems: "center",
		justifyContent: "center",
	},
	appName: {
		...FONTS.h1,
		fontSize: 68,
		lineHeight: 64,
		letterSpacing: 1.4,
	},
	tagline: { ...FONTS.caption, color: COLORS.primaryDark, marginTop: 4 },

	card: {
		width: "100%",
		backgroundColor: COLORS.surfaceLight,
		borderRadius: BORDER_RADIUS.xl,
		borderWidth: 1.5,
		borderColor: COLORS.border,
		overflow: "hidden",
		marginBottom: SPACING.lg,
		borderTopWidth: 3,
		borderTopColor: COLORS.secondary,
	},

	tabRow: {
		flexDirection: "row",
		backgroundColor: COLORS.card,
		borderBottomWidth: 1.5,
		borderBottomColor: COLORS.border,
	},
	tab: { flex: 1, height: 46, alignItems: "center", justifyContent: "center" },
	tabGradient: {
		width: "100%",
		height: "100%",
		alignItems: "center",
		justifyContent: "center",
	},
	tabLabel: { ...FONTS.caption, color: COLORS.textMuted },
	tabLabelActive: {
		...FONTS.caption,
		color: COLORS.surfaceLight,
		fontFamily: FONT_FAMILIES.bodyBold,
	},

	form: { padding: SPACING.lg },

	googleBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		height: 52,
		borderRadius: BORDER_RADIUS.md,
		borderWidth: 1.5,
		borderColor: COLORS.border,
		backgroundColor: COLORS.surface,
		marginBottom: SPACING.md,
	},
	googleBtnText: { ...FONTS.body, color: COLORS.text },

	divider: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: SPACING.md,
		gap: SPACING.sm,
	},
	dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
	dividerText: { ...FONTS.caption, color: COLORS.textMuted, fontWeight: "600" },

	errorBox: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.danger + "18",
		borderRadius: BORDER_RADIUS.sm,
		paddingHorizontal: SPACING.sm,
		paddingVertical: SPACING.xs + 2,
		marginTop: SPACING.sm,
		marginBottom: SPACING.xs,
		gap: SPACING.xs,
	},
	errorText: { ...FONTS.bodySmall, color: COLORS.danger, flex: 1 },

	forgotRow: {
		alignSelf: "flex-end",
		marginTop: SPACING.xs,
		marginBottom: SPACING.md,
	},
	forgotText: { ...FONTS.bodySmall, color: COLORS.primaryDark },

	ctaWrap: {
		marginTop: SPACING.md,
		borderRadius: BORDER_RADIUS.md,
		overflow: "hidden",
	},
	cta: {
		height: 52,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: BORDER_RADIUS.md,
		borderWidth: 2,
		borderColor: COLORS.secondary,
	},
	ctaInner: { flexDirection: "row", alignItems: "center" },
	ctaText: { ...FONTS.button, color: COLORS.surfaceLight },

	footerText: {
		...FONTS.bodySmall,
		color: COLORS.textMuted,
		marginBottom: SPACING.xl,
	},
	footerLink: { color: COLORS.primaryDark, fontFamily: FONT_FAMILIES.bodyBold },

	pills: {
		flexDirection: "row",
		gap: SPACING.sm,
		flexWrap: "wrap",
		justifyContent: "center",
	},
	pill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		backgroundColor: COLORS.primary + "15",
		borderRadius: BORDER_RADIUS.full,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.xs,
		borderWidth: 1,
		borderColor: COLORS.primary + "30",
	},
	pillText: { ...FONTS.caption, color: COLORS.primaryDark },
});
