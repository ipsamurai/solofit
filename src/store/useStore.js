import { create } from 'zustand';

const useStore = create((set, get) => ({
  // User profile
  user: null,
  setUser: (user) => set({ user }),

  // Onboarding data (built up step by step)
  onboardingData: {
    name: '',
    age: '',
    weight: '',
    height: '',
    gender: '',
    goals: [],
    activityLevel: '',
    dietType: 'none',
    allergies: [],
    healthIssues: [],
    equipment: [],
    budget: 'medium',
    cuisine: '',
  },
  updateOnboarding: (data) =>
    set((state) => ({
      onboardingData: { ...state.onboardingData, ...data },
    })),
  resetOnboarding: () =>
    set({
      onboardingData: {
        name: '', age: '', weight: '', height: '', gender: '',
        goals: [], activityLevel: '', dietType: 'none', allergies: [],
        healthIssues: [], equipment: [], budget: 'medium', cuisine: '',
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

  // Auth
  authUser: null,
  setAuthUser: (authUser) => set({ authUser }),

  // Onboarding completion
  hasOnboarded: false,
  setHasOnboarded: (v) => set({ hasOnboarded: v }),
}));

export default useStore;
