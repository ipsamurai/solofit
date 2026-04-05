import { create } from "zustand";

const useStore = create((set, get) => ({
	// User profile
	user: null,
	setUser: (user) => set({ user }),

	// Onboarding data (built up step by step)
	onboardingData: {
		name: "",
		age: "",
		weight: "",
		height: "",
		gender: "",
		goals: [],
		activityLevel: "",
		dietType: "none",
		allergies: [],
		healthIssues: [],
		equipment: [],
		budget: "medium",
		cuisine: "",
	},
	updateOnboarding: (data) =>
		set((state) => ({
			onboardingData: { ...state.onboardingData, ...data },
		})),
	resetOnboarding: () =>
		set({
			onboardingData: {
				name: "",
				age: "",
				weight: "",
				height: "",
				gender: "",
				goals: [],
				activityLevel: "",
				dietType: "none",
				allergies: [],
				healthIssues: [],
				equipment: [],
				budget: "medium",
				cuisine: "",
			},
		}),

	// Presage biometric data
	vitals: null,
	setVitals: (vitals) => set({ vitals }),

	// Readiness
	readiness: null,
	setReadiness: (readiness) => set({ readiness }),

	// Fitness plan from Gemini
	fitnessPlan: null,
	setFitnessPlan: (fitnessPlan) => set({ fitnessPlan }),
	isGeneratingPlan: false,
	setIsGeneratingPlan: (v) => set({ isGeneratingPlan: v }),

	// Gamification
	xp: 0,
	streak: 0,
	completedQuests: [],
	addXP: (amount) => set((state) => ({ xp: state.xp + amount })),
	incrementStreak: () => set((state) => ({ streak: state.streak + 1 })),
	resetStreak: () => set({ streak: 0 }),
	completeQuest: (questId) =>
		set((state) => ({
			completedQuests: [...state.completedQuests, questId],
			xp: state.xp + 50,
		})),

	// Community (mock/local for now)
	communityPosts: [
		{
			id: "p1",
			type: "blog",
			title: "Mobility morning reset",
			caption:
				"10 mins hip + thoracic mobility before work. Felt great all day.",
			imageUri:
				"https://images.pexels.com/photos/414029/pexels-photo-414029.jpeg?auto=compress&cs=tinysrgb&w=1200",
			author: "Coach Mira",
			createdAt: "2026-04-05T06:30:00.000Z",
			likes: 12,
		},
		{
			id: "p2",
			type: "pr_goal",
			title: "PR Goal: 80kg squat",
			caption: "Current: 72kg x 3. Targeting 80kg by end of month.",
			imageUri:
				"https://images.pexels.com/photos/2294361/pexels-photo-2294361.jpeg?auto=compress&cs=tinysrgb&w=1200",
			author: "Athlete Jay",
			createdAt: "2026-04-04T14:20:00.000Z",
			likes: 9,
		},
	],
	addCommunityPost: (post) =>
		set((state) => ({
			communityPosts: [post, ...state.communityPosts],
		})),
	updateCommunityPostLikes: (postId, likes) =>
		set((state) => ({
			communityPosts: state.communityPosts.map((p) =>
				p.id === postId ? { ...p, likes } : p,
			),
		})),

	// Auth
	authUser: null,
	setAuthUser: (authUser) => set({ authUser }),

	// Onboarding completion
	hasOnboarded: false,
	setHasOnboarded: (v) => set({ hasOnboarded: v }),
}));

export default useStore;
