/**
 * ScanScreen — Real camera face-scan using Presage SmartSpectra REST API
 *
 * KEY FIX: CameraView is ALWAYS mounted once permissions are granted.
 * This ensures the camera is warm and ready when recordAsync() is called.
 * The camera is never conditionally unmounted/remounted during the flow.
 *
 * Flow: idle → countdown (3s) → recording (15s) → uploading → analyzing → done
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Animated,
	ScrollView,
	Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	CameraView,
	useCameraPermissions,
	useMicrophonePermissions,
} from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import VitalCard from "../components/VitalCard";
import ReadinessGauge from "../components/ReadinessGauge";
import useStore from "../store/useStore";
import { analyzeVideoForVitals } from "../services/presageService";
import { calculateReadiness } from "../utils/readinessEngine";
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from "../constants/theme";

const { width: SCREEN_W } = Dimensions.get("window");
const RECORD_DURATION_S = 10; // Reduced to keep file under 10MB API limit

const PHASE = {
	IDLE: "idle",
	COUNTDOWN: "countdown",
	RECORDING: "recording",
	UPLOADING: "uploading",
	ANALYZING: "analyzing",
	DONE: "done",
	ERROR: "error",
};

export default function ScanScreen() {
	const { user, setVitals, setReadiness, vitals, readiness } = useStore();

	const [permission, requestPermission] = useCameraPermissions();
	const [micPermission, requestMicPermission] = useMicrophonePermissions();
	const [phase, setPhase] = useState(PHASE.IDLE);
	const [countdown, setCountdown] = useState(3);
	const [recordElapsed, setRecordElapsed] = useState(0);
	const [progressMsg, setProgressMsg] = useState("");
	const [errorMsg, setErrorMsg] = useState("");

	const cameraRef = useRef(null);
	const countdownTimer = useRef(null);
	const recordTimer = useRef(null);
	const pulseAnim = useRef(new Animated.Value(1)).current;
	const progressAnim = useRef(new Animated.Value(0)).current;

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			clearInterval(countdownTimer.current);
			clearInterval(recordTimer.current);
		};
	}, []);

	// Pulse animation during recording
	useEffect(() => {
		if (phase === PHASE.RECORDING) {
			const loop = Animated.loop(
				Animated.sequence([
					Animated.timing(pulseAnim, {
						toValue: 1.2,
						duration: 700,
						useNativeDriver: true,
					}),
					Animated.timing(pulseAnim, {
						toValue: 1,
						duration: 700,
						useNativeDriver: true,
					}),
				]),
			);
			loop.start();
			return () => loop.stop();
		}
	}, [phase]);

	// Progress bar during recording
	useEffect(() => {
		if (phase === PHASE.RECORDING) {
			progressAnim.setValue(0);
			Animated.timing(progressAnim, {
				toValue: 1,
				duration: RECORD_DURATION_S * 1000,
				useNativeDriver: false,
			}).start();
		}
	}, [phase]);

	// ─── Main scan handler ──────────────────────────────────────────────────────
	const handleStartScan = useCallback(async () => {
		setErrorMsg("");

		// Step 1: Ensure camera + microphone permissions (both required for video recording)
		if (!permission?.granted) {
			const result = await requestPermission();
			if (!result.granted) {
				setErrorMsg("Camera permission is required to scan your vitals.");
				setPhase(PHASE.ERROR);
				return;
			}
		}

		if (!micPermission?.granted) {
			const result = await requestMicPermission();
			if (!result.granted) {
				setErrorMsg(
					"Microphone permission is required to record video for vitals analysis.",
				);
				setPhase(PHASE.ERROR);
				return;
			}
		}

		// Step 2: Countdown 3 → 2 → 1
		setPhase(PHASE.COUNTDOWN);
		setCountdown(3);

		await new Promise((resolve) => {
			let count = 3;
			countdownTimer.current = setInterval(() => {
				count -= 1;
				setCountdown(count);
				if (count <= 0) {
					clearInterval(countdownTimer.current);
					resolve();
				}
			}, 1000);
		});

		// Step 3: Start recording
		setPhase(PHASE.RECORDING);
		setRecordElapsed(0);

		recordTimer.current = setInterval(() => {
			setRecordElapsed((prev) => {
				const next = prev + 1;
				if (next >= RECORD_DURATION_S) clearInterval(recordTimer.current);
				return next;
			});
		}, 1000);

		let videoUri = null;
		try {
			if (!cameraRef.current) throw new Error("Camera ref not available");

			// recordAsync() resolves when stopRecording() is called or maxDuration elapses
			// mute:true — audio not needed for facial PPG analysis, also reduces file size
			// quality:'480p' — sufficient for blood-flow color detection, ~2-4MB for 10s
			// maxFileSize:9MB — hard safety cap below the 10MB API limit
			const recordPromise = cameraRef.current.recordAsync({
				maxDuration: RECORD_DURATION_S,
				maxFileSize: 9 * 1024 * 1024, // 9 MB cap
				quality: "480p",
				mute: true,
			});

			// Wait the full duration, then stop
			await new Promise((r) => setTimeout(r, RECORD_DURATION_S * 1000));
			clearInterval(recordTimer.current);
			cameraRef.current?.stopRecording();

			const recorded = await recordPromise;
			videoUri = recorded?.uri ?? null;
			console.log("[ScanScreen] Recorded video URI:", videoUri);
		} catch (err) {
			clearInterval(recordTimer.current);
			console.warn(
				"[ScanScreen] Recording warning (will use fallback):",
				err.message,
			);
		}

		// Step 4: Upload & analyze
		setPhase(PHASE.UPLOADING);
		setProgressMsg("Uploading face scan...");

		try {
			const vitalsData = await analyzeVideoForVitals(videoUri, {
				onProgress: (msg) => {
					setProgressMsg(msg);
					if (
						msg.toLowerCase().includes("analyz") ||
						msg.toLowerCase().includes("estimat") ||
						msg.toLowerCase().includes("finaliz")
					) {
						setPhase(PHASE.ANALYZING);
					}
				},
			});

			setVitals(vitalsData);
			setReadiness(calculateReadiness(vitalsData, user));
			setPhase(PHASE.DONE);
		} catch (err) {
			console.error("[ScanScreen] Analysis error:", err);
			setErrorMsg("Unable to analyze vitals. Please try again.");
			setPhase(PHASE.ERROR);
		}
	}, [permission, requestPermission, user, setVitals, setReadiness]);

	const handleReset = useCallback(() => {
		clearInterval(countdownTimer.current);
		clearInterval(recordTimer.current);
		try {
			cameraRef.current?.stopRecording();
		} catch (_) {}
		progressAnim.setValue(0);
		pulseAnim.setValue(1);
		setPhase(PHASE.IDLE);
		setCountdown(3);
		setRecordElapsed(0);
		setProgressMsg("");
		setErrorMsg("");
	}, []);

	// ─── Derived state ────────────────────────────────────────────────────────
	const isRecording = phase === PHASE.RECORDING;
	const isCountdown = phase === PHASE.COUNTDOWN;
	const isProcessing = phase === PHASE.UPLOADING || phase === PHASE.ANALYZING;
	const isDone = phase === PHASE.DONE;
	const isError = phase === PHASE.ERROR;
	const isIdle = phase === PHASE.IDLE;
	const isBusy = isCountdown || isRecording || isProcessing;

	// Camera is shown whenever BOTH permissions are granted (kept always warm)
	const showCamera =
		permission?.granted && micPermission?.granted && !isDone && !isError;

	return (
		<SafeAreaView style={styles.safe}>
			<ScrollView
				contentContainerStyle={styles.scroll}
				showsVerticalScrollIndicator={false}
				bounces={false}
			>
				{/* ── Header ── */}
				<View style={styles.header}>
					<Text style={styles.title}>Vitals Scan</Text>
					<Text style={styles.subtitle}>
						{isCountdown
							? "Get your face in the oval frame..."
							: isRecording
								? "Hold still — scanning your vitals"
								: isProcessing
									? progressMsg || "Processing your scan..."
									: isDone
										? "Scan complete!"
										: isError
											? "Scan failed"
											: permission?.granted
												? "Position your face in the oval, then tap Start"
												: "Camera access needed to scan vitals"}
					</Text>
				</View>

				{/* ── CAMERA VIEWFINDER (always mounted when permission granted) ── */}
				{showCamera && (
					<View style={styles.cameraContainer}>
						<CameraView
							ref={cameraRef}
							style={styles.camera}
							facing="front"
							mode="video"
						>
							{/* Dimming overlay when not actively recording/counting */}
							{isIdle && <View style={styles.idleDim} />}

							{/* Oval face guide */}
							<Animated.View
								style={[
									styles.ovalFrame,
									isRecording && { transform: [{ scale: pulseAnim }] },
									isRecording && { borderColor: COLORS.heartRate },
									isCountdown && { borderColor: COLORS.warning },
								]}
							/>

							{/* Corner brackets */}
							<View style={[styles.corner, styles.cornerTL]} />
							<View style={[styles.corner, styles.cornerTR]} />
							<View style={[styles.corner, styles.cornerBL]} />
							<View style={[styles.corner, styles.cornerBR]} />

							{/* Instruction overlay on idle */}
							{isIdle && (
								<View style={styles.idleHint}>
									<Ionicons
										name="person-circle-outline"
										size={28}
										color="rgba(255,255,255,0.7)"
									/>
									<Text style={styles.idleHintText}>Align your face here</Text>
								</View>
							)}

							{/* Countdown overlay */}
							{isCountdown && (
								<View style={styles.countdownOverlay}>
									<Text style={styles.countdownNum}>{countdown}</Text>
									<Text style={styles.countdownSub}>Recording in...</Text>
								</View>
							)}

							{/* REC badge */}
							{isRecording && (
								<View style={styles.recBadge}>
									<View style={styles.recDot} />
									<Text style={styles.recText}>
										{RECORD_DURATION_S - recordElapsed}s
									</Text>
								</View>
							)}

							{/* Processing overlay */}
							{isProcessing && (
								<View style={styles.processingOverlay}>
									<Ionicons
										name="pulse-outline"
										size={44}
										color={COLORS.primary}
									/>
									<Text style={styles.processingText}>
										{progressMsg || "Analyzing..."}
									</Text>
								</View>
							)}
						</CameraView>

						{/* Recording progress bar (below camera) */}
						<View style={styles.progressBarBg}>
							{isRecording && (
								<Animated.View
									style={[
										styles.progressBarFill,
										{
											width: progressAnim.interpolate({
												inputRange: [0, 1],
												outputRange: ["0%", "100%"],
											}),
										},
									]}
								/>
							)}
						</View>

						{/* Tips bar */}
						{isRecording && (
							<View style={styles.tipsRow}>
								<TipChip icon="sunny-outline" label="Good lighting" />
								<TipChip icon="eye-outline" label="Eyes forward" />
								<TipChip icon="body-outline" label="Stay still" />
							</View>
						)}
					</View>
				)}

				{/* ── Permission gate ── */}
				{(!permission?.granted || !micPermission?.granted) && !isDone && (
					<View style={styles.permBox}>
						<Ionicons name="camera-outline" size={48} color={COLORS.primary} />
						<Text style={styles.permTitle}>Permissions Required</Text>
						<Text style={styles.permDesc}>
							Solofit needs access to your camera and microphone to record a
							short face scan and measure your heart rate and breathing rate.
						</Text>
						<TouchableOpacity
							style={styles.primaryBtn}
							onPress={async () => {
								if (!permission?.granted) await requestPermission();
								if (!micPermission?.granted) await requestMicPermission();
							}}
						>
							<Ionicons
								name="camera"
								size={18}
								color={COLORS.text}
								style={{ marginRight: 8 }}
							/>
							<Text style={styles.primaryBtnText}>
								Allow Camera & Microphone
							</Text>
						</TouchableOpacity>
					</View>
				)}

				{/* ── Error state ── */}
				{isError && (
					<View style={styles.errorArea}>
						<Ionicons name="alert-circle" size={56} color={COLORS.danger} />
						<Text style={styles.errorTitle}>Scan Failed</Text>
						<Text style={styles.errorDesc}>{errorMsg}</Text>
					</View>
				)}

				{/* ── Results ── */}
				{isDone && vitals && (
					<View style={styles.results}>
						{/* Source badge */}
						<View style={styles.sourceBadge}>
							<Ionicons
								name={
									vitals.source === "presage_api"
										? "checkmark-circle"
										: "information-circle"
								}
								size={14}
								color={
									vitals.source === "presage_api"
										? COLORS.success
										: COLORS.warning
								}
							/>
							<Text
								style={[
									styles.sourceText,
									{
										color:
											vitals.source === "presage_api"
												? COLORS.success
												: COLORS.warning,
									},
								]}
							>
								{vitals.source === "presage_api"
									? "Presage API — Live Data"
									: "Estimated Vitals"}
							</Text>
						</View>

						{/* Vital cards */}
						<View style={styles.vitalsRow}>
							<VitalCard
								icon="heart"
								label="Heart Rate"
								value={vitals.heart_rate}
								unit="bpm"
								color={COLORS.heartRate}
							/>
							<View style={{ width: SPACING.sm }} />
							<VitalCard
								icon="water"
								label="Breathing"
								value={vitals.breathing_rate}
								unit="/min"
								color={COLORS.breathing}
							/>
						</View>
						<View style={[styles.vitalsRow, { marginTop: SPACING.sm }]}>
							<VitalCard
								icon="flash"
								label="Stress Level"
								value={vitals.stress_level}
								color={
									vitals.stress_level === "high"
										? COLORS.danger
										: vitals.stress_level === "medium"
											? COLORS.warning
											: COLORS.success
								}
								style={{ flex: 1 }}
							/>
						</View>

						{readiness && (
							<View style={{ marginTop: SPACING.md }}>
								<ReadinessGauge
									score={readiness.readiness_score}
									recommendation={readiness.recommendation}
									details={readiness.details}
								/>
							</View>
						)}
					</View>
				)}

				{/* ── Action Buttons ── */}
				<View style={styles.buttonArea}>
					{isBusy ? (
						/* Cancel during countdown / recording / processing */
						!isProcessing && (
							<TouchableOpacity
								style={styles.cancelBtn}
								onPress={handleReset}
								activeOpacity={0.8}
							>
								<Ionicons
									name="close-circle-outline"
									size={20}
									color={COLORS.textSecondary}
								/>
								<Text style={styles.cancelText}>Cancel</Text>
							</TouchableOpacity>
						)
					) : permission?.granted ? (
						<TouchableOpacity
							style={[
								styles.primaryBtn,
								(isError || isDone) && styles.retryBtn,
							]}
							onPress={isDone || isError ? handleReset : handleStartScan}
							activeOpacity={0.85}
						>
							<Ionicons
								name={isDone ? "refresh" : isError ? "reload" : "scan"}
								size={20}
								color={COLORS.text}
								style={{ marginRight: SPACING.xs }}
							/>
							<Text style={styles.primaryBtnText}>
								{isDone ? "Scan Again" : isError ? "Try Again" : "Start Scan"}
							</Text>
						</TouchableOpacity>
					) : null}

					{isProcessing && (
						<View style={styles.processingIndicator}>
							<Ionicons name="pulse" size={18} color={COLORS.primary} />
							<Text style={styles.processingIndicatorText}>
								{progressMsg || "Processing..."}
							</Text>
						</View>
					)}
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

