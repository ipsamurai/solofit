import { COMMUNITY_API_BASE_URL } from "@env";
import Constants from "expo-constants";
import { Platform } from "react-native";

const API_PORT = "4000";
const DEFAULT_REQUEST_TIMEOUT_MS = 7000;
const UPLOAD_REQUEST_TIMEOUT_MS = 12000;
const DEFAULT_REQUEST_BUDGET_MS = 18000;
const UPLOAD_REQUEST_BUDGET_MS = 35000;

function getRequestSettings(path, options = {}) {
	const method = String(options?.method || "GET").toUpperCase();
	if (method === "POST" && path === "/community/posts") {
		return {
			attemptTimeoutMs: UPLOAD_REQUEST_TIMEOUT_MS,
			totalBudgetMs: UPLOAD_REQUEST_BUDGET_MS,
		};
	}
	return {
		attemptTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
		totalBudgetMs: DEFAULT_REQUEST_BUDGET_MS,
	};
}

function extractHost(value) {
	if (!value) return null;
	const raw = String(value)
		.trim()
		.replace(/^.*:\/\//, "");
	const host = raw.split("/")[0]?.split(":")[0];
	if (!host) return null;
	return host;
}

function buildApiCandidates() {
	const candidates = [];

	if (COMMUNITY_API_BASE_URL?.trim()) {
		candidates.push(COMMUNITY_API_BASE_URL.trim().replace(/\/$/, ""));
	}

	const hostHints = [
		Constants?.expoConfig?.hostUri,
		Constants?.manifest2?.extra?.expoClient?.hostUri,
		Constants?.manifest?.debuggerHost,
		Constants?.linkingUri,
	];

	for (const hint of hostHints) {
		const host = extractHost(hint);
		if (host && host !== "localhost" && host !== "127.0.0.1") {
			candidates.push(`http://${host}:${API_PORT}`);
		}
	}

	if (Platform.OS === "android") {
		candidates.push(`http://10.0.2.2:${API_PORT}`);
	}

	candidates.push(`http://localhost:${API_PORT}`);

	return [...new Set(candidates)];
}

let workingApiBase = null;

async function request(path, options = {}) {
	const candidates = buildApiCandidates();
	const ordered = workingApiBase
		? [workingApiBase, ...candidates.filter((c) => c !== workingApiBase)]
		: candidates;
	const { attemptTimeoutMs, totalBudgetMs } = getRequestSettings(path, options);
	const deadline = Date.now() + totalBudgetMs;

	let lastError = null;

	for (const base of ordered) {
		const remainingMs = deadline - Date.now();
		if (remainingMs <= 0) {
			break;
		}

		const timeoutMs = Math.min(attemptTimeoutMs, remainingMs);
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

		try {
			const res = await fetch(`${base}${path}`, {
				...options,
				signal: controller.signal,
			});
			const data = await res.json().catch(() => ({}));

			if (res.ok && data.ok !== false) {
				workingApiBase = base;
				return data;
			}

			const message = data.error || `Request failed (${res.status})`;
			const err = new Error(message);
			err.status = res.status;

			if (res.status === 404 && base !== ordered[ordered.length - 1]) {
				lastError = err;
				continue;
			}

			throw err;
		} catch (error) {
			if (error?.name === "AbortError") {
				lastError = new Error(
					`Request timed out after ${Math.round(timeoutMs / 1000)}s (${base}${path})`,
				);
				continue;
			}

			lastError = error;
			const networkFailed =
				String(error?.message || "")
					.toLowerCase()
					.includes("network") ||
				String(error?.message || "")
					.toLowerCase()
					.includes("failed to fetch");
			if (!networkFailed && base !== ordered[ordered.length - 1]) {
				throw error;
			}
		} finally {
			clearTimeout(timeoutId);
		}
	}

	throw new Error(
		lastError?.message ||
			"Cannot reach community backend. Start API server and ensure phone/emulator is on the same network.",
	);
}

export async function fetchLeaderboardRows() {
	const data = await request("/leaderboard");
	return data.rows || [];
}

export async function fetchCommunityPosts() {
	const data = await request("/community/posts");
	return data.posts || [];
}

export async function createCommunityPostRemote(postInput) {
	const formData = new FormData();
	formData.append("type", postInput.type || "blog");
	formData.append("title", postInput.title || "");
	formData.append("caption", postInput.caption || "");
	formData.append("author", postInput.author || "Athlete");

	if (postInput.imageUri) {
		formData.append("image", {
			uri: postInput.imageUri,
			name: `post-${Date.now()}.jpg`,
			type: "image/jpeg",
		});
	}

	const data = await request("/community/posts", {
		method: "POST",
		body: formData,
	});

	return data.post;
}

export async function seedLeaderboardRemote() {
	const data = await request("/leaderboard/seed", { method: "POST" });
	return data;
}
