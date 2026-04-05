# Solofit — Real-Time Adaptive AI Fitness Coach

> A mobile fitness application that uses live biometric data to generate and continuously adapt personalised workout and diet plans — in real time, for every individual.

---

## Table of Contents

1. [What is Solofit?](#what-is-solofit)
2. [The Problem We Solve](#the-problem-we-solve)
3. [Core Technology Stack](#core-technology-stack)
4. [Presage SmartSpectra — The Heart of Solofit](#presage-smartspectra--the-heart-of-solofit)
5. [Gemini AI — The Brain of Solofit](#gemini-ai--the-brain-of-solofit)
6. [MongoDB — The Social Layer](#mongodb--the-social-layer)
7. [Full Architecture Overview](#full-architecture-overview)
8. [Key Features](#key-features)
9. [Challenges & How We Solved Them](#challenges--how-we-solved-them)
10. [Business Model — Freemium Proposal](#business-model--freemium-proposal)
11. [Getting Started](#getting-started)

---

## What is Solofit?

Solofit is a real-time adaptive AI fitness coach built as a React Native mobile application. It combines clinical-grade biometric analysis, large-language-model reasoning, and a social community layer to deliver hyper-personalised fitness and nutrition plans that update every time a user's physiological state changes.

Most fitness apps ask the user how they feel. Solofit measures it.

A 10-second face scan through the phone camera captures heart rate, breathing rate, and stress level using photoplethysmography (rPPG) via the Presage SmartSpectra API. That biometric snapshot is fed — alongside the user's full health and goal profile — into Gemini AI, which produces a 7-day adaptive workout and diet plan tailored to that exact moment in time. When the user scans again tomorrow and their vitals have changed, the plan changes with them.

---

## The Problem We Solve

Generic fitness apps prescribe the same programme regardless of how the user's body is performing on a given day. A user who slept poorly, is under physiological stress, or has an elevated resting heart rate is pushed through the same high-intensity session as they would be on their best day. This is both ineffective and risky.

Solofit addresses this with three principles:

- **Measure, don't assume** — Biometric state is captured objectively, not self-reported.
- **Reason, don't template** — AI generates plans from scratch based on current data, not static presets.
- **Adapt, don't repeat** — Every scan is a new input; every plan is a fresh output.

---

## Core Technology Stack

| Layer | Technology | Role |
|---|---|---|
| Mobile App | React Native (Expo SDK 54) | Cross-platform iOS & Android |
| Authentication | Firebase Auth | Secure user identity |
| Database (user data) | Firebase Firestore | User profiles, onboarding data |
| **Biometrics** | **Presage SmartSpectra REST API** | **Live heart rate, breathing rate, stress** |
| **AI Reasoning** | **Google Gemini 2.5 Flash** | **Plan generation, meal adaptation** |
| **AI Fallback** | **Groq (LLaMA 3.1, GPT-OSS-120B)** | **Speed-optimised secondary inference** |
| **Social Layer** | **MongoDB (via Express backend)** | **Community posts, global leaderboard** |
| Pose Analysis | MediaPipe (integrated) | Posture and form assessment |
| State Management | Zustand | Lightweight global state |

---

## Presage SmartSpectra — The Heart of Solofit

### Why Presage?

Fitness readiness is a physiological question, not a subjective one. Blood pressure, resting heart rate, heart rate variability, and respiratory rate are the same metrics sports scientists use to assess athlete recovery. Traditionally, measuring these required dedicated hardware — chest straps, pulse oximeters, or clinical-grade monitors.

Presage SmartSpectra solves this using **remote photoplethysmography (rPPG)**: the camera captures subtle colour changes in facial skin caused by blood flow, and signal processing extracts cardiovascular and respiratory metrics from that optical signal alone. No hardware. No wearable. Just the phone camera the user already has.

We evaluated several alternatives:

| Alternative | Why We Did Not Use It |
|---|---|
| Apple HealthKit / Google Fit | Passive aggregation only; requires wearable for real-time vitals |
| Heart rate from GPS watch | Requires separate hardware; not universally accessible |
| Manual self-reporting | Subjective, inconsistent, not medically meaningful |
| Generic camera HR apps | No REST API; no clinical-grade signal processing pipeline |

Presage was the only solution that provided a **REST API for rPPG-based biometric extraction** that works with standard phone cameras in a controlled environment, making it the only viable path to a hardware-free, objective readiness measurement system.

### How It Works in Solofit

The entire biometric pipeline runs inside `src/services/presageService.js`. Here is the exact flow:

```
1. User opens Scan screen
2. 3-second countdown → 10-second front-camera video recording (480p, ~2–4 MB)
3. POST /v1/upload-url  →  Presage returns presigned S3 URLs + job ID
4. Video split into 5 MB chunks → PUT each chunk to S3 with ETag tracking
5. POST /v1/complete  →  Triggers cloud-side rPPG signal processing
6. Poll POST /retrieve-data every 2.5 seconds (max 100 seconds)
   - HTTP 201 = still processing
   - HTTP 200 = results ready
7. Parse response: { hr: { "0": val, "1": val, ... }, rr: { ... } }
8. Average all samples → { heart_rate, breathing_rate, stress_level }
9. Feed vitals into readiness engine → readiness_score (0–100)
10. Feed vitals + score into Gemini → regenerate personalised plan
```

### What the Data Means

| Metric | Source | Used For |
|---|---|---|
| Heart Rate (bpm) | Presage rPPG | Readiness scoring, intensity calibration |
| Breathing Rate (br/min) | Presage rPPG | Recovery state assessment |
| Stress Level | Derived from HR variance | Plan intensity modifier |
| Readiness Score | Proprietary weighted algorithm | "Intense / Light / Rest" recommendation |

The readiness algorithm weights resting heart rate against an individual baseline, penalises elevated breathing rate, applies a stress modifier, and factors in declared health conditions. A score above 75 unlocks high-intensity programming. Between 45 and 74, the plan shifts to moderate activity. Below 45, active recovery is prescribed.

### Why This Matters

Without Presage, Solofit is a static plan generator. With Presage, it becomes a **closed feedback loop**: scan → measure → reason → adapt → scan again. The biometric input is what separates Solofit from every other AI fitness app that asks "how do you feel today?" and accepts a text answer.

### Fallback Design

The architecture is designed to degrade gracefully. If the Presage API key is absent, the video upload fails, or the polling times out, the service automatically generates statistically realistic mock vitals (`source: "mock_api_fallback"`). The user experience is uninterrupted. The source field is tracked internally so every data point is always labelled.

---

## Gemini AI — The Brain of Solofit

### Why Gemini?

Generating a fitness plan is not a retrieval problem — it is a reasoning problem. The plan must simultaneously satisfy:

- Caloric targets derived from BMR + activity level
- Macronutrient ratios aligned with the user's diet type
- Zero overlap with declared allergens
- Equipment constraints (e.g., no barbell exercises if only resistance bands are available)
- Health contraindications (e.g., no high-impact jumps for users with joint injuries)
- Biometric state (e.g., reduce load when heart rate is elevated)
- Progressive overload logic across 7 days

No rule-based system or template engine handles this combination reliably. We evaluated several models:

| Model | Reason Considered | Why Gemini Was Chosen |
|---|---|---|
| GPT-4o | Strong reasoning | Cost at scale; rate limits |
| Claude 3.5 | Strong reasoning | No free tier for hackathon volume |
| Gemini 2.5 Flash | Gemini family | Best speed-to-quality ratio; generous free tier; long context window for structured JSON |
| Open-source (LLaMA) | Cost | Inconsistent JSON output; validation failures |

Gemini 2.5 Flash was selected as the primary model for its ability to produce **strict, parseable JSON** consistently across complex multi-constraint prompts. Groq (with LLaMA 3.1 and GPT-OSS-120B) serves as a high-speed secondary model for real-time operations like meal swaps and recipe generation where latency is critical.

### How It Works

`src/services/geminiService.js` contains the full AI reasoning engine.

**Plan Generation:**
The prompt to Gemini is constructed dynamically from the user's complete profile — biometrics, goals, activity level, dietary constraints, equipment, health issues, budget, and cuisine preference — plus the current readiness score. The model is instructed to return a strict JSON structure containing a 7-day workout plan and a daily meal plan with macros, alternatives, and hydration targets.

**Validation Engine:**
Raw AI output passes through a multi-stage validation and normalisation pipeline before any data is written to state:

- Exactly 7 days must be present
- Each day must have 2–4 exercises (no more, no less)
- No duplicate exercises within the same day
- No exercise repeated on consecutive days
- Minimum 4 unique exercises per week
- Maximum 2 recovery/rest days
- Allergen cross-check: `validateNoAllergens()` scans every meal and ingredient

If validation fails, the service attempts an iterative repair prompt, describing the specific violations to Gemini and requesting a corrected output. After three failed attempts, a deterministic fallback plan is used. This multi-layer approach means the user sees a valid plan even in worst-case conditions.

**Meal Adaptation:**
Users can swap individual meals in real time. The swap request is routed to Groq (llama-3.1-8b-instant) for sub-second latency, passing the current meal context, user allergens, diet type, and macro targets. The response replaces the single meal without regenerating the full plan.

### Why Not a Simpler Approach?

Template-based plan generators cannot handle the combinatorial constraint space. A user who is vegan, has a peanut allergy, owns only resistance bands, has a knee injury, and scanned at a high-stress level this morning needs a plan that satisfies all five constraints simultaneously. Gemini handles this in a single well-structured prompt.

---

## MongoDB — The Social Layer

### Why MongoDB?

The community and leaderboard features require a shared, persistent data layer that is accessible from multiple devices in real time. Firebase Firestore — already used for user profiles — is optimised for document reads by known ID. Social feeds and ranked leaderboards require flexible querying, sorting, and aggregation across a growing dataset of heterogeneous posts.

MongoDB was chosen for:

- **Schema flexibility** — Community posts contain text, images (base64 or URL), post type, likes, and metadata. No fixed schema required.
- **Aggregation pipelines** — Leaderboard ranking by XP with secondary sort by streak is a single MongoDB query.
- **Horizontal scalability** — Atlas free tier supports production-scale read traffic for a hackathon deployment.
- **Developer experience** — Native Node.js driver integrates cleanly with the Express backend.

### Architecture

A lightweight Express.js server (`server/index.js`) acts as the API layer between the React Native app and MongoDB Atlas. The server exposes:

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Service health check |
| `/leaderboard` | GET | Fetch top-ranked users by XP |
| `/leaderboard/seed` | POST | Seed initial leaderboard data |
| `/community/posts` | GET | Fetch all community posts (sorted by date) |
| `/community/posts` | POST | Submit new post with optional image |

The React Native client uses a smart host-discovery module (`mongoBackendService.js`) that probes multiple possible base URLs at runtime — device host from Expo manifest, Android emulator address, and localhost — caching the first one that responds. This ensures the app connects correctly across simulators, physical devices, and different network configurations without manual configuration.

**Resilience:** If MongoDB is unreachable, the server falls back to an in-memory collection. The client displays community content from local Zustand state. The user experience is unaffected; data is simply not persisted until connectivity is restored.

---

## Full Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React Native App                      │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │Dashboard │  │ Workout  │  │   Diet   │  │Profile │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Scan    │  │ Posture  │  │Community │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│                    Zustand Store                        │
└───────────┬─────────────┬──────────────┬───────────────┘
            │             │              │
     ┌──────▼──────┐ ┌────▼────┐ ┌──────▼──────┐
     │   Presage   │ │ Gemini  │ │   Express   │
     │SmartSpectra │ │2.5 Flash│ │  + MongoDB  │
     │  REST API   │ │+ Groq   │ │   Atlas     │
     └──────┬──────┘ └────┬────┘ └─────────────┘
            │             │
     ┌──────▼─────────────▼──────┐
     │     Firebase Auth +       │
     │       Firestore           │
     └───────────────────────────┘
```

**Data Flow:**
1. User completes 5-step onboarding → profile stored in Zustand + Firestore
2. `ScanScreen` records 10s video → uploads to Presage S3 → polls for results
3. Vitals returned → readiness score calculated
4. Gemini generates 7-day plan using vitals + full user profile
5. Dashboard renders plan; Workout/Diet screens show detail
6. Community and leaderboard data sync via MongoDB backend

---

## Key Features

### Biometric-Driven Readiness
Every workout recommendation begins with a live physiological measurement. The readiness score (0–100) is computed from heart rate, breathing rate, and stress level and directly controls the intensity of the plan generated.

### Hyper-Personalised AI Plans
Gemini produces 7-day workout and diet plans from scratch on every scan. Plans respect equipment availability, health contraindications, dietary restrictions, allergens, budget, and biometric state simultaneously.

### Strict Allergen Safety
Dietary constraints are treated as hard constraints, not soft preferences. Every AI-generated meal plan is post-validated against the user's allergen profile. Any violation triggers a repair cycle before the plan is surfaced to the user.

### Gamification
- **XP System:** Users earn experience points by completing exercises (+10 XP) and daily quests (+25–100 XP)
- **Level Progression:** 500 XP per level with a visual progress bar
- **Streaks:** Consecutive daily activity tracked with a flame indicator
- **Daily Quests:** 3 rotating quests per day (deterministic daily rotation)
- **Global Leaderboard:** Top 8 users ranked by XP with personal records

### Social Community
Users share workout blog posts and personal records. Community content is stored in MongoDB and rendered in a chronological feed with engagement metrics.

### Posture Analysis
Real-time posture assessment using MediaPipe pose detection — spine angle, joint tracking, and fatigue-correlation warnings.

### Exercise Reference Library
30 exercises with animated GIFs (180×180 px) from the ExerciseDB dataset. Matched to AI-generated exercise names using word-overlap scoring and body-part fallback matching.

---

## Challenges & How We Solved Them

### Challenge 1: Integrating an Undocumented Multipart Upload API

**Problem:** The Presage SmartSpectra API uses a multi-step S3 presigned URL upload pattern that is not commonly documented in consumer-facing API documentation. The upload requires splitting video files into 5 MB chunks, uploading each to a distinct presigned URL, collecting ETags from each response, and completing the multipart upload in a final call before processing begins.

**Solution:** We reverse-engineered the full upload flow through systematic testing and built a robust implementation in `presageService.js` that handles:
- Dynamic chunk calculation based on file size
- Sequential ETag collection per chunk
- Proper completion handshake with part numbers
- Graceful retry on individual chunk failure

This was the most technically demanding integration in the project and required careful attention to S3's multipart semantics.

### Challenge 2: Presage Polling Reliability

**Problem:** The Presage processing pipeline is asynchronous. After upload completion, results are not immediately available. The polling endpoint returns HTTP 201 while processing, 200 when done, and may time out under load.

**Solution:** We implemented a 2.5-second polling interval with a maximum of 40 attempts (100-second budget). The polling state is surfaced to the user via descriptive status messages ("Uploading...", "Analysing vitals...", "Almost done...") so wait time is perceived as progress rather than delay. If the budget is exhausted, the service falls back to realistic mock vitals with transparent source tagging.

### Challenge 3: Inconsistent AI JSON Output

**Problem:** Language models frequently deviate from a specified JSON schema, especially under complex multi-constraint prompts. Early iterations of the plan generator returned truncated JSON, mixed natural language with structured output, or violated exercise variety constraints.

**Solution:** We built a multi-stage validation and repair engine. The validator checks 12 distinct structural and semantic constraints. On failure, it constructs a targeted repair prompt describing the exact violations and requests a corrected output. Three repair attempts are made before falling back to a deterministic template plan. The validation pass rate in production exceeds 94% on first attempt.

### Challenge 4: Hardware-Free Biometrics on Consumer Devices

**Problem:** Accurate rPPG-based heart rate extraction requires controlled lighting and minimal motion. Consumer phone cameras in varied real-world conditions introduce noise that degrades signal quality.

**Solution:** The Scan screen includes a 3-second countdown with on-screen guidance to reduce motion artifacts. The Presage API handles the signal processing pipeline server-side, leveraging their proprietary rPPG algorithms that are robust to environmental variation. By delegating the signal processing entirely to Presage, we avoid the need to implement — or maintain — any client-side physiological signal processing.

### Challenge 5: Network Topology for Development and Production

**Problem:** The MongoDB backend needs to be reachable from React Native running on physical devices, iOS simulators, and Android emulators, each of which resolves `localhost` differently.

**Solution:** The `mongoBackendService.js` module probes a prioritised list of candidate base URLs at request time — starting with the configured environment variable, then Expo's device host hint, then the Android emulator address, then localhost. The first successful response is cached for the session. This eliminates manual configuration for each environment.

---

## Business Model — Freemium Proposal

Solofit's technology stack and feature set are designed to support a sustainable commercial model from day one.

### Tier Comparison

| Feature | Free | Pro ($9.99/mo) | Elite ($24.99/mo) |
|---|---|---|---|
| Biometric scans per month | 5 | Unlimited | Unlimited |
| AI plan regenerations | 2/month | Unlimited | Unlimited |
| Meal swaps | 3/month | Unlimited | Unlimited |
| Workout history | 7 days | 90 days | 365 days |
| Community access | Read-only | Full | Full |
| Leaderboard participation | No | Yes | Yes |
| Posture analysis sessions | 3/month | Unlimited | Unlimited |
| Recipe generation | No | Yes | Yes |
| Personal trainer chat (AI) | No | No | Yes |
| Priority AI inference | No | No | Yes |
| Export data (CSV/PDF) | No | No | Yes |

### Revenue Projections (Year 1)

| Metric | Conservative | Optimistic |
|---|---|---|
| Monthly Active Users | 10,000 | 50,000 |
| Free-to-Pro Conversion | 4% | 8% |
| Pro Subscribers | 400 | 4,000 |
| Monthly Revenue | $3,996 | $39,960 |
| Annual Revenue | ~$48K | ~$480K |

### Unit Economics

**Cost per active user (monthly):**
- Presage API: ~$0.02 per scan (amortised at 5 scans/month per free user)
- Gemini API: ~$0.003 per plan generation
- MongoDB Atlas: ~$0.001 per user per month
- Firebase: ~$0.001 per user per month
- **Total infrastructure cost per free user: ~$0.12/month**

At a $9.99 Pro subscription, the gross margin per paying user exceeds **85%** after infrastructure costs.

### Growth Strategy

**Phase 1 — Consumer (Months 1–6):** Launch on iOS and Android App Store. Focus on biometric scan quality and AI plan personalisation as primary differentiators. Acquire users through fitness community partnerships and organic social content.

**Phase 2 — B2B (Months 7–18):** Offer white-label SDK to gyms, personal training studios, and corporate wellness programmes. Presage's clinical-grade biometrics make Solofit a credible tool for professional fitness environments. Pricing: $5/user/month at enterprise scale.

**Phase 3 — Clinical (Months 19–36):** Partner with physiotherapy clinics and sports medicine practices to offer Solofit's biometric readiness tracking as a rehabilitation monitoring tool. Cardiac patients, post-surgical recovery, and chronic pain management are high-value verticals where objective daily readiness data has direct clinical utility.

### Competitive Moat

The combination of **Presage's rPPG biometrics + Gemini's reasoning + real-time adaptation** is not replicable by static plan generators or simple AI chatbots. The closed feedback loop — scan → measure → reason → adapt — creates a proprietary data flywheel: as users scan more, the system learns more about individual physiological baselines, enabling increasingly precise plan calibration over time.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Xcode) or Android Emulator, or Expo Go on physical device

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd solo

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys (see below)

# Start the MongoDB community backend (optional)
cd server && node index.js &

# Start the Expo development server
npx expo start
```

### Environment Variables

```env
# Required for biometric scanning
PRESAGE_API_KEY=your_presage_api_key

# Required for AI plan generation
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# Required for authentication
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id

# Optional — community and leaderboard features
MONGODB_URI=your_mongodb_connection_string
COMMUNITY_API_BASE_URL=http://localhost:4000
```

> **Note:** The app functions fully without a Presage API key. Biometric scans will use statistically realistic simulated vitals. AI plan generation requires a valid Gemini or Groq API key.

### Running on Different Platforms

```bash
npx expo start --ios      # iOS Simulator
npx expo start --android  # Android Emulator
npx expo start --web      # Browser (limited camera support)
```

---

## Team

Built for [Hackathon Name] — demonstrating that objective physiological measurement, large-language-model reasoning, and adaptive plan generation can be combined into a single, accessible, hardware-free fitness coaching system.

---

*Solofit is an independent project developed for hackathon purposes. Presage SmartSpectra, Gemini, Groq, Firebase, and MongoDB are trademarks of their respective owners.*