// ─── Tip chip ──────────────────────────────────────────────────────────────────
function TipChip({ icon, label }) {
	return (
		<View style={chipStyles.chip}>
			<Ionicons name={icon} size={12} color="rgba(255,255,255,0.7)" />
			<Text style={chipStyles.label}>{label}</Text>
		</View>
	);
}

const chipStyles = StyleSheet.create({
	chip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		backgroundColor: "rgba(0,0,0,0.5)",
		borderRadius: BORDER_RADIUS.full,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	label: { fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "500" },
});

// ─── Styles ────────────────────────────────────────────────────────────────────
const OVAL_W = SCREEN_W * 0.56;
const OVAL_H = OVAL_W * 1.38;
const CORNER = 24;

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: COLORS.background },
	scroll: { flexGrow: 1, paddingBottom: SPACING.xl },

	header: {
		paddingHorizontal: SPACING.lg,
		paddingTop: SPACING.md,
		paddingBottom: SPACING.sm,
	},
	title: { ...FONTS.h1 },
	subtitle: { ...FONTS.bodySmall, marginTop: 4 },

	// ── Camera ──────────────────────────────────────────────────────────────────
	cameraContainer: {
		marginHorizontal: SPACING.lg,
		marginTop: SPACING.md,
		borderRadius: BORDER_RADIUS.lg,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	camera: {
		height: 390,
		width: "100%",
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#000",
	},

	// Dim overlay on idle
	idleDim: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.25)",
	},

	// Oval face guide
	ovalFrame: {
		width: OVAL_W,
		height: OVAL_H,
		borderRadius: OVAL_W / 2,
		borderWidth: 2.5,
		borderColor: COLORS.primary,
		borderStyle: "dashed",
	},

	// Corner brackets
	corner: {
		position: "absolute",
		width: CORNER,
		height: CORNER,
		borderColor: COLORS.accent,
		borderWidth: 3,
	},
	cornerTL: {
		top: 14,
		left: 14,
		borderRightWidth: 0,
		borderBottomWidth: 0,
		borderTopLeftRadius: 6,
	},
	cornerTR: {
		top: 14,
		right: 14,
		borderLeftWidth: 0,
		borderBottomWidth: 0,
		borderTopRightRadius: 6,
	},
	cornerBL: {
		bottom: 14,
		left: 14,
		borderRightWidth: 0,
		borderTopWidth: 0,
		borderBottomLeftRadius: 6,
	},
	cornerBR: {
		bottom: 14,
		right: 14,
		borderLeftWidth: 0,
		borderTopWidth: 0,
		borderBottomRightRadius: 6,
	},

	// Idle overlay
	idleHint: {
		position: "absolute",
		bottom: 24,
		alignSelf: "center",
		alignItems: "center",
		gap: 4,
		backgroundColor: "rgba(0,0,0,0.5)",
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.sm,
		borderRadius: BORDER_RADIUS.full,
		flexDirection: "row",
	},
	idleHintText: {
		color: "rgba(255,255,255,0.8)",
		fontSize: 13,
		fontWeight: "500",
	},

	// Countdown
	countdownOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.55)",
		justifyContent: "center",
		alignItems: "center",
	},
	countdownNum: {
		fontSize: 100,
		fontWeight: "900",
		color: "#fff",
		lineHeight: 110,
	},
	countdownSub: {
		fontSize: 16,
		color: "rgba(255,255,255,0.7)",
		fontWeight: "500",
	},

	// REC badge
	recBadge: {
		position: "absolute",
		top: 14,
		right: 14,
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		backgroundColor: "rgba(0,0,0,0.65)",
		borderRadius: BORDER_RADIUS.full,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	recDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: COLORS.danger,
	},
	recText: { fontSize: 12, color: "#fff", fontWeight: "700" },

	// Processing overlay
	processingOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(15,15,26,0.88)",
		justifyContent: "center",
		alignItems: "center",
		gap: 12,
	},
	processingText: {
		fontSize: 15,
		color: COLORS.textSecondary,
		textAlign: "center",
		paddingHorizontal: 24,
	},

	// Progress bar
	progressBarBg: {
		height: 3,
		backgroundColor: COLORS.border,
	},
	progressBarFill: {
		height: 3,
		backgroundColor: COLORS.heartRate,
		borderRadius: 2,
	},

	// Tips
	tipsRow: {
		flexDirection: "row",
		justifyContent: "center",
		gap: 8,
		backgroundColor: COLORS.surface,
		paddingVertical: SPACING.sm,
		paddingHorizontal: SPACING.sm,
		flexWrap: "wrap",
	},

	// ── Permission gate ──────────────────────────────────────────────────────────
	permBox: {
		margin: SPACING.lg,
		marginTop: SPACING.xl,
		backgroundColor: COLORS.surface,
		borderRadius: BORDER_RADIUS.lg,
		padding: SPACING.xl,
		alignItems: "center",
		gap: SPACING.md,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	permTitle: { ...FONTS.h3, textAlign: "center" },
	permDesc: { ...FONTS.bodySmall, textAlign: "center", lineHeight: 20 },

	// ── Error state ──────────────────────────────────────────────────────────────
	errorArea: {
		margin: SPACING.lg,
		alignItems: "center",
		gap: SPACING.sm,
		paddingVertical: SPACING.xl,
	},
	errorTitle: { ...FONTS.h2, color: COLORS.danger },
	errorDesc: { ...FONTS.bodySmall, textAlign: "center", lineHeight: 20 },

	// ── Results ──────────────────────────────────────────────────────────────────
	results: { marginHorizontal: SPACING.lg, marginTop: SPACING.lg },
	sourceBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		marginBottom: SPACING.md,
	},
	sourceText: { fontSize: 12, fontWeight: "600" },
	vitalsRow: { flexDirection: "row" },

	// ── Buttons ──────────────────────────────────────────────────────────────────
	buttonArea: {
		marginHorizontal: SPACING.lg,
		marginTop: SPACING.lg,
	},

	primaryBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.primary,
		paddingVertical: SPACING.md,
		borderRadius: BORDER_RADIUS.md,
		borderWidth: 2,
		borderColor: COLORS.secondary,
	},
	retryBtn: { backgroundColor: COLORS.surfaceLight },
	primaryBtnText: { ...FONTS.button },

	cancelBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: SPACING.xs,
		paddingVertical: SPACING.md,
		borderRadius: BORDER_RADIUS.md,
		borderWidth: 1.5,
		borderColor: COLORS.border,
		backgroundColor: COLORS.surfaceLight,
	},
	cancelText: { ...FONTS.bodySmall, color: COLORS.textSecondary },

	processingIndicator: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: SPACING.xs,
		paddingVertical: SPACING.md,
	},
	processingIndicatorText: {
		...FONTS.bodySmall,
		color: COLORS.primary,
		fontWeight: "600",
	},
});
