# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Solofit** is a real-time adaptive AI fitness coach mobile app. It continuously adapts fitness and diet plans using user profile data, real-time biometrics (Presage SmartSpectra SDK), camera posture analysis (MediaPipe), and AI reasoning (Gemini API).

## Tech Stack

- **Frontend:** React Native (Expo SDK 54, blank template)
- **Backend:** Firebase (Auth + Firestore)
- **AI:** Gemini API (`@google/generative-ai`, model: `gemini-2.0-flash`)
- **Biometrics:** Presage SmartSpectra SDK (currently mocked)
- **Pose Detection:** MediaPipe (currently mocked)
- **State Management:** Zustand
- **Navigation:** React Navigation (native-stack + bottom-tabs)

## Common Commands

```bash
npm install                # Install dependencies
npx expo start             # Start Expo dev server
npx expo start --ios       # Run on iOS simulator
npx expo start --android   # Run on Android emulator
npx expo start --web       # Run in browser
npx expo export --platform web  # Test production bundle
```

## Architecture

### Source Structure (`src/`)

- `navigation/` — AppNavigator (root), OnboardingNavigator (5-step flow), MainNavigator (bottom tabs)
- `screens/` — Dashboard, Workout, Diet, Scan, Posture, Profile screens
- `screens/onboarding/` — Welcome, BasicInfo, Goals, Diet, Health, Summary
- `services/` — Firebase config, Presage SDK, Gemini API
- `store/useStore.js` — Single Zustand store (user, vitals, readiness, plan, gamification)
- `components/` — GradientButton, Card, ChipSelector, VitalCard, ReadinessGauge, QuestCard, ExerciseViewer3D, ProgressSteps
- `constants/` — Theme (colors, fonts, spacing), onboarding options
- `utils/` — Readiness engine, quest system

### Core Data Flow

1. User completes 5-step onboarding → profile stored in Zustand (and optionally Firebase)
2. `presageService.startVitalsScan()` captures biometrics → stored as `vitals`
3. `calculateReadiness(vitals, user)` → readiness_score (0-100) + recommendation
4. `geminiService.generateFitnessPlan(user, vitals, readiness)` → 7-day workout + diet plan (strict JSON)
5. Dashboard displays everything; Workout/Diet screens show details
6. Posture screen runs mock pose analysis, cross-references with fatigue
7. Gamification: XP, streaks, daily quests rotate based on day-of-year

### Navigation Flow

- `hasOnboarded === false` → OnboardingNavigator (Welcome → BasicInfo → Goals → Diet → Health → Summary)
- `hasOnboarded === true` → MainNavigator (5 bottom tabs: Dashboard, Workout, Scan, Diet, Profile)
- PostureScreen is a modal accessible from the main stack

## Critical Rules

- **Never allow allergens in diet plans** — dietary constraints are STRICT. Gemini prompts must include them, and output is post-validated by `validateNoAllergens()`.
- **Validate Gemini output** — always strip markdown fences and parse JSON before rendering.
- **Presage SDK is mocked** — `USE_MOCK = true` in `presageService.js`. Toggle for real device.
- **API keys are placeholders** — Firebase and Gemini keys in services need real values before deployment.
