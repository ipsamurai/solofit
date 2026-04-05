import React, { useEffect, useMemo, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	TextInput,
	Image,
	Alert,
	ActivityIndicator,
	Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import useStore from "../store/useStore";
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from "../constants/theme";
import {
	createCommunityPostRemote,
	fetchCommunityPosts,
} from "../services/mongoBackendService";

export default function CommunityScreen({ navigation }) {
	const { user, communityPosts } = useStore();
	const [posts, setPosts] = useState(communityPosts);
	const [loadingPosts, setLoadingPosts] = useState(true);
	const [publishing, setPublishing] = useState(false);

	const [type, setType] = useState("blog");
	const [title, setTitle] = useState("");
	const [caption, setCaption] = useState("");
	const [imageUri, setImageUri] = useState(null);
	const [viewerImageUri, setViewerImageUri] = useState(null);

	const sortedPosts = useMemo(
		() =>
			[...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
		[posts],
	);

	useEffect(() => {
		let active = true;

		(async () => {
			try {
				const remote = await fetchCommunityPosts();
				if (active && remote.length) {
					setPosts(remote);
				}
			} catch (_) {
				// Fallback to local store when backend is unavailable.
			} finally {
				if (active) setLoadingPosts(false);
			}
		})();

		return () => {
			active = false;
		};
	}, []);

	const pickImage = async () => {
		const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!perm.granted) {
			Alert.alert("Permission needed", "Enable photo access to share posts.");
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsEditing: true,
			aspect: [4, 5],
			quality: 0.8,
		});

		if (!result.canceled && result.assets?.length) {
			setImageUri(result.assets[0].uri);
		}
	};

	const publishPost = async () => {
		if (!title.trim()) {
			Alert.alert("Missing title", "Please add a title.");
			return;
		}
		if (!caption.trim()) {
			Alert.alert("Missing text", "Please add a caption or goal details.");
			return;
		}

		setPublishing(true);
		try {
			const created = await createCommunityPostRemote({
				type,
				title: title.trim(),
				caption: caption.trim(),
				imageUri,
				author: user?.name || "Athlete",
			});

			setPosts((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
			setTitle("");
			setCaption("");
			setImageUri(null);
			Alert.alert("Posted", "Saved to MongoDB and published in Community.");
		} catch (e) {
			Alert.alert(
				"Post failed",
				e.message || "Could not save post to backend.",
			);
		} finally {
			setPublishing(false);
		}
	};

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => navigation.goBack()}
					style={styles.backBtn}
				>
					<Ionicons name="arrow-back" size={20} color={COLORS.text} />
				</TouchableOpacity>
				<Text style={styles.title}>Community</Text>
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.composer}>
					<Text style={styles.blockTitle}>Share Blog or PR Goal</Text>

					<View style={styles.typeRow}>
						{[
							{ id: "blog", label: "Blog" },
							{ id: "pr_goal", label: "PR Goal" },
						].map((t) => (
							<TouchableOpacity
								key={t.id}
								onPress={() => setType(t.id)}
								style={[
									styles.typeChip,
									type === t.id && styles.typeChipActive,
								]}
							>
								<Text
									style={[
										styles.typeText,
										type === t.id && styles.typeTextActive,
									]}
								>
									{t.label}
								</Text>
							</TouchableOpacity>
						))}
					</View>

					<TextInput
						value={title}
						onChangeText={setTitle}
						placeholder={type === "blog" ? "Post title" : "PR target title"}
						placeholderTextColor={COLORS.textMuted}
						style={styles.input}
					/>
					<TextInput
						value={caption}
						onChangeText={setCaption}
						placeholder={
							type === "blog"
								? "Share your progress..."
								: "Current stats, target, deadline..."
						}
						placeholderTextColor={COLORS.textMuted}
						style={[styles.input, styles.textArea]}
						multiline
					/>

					<TouchableOpacity style={styles.pickBtn} onPress={pickImage}>
						<Ionicons name="image-outline" size={18} color={COLORS.primary} />
						<Text style={styles.pickBtnText}>
							{imageUri ? "Change Photo" : "Add Photo"}
						</Text>
					</TouchableOpacity>

					{imageUri ? (
						<Image source={{ uri: imageUri }} style={styles.preview} />
					) : null}

					<TouchableOpacity
						style={[styles.publishBtn, publishing && { opacity: 0.6 }]}
						onPress={publishPost}
						disabled={publishing}
					>
						{publishing ? (
							<ActivityIndicator size="small" color={COLORS.textDark} />
						) : (
							<Text style={styles.publishText}>Publish</Text>
						)}
					</TouchableOpacity>
				</View>

				<Text style={styles.feedTitle}>Community Feed</Text>
				{loadingPosts ? (
					<View style={styles.loadingWrap}>
						<ActivityIndicator size="small" color={COLORS.primary} />
						<Text style={styles.loadingText}>Loading posts...</Text>
					</View>
				) : null}
				{sortedPosts.map((post) => (
					<View key={post.id} style={styles.postCard}>
						<View style={styles.postTop}>
							<Text style={styles.postType}>
								{post.type === "pr_goal" ? "PR Goal" : "Blog"}
							</Text>
							<Text style={styles.postAuthor}>{post.author}</Text>
						</View>
						<Text style={styles.postTitle}>{post.title}</Text>
						<Text style={styles.postCaption}>{post.caption}</Text>
						{post.imageUri ? (
							<TouchableOpacity
								onPress={() => setViewerImageUri(post.imageUri)}
								activeOpacity={0.9}
							>
								<Image
									source={{ uri: post.imageUri }}
									style={styles.postImage}
								/>
							</TouchableOpacity>
						) : null}
					</View>
				))}
			</ScrollView>

			<Modal
				visible={!!viewerImageUri}
				transparent
				animationType="fade"
				onRequestClose={() => setViewerImageUri(null)}
			>
				<View style={styles.viewerBackdrop}>
					<TouchableOpacity
						style={styles.viewerClose}
						onPress={() => setViewerImageUri(null)}
					>
						<Ionicons name="close" size={24} color={COLORS.text} />
					</TouchableOpacity>
					{viewerImageUri ? (
						<Image
							source={{ uri: viewerImageUri }}
							style={styles.viewerImage}
						/>
					) : null}
				</View>
			</Modal>
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
	composer: {
		backgroundColor: COLORS.surfaceLight,
		borderWidth: 1.5,
		borderColor: COLORS.border,
		borderRadius: BORDER_RADIUS.md,
		padding: SPACING.md,
	},
	blockTitle: { ...FONTS.h3, marginBottom: SPACING.sm },
	typeRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.sm },
	typeChip: {
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.xs + 2,
		borderRadius: BORDER_RADIUS.md,
		backgroundColor: COLORS.surface,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	typeChipActive: {
		backgroundColor: COLORS.primary,
		borderColor: COLORS.secondary,
	},
	typeText: { ...FONTS.caption },
	typeTextActive: { color: COLORS.textDark },
	input: {
		borderWidth: 1.5,
		borderColor: COLORS.border,
		borderRadius: BORDER_RADIUS.md,
		backgroundColor: COLORS.surface,
		paddingHorizontal: SPACING.md,
		paddingVertical: SPACING.sm,
		...FONTS.body,
		marginBottom: SPACING.sm,
	},
	textArea: { minHeight: 88, textAlignVertical: "top" },
	pickBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.xs,
		alignSelf: "flex-start",
		paddingHorizontal: SPACING.sm,
		paddingVertical: SPACING.xs,
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: BORDER_RADIUS.sm,
		backgroundColor: COLORS.surface,
	},
	pickBtnText: { ...FONTS.caption, color: COLORS.primary },
	preview: {
		width: "100%",
		height: 220,
		marginTop: SPACING.sm,
		borderRadius: BORDER_RADIUS.md,
		backgroundColor: COLORS.card,
	},
	publishBtn: {
		marginTop: SPACING.md,
		backgroundColor: COLORS.primary,
		borderWidth: 2,
		borderColor: COLORS.secondary,
		borderRadius: BORDER_RADIUS.md,
		minHeight: 48,
		alignItems: "center",
		justifyContent: "center",
	},
	publishText: { ...FONTS.button, color: COLORS.textDark },
	feedTitle: { ...FONTS.h3, marginTop: SPACING.lg, marginBottom: SPACING.sm },
	loadingWrap: {
		flexDirection: "row",
		alignItems: "center",
		gap: SPACING.sm,
		marginBottom: SPACING.sm,
	},
	loadingText: { ...FONTS.bodySmall },
	postCard: {
		backgroundColor: COLORS.surfaceLight,
		borderWidth: 1.5,
		borderColor: COLORS.border,
		borderRadius: BORDER_RADIUS.md,
		padding: SPACING.md,
		marginBottom: SPACING.sm,
	},
	postTop: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	postType: { ...FONTS.caption, color: COLORS.primary },
	postAuthor: { ...FONTS.caption },
	postTitle: { ...FONTS.body, marginTop: SPACING.xs },
	postCaption: { ...FONTS.bodySmall, marginTop: SPACING.xs },
	postImage: {
		width: "100%",
		height: 220,
		marginTop: SPACING.sm,
		borderRadius: BORDER_RADIUS.md,
		backgroundColor: COLORS.card,
	},
	viewerBackdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.88)",
		alignItems: "center",
		justifyContent: "center",
		padding: SPACING.md,
	},
	viewerClose: {
		position: "absolute",
		top: 60,
		right: 20,
		zIndex: 5,
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(255,255,255,0.12)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.24)",
	},
	viewerImage: {
		width: "100%",
		height: "74%",
		borderRadius: BORDER_RADIUS.md,
		resizeMode: "contain",
	},
});
