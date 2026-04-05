import { GoogleGenerativeAI } from "@google/generative-ai";

import {
	GEMINI_API_KEY,
	GEMINI_API_KEY_BACKUP,
	GROQ_API_KEY,
	GROQ_RECIPE_API_KEY,
	GROQ_FAST_MODEL,
	GROQ_PLAN_MODEL,
	GROQ_RECIPE_MODEL,
} from "@env";
import { EXERCISE_CATALOG } from "../utils/exerciseGifs";

const EXERCISE_NAME_MAP = new Map(
	EXERCISE_CATALOG.map((ex) => [normalizeExerciseName(ex.name), ex.name]),
);

function normalizeExerciseName(name = "") {
	return String(name)
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function getWorkoutBounds(userData) {
	const minPerDay = 2;
	const maxPerDay = 4;
	// Cap the unique-exercise requirement to the number of exercises the user
	// can actually perform. A bodyweight-only user may have fewer than 10
	// qualifying exercises in the 30-item catalog, so requiring 10 would cause
	// every plan — including the deterministic fallback — to fail validation.
	const availableCount = userData
		? EXERCISE_CATALOG.filter((ex) => isExerciseAllowedForUser(ex.name, userData)).length
		: EXERCISE_CATALOG.length;
	const minUniqueWeek = Math.max(4, Math.min(10, availableCount));
	return { minPerDay, maxPerDay, minUniqueWeek };
}

function validateAndNormalizeWorkoutPlan(plan, readiness, userData) {
	if (!plan || typeof plan !== "object") {
		throw new Error("Plan is not a valid object.");
	}

	if (!Array.isArray(plan.workout_plan) || plan.workout_plan.length !== 7) {
		throw new Error("workout_plan must contain exactly 7 days.");
	}

	const { minPerDay, maxPerDay, minUniqueWeek } = getWorkoutBounds(userData);

	const uniqueWeekNames = new Set();
	let recoveryDays = 0;
	let previousDayNames = new Set();

	plan.workout_plan = plan.workout_plan.map((day, dayIdx) => {
		const focusLower = String(day?.focus || "").toLowerCase();
		const isRecoveryDay =
			focusLower.includes("recovery") ||
			focusLower.includes("rest") ||
			focusLower.includes("mobility") ||
			focusLower.includes("stretch");

		if (isRecoveryDay) recoveryDays += 1;

		if (!Array.isArray(day?.exercises)) {
			throw new Error(`Day ${dayIdx + 1} is missing an exercises array.`);
		}

		if (day.exercises.length < minPerDay || day.exercises.length > maxPerDay) {
			throw new Error(
				`Day ${dayIdx + 1} must contain ${minPerDay}-${maxPerDay} exercises, got ${day.exercises.length}.`,
			);
		}

		const namesInDay = new Set();
		const normalizedExercises = day.exercises.map((ex, exIdx) => {
			const normalized = normalizeExerciseName(ex?.name);
			const canonicalName = EXERCISE_NAME_MAP.get(normalized);

			if (!canonicalName) {
				throw new Error(
					`Day ${dayIdx + 1}, exercise ${exIdx + 1} uses unknown exercise: "${ex?.name}".`,
				);
			}

			if (namesInDay.has(canonicalName)) {
				throw new Error(
					`Day ${dayIdx + 1} has duplicate exercise "${canonicalName}".`,
				);
			}

			if (previousDayNames.has(canonicalName)) {
				throw new Error(
					`Day ${dayIdx + 1} repeats "${canonicalName}" from the previous day. Consecutive-day repeats are not allowed.`,
				);
			}
			namesInDay.add(canonicalName);

			uniqueWeekNames.add(canonicalName);

			return {
				...ex,
				name: canonicalName,
			};
		});

		previousDayNames = new Set(normalizedExercises.map((ex) => ex.name));

		return {
			...day,
			exercises: normalizedExercises,
		};
	});

	if (recoveryDays > 2) {
		throw new Error(
			`workout_plan has too many recovery/rest days (${recoveryDays}). Max allowed is 2.`,
		);
	}

	if (uniqueWeekNames.size < minUniqueWeek) {
		throw new Error(
			`workout_plan has low variety: ${uniqueWeekNames.size} unique exercises, need at least ${minUniqueWeek}.`,
		);
	}

	return plan;
}

function buildRepairPrompt(
	previousJson,
	validationError,
	userData,
	presageData,
	readiness,
) {
	const catalogLines = EXERCISE_CATALOG.map((ex) => `- ${ex.name}`).join("\n");
	const compactJson = JSON.stringify(previousJson).slice(0, 2200);

	return `You generated an invalid workout plan JSON. Repair it and return strict JSON only.

Validation error:
${validationError}

User data:
${JSON.stringify(userData, null, 2)}

Vitals:
${JSON.stringify(presageData, null, 2)}

Readiness:
${JSON.stringify(readiness, null, 2)}

Current invalid JSON:
${compactJson}${JSON.stringify(previousJson).length > compactJson.length ? "...(truncated)" : ""}

Hard rules:
- Keep the same output schema.
- workout_plan must have exactly 7 days.
- Each day must have 2-4 exercises.
- No duplicate exercise names inside the same day.
- No exercise can repeat on consecutive days.
- Keep high variety across the week.
- Exercise names must be EXACT matches from the list below only.

Allowed exercises (exact names):
${catalogLines}`;
}

function summarizeUserData(userData) {
	return {
		age: userData?.age,
		goals: userData?.goals || [],
		activityLevel: userData?.activityLevel,
		dietType: userData?.dietType,
		allergies: userData?.allergies || [],
		healthIssues: userData?.healthIssues || [],
		equipment: userData?.equipment || [],
		budget: userData?.budget,
		cuisine: userData?.cuisine,
	};
}

function buildCompactGroqPrompt(userData, presageData, readiness) {
	const exerciseNames = EXERCISE_CATALOG.map((ex) => ex.name).join(" | ");
	const summaryUser = summarizeUserData(userData);

	return `Return ONLY valid JSON. No markdown.

Create a 7-day fitness + diet plan.

User: ${JSON.stringify(summaryUser)}
Vitals: ${JSON.stringify(presageData)}
Readiness: ${JSON.stringify(readiness)}

Workout rules:
- 7 days exactly
- exactly 2-4 exercises/day
- adjust volume using activity level (sedentary/light lower, active/athlete higher)
- no duplicate exercise names in a day
- no repeated exercise names on consecutive days
- avoid movements likely to aggravate health issues
- respect available equipment strictly (if none, prefer bodyweight-friendly options)
- use ONLY exact names from this list:
${exerciseNames}

Diet rules:
- never include allergies
- include 2 alternatives per meal

JSON shape:
{"workout_plan":[{"day":"Day 1","focus":"string","exercises":[{"name":"string","sets":number,"reps":"string","rest":"string","notes":"string"}],"duration_minutes":number}],"diet_plan":{"daily_meals":[{"meal":"Breakfast","primary":{"name":"string","calories":number,"protein":number,"carbs":number,"fat":number},"alternatives":[{"name":"string","calories":number,"protein":number,"carbs":number,"fat":number}]}]},"calories":number,"macros":{"protein":number,"carbs":number,"fat":number},"hydration_liters":number,"tips":["string"],"risk_notes":["string"]}`;
}

function buildCompactRepairPrompt(
	previousJson,
	validationError,
	userData,
	presageData,
	readiness,
) {
	const exerciseNames = EXERCISE_CATALOG.map((ex) => ex.name).join(" | ");
	const compactJson = JSON.stringify(previousJson).slice(0, 1800);

	return `Fix this JSON plan and return ONLY valid JSON.
Validation error: ${validationError}
User: ${JSON.stringify(summarizeUserData(userData))}
Vitals: ${JSON.stringify(presageData)}
Readiness: ${JSON.stringify(readiness)}
Current plan: ${compactJson}${JSON.stringify(previousJson).length > compactJson.length ? "...(truncated)" : ""}
Use ONLY these exercise names: ${exerciseNames}
Hard rules: 7 days, 2-4 exercises/day, no duplicates in a day, no consecutive-day repeats, preserve schema.`;
}

function buildParseRecoveryPrompt(userData, presageData, readiness, reason) {
	return `Your previous output was invalid JSON (${reason}). Regenerate from scratch.
Return ONLY valid JSON. No markdown. No extra text.

User: ${JSON.stringify(summarizeUserData(userData))}
Vitals: ${JSON.stringify(presageData)}
Readiness: ${JSON.stringify(readiness)}

Rules:
- exactly 7 workout days
- each day must have 2-4 exercises
- no duplicate exercises in the same day
- no repeated exercises on consecutive days
- include diet_plan with exactly Breakfast, Lunch, Dinner
- include 2 alternatives per meal
- keep schema and numeric fields valid

Schema:
{"workout_plan":[{"day":"Day 1","focus":"string","exercises":[{"name":"string","sets":number,"reps":"string","rest":"string","notes":"string"}],"duration_minutes":number}],"diet_plan":{"daily_meals":[{"meal":"Breakfast","primary":{"name":"string","calories":number,"protein":number,"carbs":number,"fat":number},"alternatives":[{"name":"string","calories":number,"protein":number,"carbs":number,"fat":number}]}]},"calories":number,"macros":{"protein":number,"carbs":number,"fat":number},"hydration_liters":number,"tips":["string"],"risk_notes":["string"]}`;
}

function asNumber(value, fallback = 0) {
	const num = Number(value);
	return Number.isFinite(num) ? num : fallback;
}

function normalizeMealOption(option, fallbackName, fallbackCalories) {
	return {
		name: String(option?.name || fallbackName),
		calories: Math.max(0, Math.round(asNumber(option?.calories, fallbackCalories))),
		protein: Math.max(0, Math.round(asNumber(option?.protein, 20))),
		carbs: Math.max(0, Math.round(asNumber(option?.carbs, 35))),
		fat: Math.max(0, Math.round(asNumber(option?.fat, 12))),
	};
}

function buildFallbackMeal(mealName, userData, baseCalories) {
	const cuisine = userData?.cuisine || "Balanced";
	const diet = userData?.dietType && userData.dietType !== "none"
		? ` (${userData.dietType})`
		: "";

	const primaryName = `${cuisine} ${mealName}${diet}`;
	const altA = `${mealName} Alt A${diet}`;
	const altB = `${mealName} Alt B${diet}`;

	return {
		meal: mealName,
		primary: normalizeMealOption(null, primaryName, baseCalories),
		alternatives: [
			normalizeMealOption(null, altA, Math.max(200, baseCalories - 40)),
			normalizeMealOption(null, altB, Math.max(200, baseCalories - 20)),
		],
	};
}

function normalizeAndEnsureDietPlan(plan, userData) {
	const expectedMeals = ["Breakfast", "Lunch", "Dinner"];
	const inputMeals = Array.isArray(plan?.diet_plan?.daily_meals)
		? plan.diet_plan.daily_meals
		: [];

	const baseCalories = Math.max(1200, Math.round(asNumber(plan?.calories, 2100)));
	const mealCalories = {
		Breakfast: Math.round(baseCalories * 0.3),
		Lunch: Math.round(baseCalories * 0.35),
		Dinner: Math.round(baseCalories * 0.35),
	};

	const normalizedMeals = expectedMeals.map((name) => {
		const existing = inputMeals.find(
			(m) => String(m?.meal || "").toLowerCase() === name.toLowerCase(),
		);

		if (!existing) {
			return buildFallbackMeal(name, userData, mealCalories[name]);
		}

		const primary = normalizeMealOption(
			existing.primary,
			`${name} Primary`,
			mealCalories[name],
		);

		const alts = Array.isArray(existing.alternatives)
			? existing.alternatives.slice(0, 2)
			: [];

		while (alts.length < 2) {
			alts.push({
				name: `${name} Alternative ${alts.length + 1}`,
				calories: Math.max(200, mealCalories[name] - 20 * (alts.length + 1)),
				protein: 20,
				carbs: 30,
				fat: 12,
			});
		}

		return {
			meal: name,
			primary,
			alternatives: alts.map((a, idx) =>
				normalizeMealOption(
					a,
					`${name} Alternative ${idx + 1}`,
					Math.max(200, mealCalories[name] - 20 * (idx + 1)),
				),
			),
		};
	});

	const totalCalories = normalizedMeals.reduce(
		(acc, m) => acc + asNumber(m.primary?.calories, 0),
		0,
	);
	const macros = {
		protein: normalizedMeals.reduce(
			(acc, m) => acc + asNumber(m.primary?.protein, 0),
			0,
		),
		carbs: normalizedMeals.reduce(
			(acc, m) => acc + asNumber(m.primary?.carbs, 0),
			0,
		),
		fat: normalizedMeals.reduce(
			(acc, m) => acc + asNumber(m.primary?.fat, 0),
			0,
		),
	};

	return {
		...plan,
		diet_plan: {
			...plan?.diet_plan,
			daily_meals: normalizedMeals,
		},
		calories: Math.max(1200, Math.round(asNumber(plan?.calories, totalCalories))),
		macros: {
			protein: Math.max(0, Math.round(asNumber(plan?.macros?.protein, macros.protein))),
			carbs: Math.max(0, Math.round(asNumber(plan?.macros?.carbs, macros.carbs))),
			fat: Math.max(0, Math.round(asNumber(plan?.macros?.fat, macros.fat))),
		},
		hydration_liters: Math.max(
			1.5,
			Math.min(5, asNumber(plan?.hydration_liters, 2.5)),
		),
		tips: Array.isArray(plan?.tips) ? plan.tips : [],
		risk_notes: Array.isArray(plan?.risk_notes) ? plan.risk_notes : [],
	};
}

function closeJsonDelimiters(text) {
	const stack = [];
	let inString = false;
	let escaped = false;

	for (const ch of String(text || "")) {
		if (inString) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (ch === "\\") {
				escaped = true;
				continue;
			}
			if (ch === '"') {
				inString = false;
			}
			continue;
		}

		if (ch === '"') {
			inString = true;
			continue;
		}

		if (ch === "{" || ch === "[") {
			stack.push(ch === "{" ? "}" : "]");
			continue;
		}

		if (ch === "}" || ch === "]") {
			if (stack.length && stack[stack.length - 1] === ch) {
				stack.pop();
			}
		}
	}

	let out = String(text || "").trimEnd();
	if (inString) out += '"';

	while (stack.length) {
		out += stack.pop();
	}

	return out;
}

function parsePossiblyTruncatedJSON(text) {
	const normalized = String(text || "")
		.replace(/```json\n?/g, "")
		.replace(/```\n?/g, "")
		.trim();

	const firstBrace = normalized.indexOf("{");
	if (firstBrace < 0) {
		throw new Error("No JSON object start found in model output.");
	}

	let candidate = normalized.slice(firstBrace);
	if (!candidate) {
		throw new Error("Empty JSON candidate after trimming model output.");
	}

	candidate = closeJsonDelimiters(candidate)
		.replace(/,\s*([}\]])/g, "$1")
		.replace(/\u0000/g, "")
		.trim();

	return JSON.parse(candidate);
}

function buildDeterministicFallbackPlan(userData, readiness, basePlan = {}) {
	const readinessScore = Number(readiness?.readiness_score ?? 50);
	const calories = Math.max(1700, readinessScore >= 75 ? 2400 : readinessScore >= 45 ? 2150 : 1950);

	const plan = {
		...basePlan,
		workout_plan: buildFallbackWorkoutPlan(basePlan, readiness, userData),
		diet_plan: {
			daily_meals: [],
		},
		calories,
		macros: {
			protein: Math.round(calories * 0.3 / 4),
			carbs: Math.round(calories * 0.42 / 4),
			fat: Math.round(calories * 0.28 / 9),
		},
		hydration_liters: readinessScore >= 75 ? 3.0 : readinessScore >= 45 ? 2.6 : 2.3,
		tips: [
			"Prioritize controlled reps and clean form over speed.",
			"Progress gradually each week only when recovery feels good.",
		],
		risk_notes: Array.isArray(basePlan?.risk_notes) ? basePlan.risk_notes : [],
	};

	return normalizeAndEnsureDietPlan(plan, userData);
}

const DEFAULT_WORKOUT_FOCUSES = [
	"Upper Body Strength",
	"Lower Body Strength",
	"Core and Conditioning",
	"Push Focus",
	"Pull Focus",
	"Full Body Endurance",
	"Mobility and Recovery",
];

function scoreExerciseForFocus(exercise, focusLower) {
	const haystack = [
		exercise?.name,
		...(exercise?.muscles || []),
		...(exercise?.bodyParts || []),
		...(exercise?.equipment || []),
	]
		.join(" ")
		.toLowerCase();

	let score = 0;
	const focusWords = focusLower
		.split(/[^a-z0-9]+/)
		.filter((w) => w.length > 2);

	for (const word of focusWords) {
		if (haystack.includes(word)) score += 2;
	}

	if (focusLower.includes("upper") && /chest|shoulder|back|arm/.test(haystack)) {
		score += 3;
	}
	if (focusLower.includes("lower") && /leg|glute|quad|hamstring|calf/.test(haystack)) {
		score += 3;
	}
	if (focusLower.includes("core") && /core|abs|oblique/.test(haystack)) {
		score += 3;
	}
	if (focusLower.includes("push") && /chest|shoulder|tricep/.test(haystack)) {
		score += 3;
	}
	if (focusLower.includes("pull") && /back|bicep|forearm/.test(haystack)) {
		score += 3;
	}
	if (
		focusLower.includes("recovery") &&
		/mobility|stretch|core|calf|bodyweight/.test(haystack)
	) {
		score += 4;
	}

	return score;
}

const ACTIVITY_COUNT_ADJUST = {
	sedentary: -1,
	light: 0,
	moderate: 1,
	active: 1,
	athlete: 2,
};

const GOAL_FOCUS_SEQUENCES = {
	build_muscle: [
		"Upper Body Hypertrophy",
		"Lower Body Strength",
		"Pull Strength",
		"Push Strength",
		"Leg Hypertrophy",
		"Core and Conditioning",
		"Mobility and Recovery",
	],
	lose_weight: [
		"Full Body Conditioning",
		"Lower Body Endurance",
		"Upper Body Circuits",
		"Core and Cardio",
		"Push and Pull Mix",
		"Metabolic Full Body",
		"Mobility and Recovery",
	],
	improve_endurance: [
		"Conditioning Base",
		"Leg Endurance",
		"Upper Body Endurance",
		"Core and Stability",
		"Full Body Circuits",
		"Aerobic Strength Mix",
		"Mobility and Recovery",
	],
	default: DEFAULT_WORKOUT_FOCUSES,
};

function sanitizeGoals(goals = []) {
	return new Set((Array.isArray(goals) ? goals : []).map((g) => String(g)));
}

function resolveFocusSequence(incomingDays = [], goals = []) {
	const goalSet = sanitizeGoals(goals);
	let base = GOAL_FOCUS_SEQUENCES.default;

	if (goalSet.has("build_muscle")) {
		base = GOAL_FOCUS_SEQUENCES.build_muscle;
	} else if (goalSet.has("lose_weight")) {
		base = GOAL_FOCUS_SEQUENCES.lose_weight;
	} else if (goalSet.has("improve_endurance")) {
		base = GOAL_FOCUS_SEQUENCES.improve_endurance;
	}

	if (goalSet.has("gain_flexibility") || goalSet.has("reduce_stress")) {
		base = [...base];
		base[5] = "Mobility and Core Stability";
		base[6] = "Recovery, Stretching and Breathwork";
	}

	return base.map((fallbackFocus, idx) => {
		const incomingFocus = String(incomingDays?.[idx]?.focus || "").trim();
		return incomingFocus || fallbackFocus;
	});
}

function normalizeEquipmentSelection(equipment) {
	const list = Array.isArray(equipment)
		? equipment.map((e) => String(e).toLowerCase())
		: [];

	if (list.length === 0) {
		return { mode: "unrestricted", set: new Set() };
	}

	const withoutNone = list.filter((e) => e !== "none");
	if (withoutNone.length === 0) {
		return { mode: "bodyweight_only", set: new Set() };
	}

	return { mode: "restricted", set: new Set(withoutNone) };
}

function inferExerciseRequirements(exerciseName) {
	const lower = String(exerciseName || "").toLowerCase();
	const requirements = new Set();

	if (/\bcable\b|\blever\b|\bsmith\b|\bsled\b|\bhack\b/.test(lower)) {
		requirements.add("full_gym");
	}
	if (/\bdumbbell\b/.test(lower)) requirements.add("dumbbells");
	if (/\bbarbell\b/.test(lower)) requirements.add("barbell");
	if (/\bkettlebell\b/.test(lower)) requirements.add("kettlebell");
	if (/\bbench\b/.test(lower)) requirements.add("bench");
	if (/\bhanging\b|pull[ -]?up/.test(lower)) requirements.add("pull_up_bar");

	return [...requirements];
}

function isExerciseAllowedByEquipment(exerciseName, equipmentSelection) {
	const requirements = inferExerciseRequirements(exerciseName);
	if (equipmentSelection.mode === "unrestricted") return true;
	if (equipmentSelection.set.has("full_gym")) return true;

	if (equipmentSelection.mode === "bodyweight_only") {
		return requirements.length === 0;
	}

	if (requirements.length === 0) return true;
	return requirements.every((req) => equipmentSelection.set.has(req));
}

function buildHealthRestrictionPatterns(healthIssues = []) {
	const list = Array.isArray(healthIssues)
		? healthIssues.map((i) => String(i).toLowerCase())
		: [];

	const patterns = [];
	if (list.some((i) => i.includes("knee") || i.includes("ankle") || i.includes("hip"))) {
		patterns.push(/pistol squat|leg press|sled|hack|calf raise|standing rocking/i);
	}
	if (list.some((i) => i.includes("shoulder") || i.includes("neck"))) {
		patterns.push(/front raise|upright row|bench press|fly|dips|overhead/i);
	}
	if (list.some((i) => i.includes("wrist"))) {
		patterns.push(/wrist curl|reverse wrist|standing close grip curl/i);
	}
	if (list.some((i) => i.includes("lower back"))) {
		patterns.push(/hyperextension|side bend|rocking leg calf raise|leg press/i);
	}

	return patterns;
}

function isExerciseBlockedByHealth(exerciseName, healthPatterns) {
	if (!healthPatterns.length) return false;
	const name = String(exerciseName || "");
	return healthPatterns.some((pattern) => pattern.test(name));
}

function isExerciseAllowedForUser(exerciseName, userData) {
	const equipmentSelection = normalizeEquipmentSelection(userData?.equipment);
	const healthPatterns = buildHealthRestrictionPatterns(userData?.healthIssues);

	if (!isExerciseAllowedByEquipment(exerciseName, equipmentSelection)) return false;
	if (isExerciseBlockedByHealth(exerciseName, healthPatterns)) return false;
	return true;
}

function buildFallbackExerciseTemplate(
	readinessScore,
	isRecoveryDay,
	goals = [],
	activityLevel = "moderate",
) {
	const goalSet = sanitizeGoals(goals);

	if (isRecoveryDay) {
		return {
			sets: 2,
			reps: "10-12",
			rest: "45s",
			notes: "Controlled form. Keep effort light and comfortable.",
		};
	}

	if (goalSet.has("improve_endurance") || goalSet.has("lose_weight")) {
		return {
			sets: activityLevel === "athlete" ? 4 : 3,
			reps: "12-18",
			rest: "45s",
			notes: "Keep pace steady to build conditioning.",
		};
	}

	if (goalSet.has("build_muscle")) {
		return {
			sets: readinessScore >= 75 ? 4 : 3,
			reps: "8-12",
			rest: "75s",
			notes: "Prioritize progressive overload with strict form.",
		};
	}

	if (readinessScore >= 75) {
		return {
			sets: 4,
			reps: "8-12",
			rest: "60s",
			notes: "Push intensity with strict form.",
		};
	}

	if (readinessScore >= 45) {
		return {
			sets: 3,
			reps: "10-15",
			rest: "60s",
			notes: "Steady pace and clean technique.",
		};
	}

	return {
		sets: 2,
		reps: "12-15",
		rest: "75s",
		notes: "Moderate intensity and controlled tempo.",
	};
}

function getTargetExerciseCount(
	readinessScore,
	activityLevel,
	isRecoveryDay,
	minPerDay,
	maxPerDay,
	preferredCount,
) {
	const minForDay = isRecoveryDay ? Math.max(2, minPerDay - 1) : minPerDay;
	const baseline = readinessScore >= 75 ? 5 : readinessScore >= 45 ? 4 : 3;
	const base = Number.isFinite(preferredCount) && preferredCount > 0
		? Math.round(preferredCount)
		: baseline;
	const activityAdjust = ACTIVITY_COUNT_ADJUST[activityLevel] || 0;

	let target = base + activityAdjust;
	if (isRecoveryDay) target = Math.min(target, minForDay + 1);

	return Math.max(minForDay, Math.min(maxPerDay, target));
}

function getTargetDurationMinutes(readinessScore, activityLevel, isRecoveryDay, existingDuration) {
	if (Number.isFinite(existingDuration) && existingDuration > 0) {
		return Math.max(20, Math.min(75, Math.round(existingDuration)));
	}

	const base = isRecoveryDay ? 30 : readinessScore >= 75 ? 50 : readinessScore >= 45 ? 42 : 35;
	const adjust = {
		sedentary: -8,
		light: -4,
		moderate: 0,
		active: 6,
		athlete: 10,
	}[activityLevel] || 0;

	return Math.max(20, Math.min(75, base + adjust));
}

function selectExercisesForDay(
	focus,
	targetCount,
	weekFrequency,
	dayIndex,
	userData = {},
	previousDayNames = new Set(),
) {
	const focusLower = String(focus || "").toLowerCase();
	const rankedAll = EXERCISE_CATALOG.map((ex, idx) => ({
		name: ex.name,
		score: scoreExerciseForFocus(ex, focusLower),
		idx,
	})).sort((a, b) => b.score - a.score || a.idx - b.idx);

	const ranked = rankedAll.filter((candidate) =>
		isExerciseAllowedForUser(candidate.name, userData),
	);
	const sourceRanked = ranked.length > 0 ? ranked : rankedAll;

	const selected = [];
	const selectedNames = new Set();

	const pushIfAllowed = (candidate) => {
		if (selected.length >= targetCount) return;
		if (selectedNames.has(candidate.name)) return;
		if (previousDayNames.has(candidate.name)) return;
		selected.push(candidate.name);
		selectedNames.add(candidate.name);
		weekFrequency.set(candidate.name, (weekFrequency.get(candidate.name) || 0) + 1);
	};

	for (let i = 0; i < sourceRanked.length; i += 1) {
		const candidate = sourceRanked[(i + dayIndex) % sourceRanked.length];
		if (candidate.score <= 0) continue;
		pushIfAllowed(candidate);
	}

	for (let i = 0; i < sourceRanked.length; i += 1) {
		const candidate = sourceRanked[(i + dayIndex * 2) % sourceRanked.length];
		pushIfAllowed(candidate);
	}

	if (selected.length < targetCount) {
		for (const candidate of sourceRanked) {
			if (selected.length >= targetCount) break;
			if (selectedNames.has(candidate.name)) continue;
			pushIfAllowed(candidate);
		}
	}

	if (selected.length < targetCount) {
		for (const candidate of rankedAll) {
			if (selected.length >= targetCount) break;
			if (selectedNames.has(candidate.name)) continue;
			if (previousDayNames.has(candidate.name)) continue;
			selected.push(candidate.name);
			selectedNames.add(candidate.name);
		}
	}

	return selected.slice(0, targetCount);
}

function buildFallbackWorkoutPlan(originalPlan, readiness, userData = {}) {
	const score = readiness?.readiness_score ?? 50;
	const activityLevel = String(userData?.activityLevel || "moderate");
	const { minPerDay, maxPerDay } = getWorkoutBounds(userData);
	const weekFrequency = new Map();
	let previousDayNames = new Set();
	const incomingDays = Array.isArray(originalPlan?.workout_plan)
		? originalPlan.workout_plan
		: [];

	const focuses = resolveFocusSequence(incomingDays, userData?.goals);

	return focuses.map((focus, dayIdx) => {
		const focusLower = focus.toLowerCase();
		const isRecoveryDay =
			focusLower.includes("recovery") ||
			focusLower.includes("rest") ||
			focusLower.includes("mobility") ||
			focusLower.includes("stretch");

		const targetCount = getTargetExerciseCount(
			score,
			activityLevel,
			isRecoveryDay,
			minPerDay,
			maxPerDay,
			Number(incomingDays?.[dayIdx]?.exercises?.length),
		);

		const names = selectExercisesForDay(
			focus,
			targetCount,
			weekFrequency,
			dayIdx,
			userData,
			previousDayNames,
		);

		previousDayNames = new Set(names);

		const template = buildFallbackExerciseTemplate(
			score,
			isRecoveryDay,
			userData?.goals,
			activityLevel,
		);
		const existingDuration = Number(incomingDays?.[dayIdx]?.duration_minutes);

		return {
			day: `Day ${dayIdx + 1}`,
			focus,
			exercises: names.map((name) => ({
				name,
				sets: template.sets,
				reps: template.reps,
				rest: template.rest,
				notes: template.notes,
			})),
			duration_minutes: getTargetDurationMinutes(
				score,
				activityLevel,
				isRecoveryDay,
				existingDuration,
			),
		};
	});
}

function tuneWorkoutPlanForUser(plan, userData, readiness) {
	if (!Array.isArray(plan?.workout_plan) || plan.workout_plan.length === 0) {
		return plan;
	}

	const score = readiness?.readiness_score ?? 50;
	const activityLevel = String(userData?.activityLevel || "moderate");
	const { minPerDay, maxPerDay } = getWorkoutBounds(userData);
	const weekFrequency = new Map();
	let previousDayNames = new Set();

	const tunedWorkout = plan.workout_plan.map((day, dayIdx) => {
		const focus = String(day?.focus || DEFAULT_WORKOUT_FOCUSES[dayIdx] || "Workout");
		const focusLower = focus.toLowerCase();
		const isRecoveryDay =
			focusLower.includes("recovery") ||
			focusLower.includes("rest") ||
			focusLower.includes("mobility") ||
			focusLower.includes("stretch");

		const rawExercises = Array.isArray(day?.exercises) ? day.exercises : [];
		const targetCount = getTargetExerciseCount(
			score,
			activityLevel,
			isRecoveryDay,
			minPerDay,
			maxPerDay,
			Number(rawExercises.length),
		);

		const names = [];
		const nameSet = new Set();

		for (const ex of rawExercises) {
			const canonicalName = EXERCISE_NAME_MAP.get(normalizeExerciseName(ex?.name));
			if (!canonicalName) continue;
			if (nameSet.has(canonicalName)) continue;
			if (previousDayNames.has(canonicalName)) continue;
			if (!isExerciseAllowedForUser(canonicalName, userData)) continue;

			names.push(canonicalName);
			nameSet.add(canonicalName);
			weekFrequency.set(canonicalName, (weekFrequency.get(canonicalName) || 0) + 1);
			if (names.length >= targetCount) break;
		}

		if (names.length < targetCount) {
			const generated = selectExercisesForDay(
				focus,
				targetCount,
				weekFrequency,
				dayIdx,
				userData,
				previousDayNames,
			);

			for (const name of generated) {
				if (names.length >= targetCount) break;
				if (nameSet.has(name)) continue;
				names.push(name);
				nameSet.add(name);
			}
		}

		const template = buildFallbackExerciseTemplate(
			score,
			isRecoveryDay,
			userData?.goals,
			activityLevel,
		);

		const normalizedExercises = names.map((name) => {
			const source = rawExercises.find(
				(ex) => EXERCISE_NAME_MAP.get(normalizeExerciseName(ex?.name)) === name,
			);

			const parsedSets = Number(source?.sets);
			return {
				name,
				sets:
					Number.isFinite(parsedSets) && parsedSets > 0
						? Math.round(parsedSets)
						: template.sets,
				reps: String(source?.reps || template.reps),
				rest: String(source?.rest || template.rest),
				notes: String(source?.notes || template.notes),
			};
		});

		const dayPlan = {
			...day,
			day: `Day ${dayIdx + 1}`,
			focus,
			exercises: normalizedExercises,
			duration_minutes: getTargetDurationMinutes(
				score,
				activityLevel,
				isRecoveryDay,
				Number(day?.duration_minutes),
			),
		};

		previousDayNames = new Set(dayPlan.exercises.map((ex) => ex.name));
		return dayPlan;
	});

	return {
		...plan,
		workout_plan: tunedWorkout,
	};
}

const GEMINI_KEYS = [GEMINI_API_KEY, GEMINI_API_KEY_BACKUP].filter(
	(key) => key && !String(key).startsWith("YOUR_"),
);

const DEFAULT_GROQ_FAST_MODEL = "llama-3.1-8b-instant";
const DEFAULT_GROQ_PLAN_MODEL = "openai/gpt-oss-120b";
const DEFAULT_GROQ_RECIPE_MODEL = "llama-3.1-8b-instant";
const DEFAULT_GROQ_TIMEOUT_MS = 45000;

function resolveModelName(envValue, fallbackModel) {
	if (!envValue || String(envValue).startsWith("YOUR_")) {
		return fallbackModel;
	}
	return String(envValue);
}

const GROQ_MODELS = {
	fast: resolveModelName(GROQ_FAST_MODEL, DEFAULT_GROQ_FAST_MODEL),
	plan: resolveModelName(GROQ_PLAN_MODEL, DEFAULT_GROQ_PLAN_MODEL),
	recipe: resolveModelName(GROQ_RECIPE_MODEL, DEFAULT_GROQ_RECIPE_MODEL),
};

async function callGeminiWithKey(prompt, apiKey) {
	const client = new GoogleGenerativeAI(apiKey);
	const model = client.getGenerativeModel({
		model: "gemini-2.5-flash",
		generationConfig: {
			temperature: 0.5,
			topP: 0.9,
		},
	});
	const result = await model.generateContent(prompt);
	const response = await result.response;
	return response.text();
}

// --- Groq fallback (OpenAI-compatible API) ---
function assertGroqKey(apiKey, keyName) {
	if (!apiKey || String(apiKey).startsWith("YOUR_")) {
		throw new Error(`${keyName} is missing.`);
	}
}

async function callGroqChat({
	apiKey,
	keyName,
	prompt,
	purpose,
	model,
	temperature = 0.3,
	maxTokens = 900,
	jsonMode = false,
	systemInstruction,
	timeoutMs = DEFAULT_GROQ_TIMEOUT_MS,
}) {
	assertGroqKey(apiKey, keyName);

	const startedAt = Date.now();
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	const messages = [
		...(systemInstruction
			? [{ role: "system", content: systemInstruction }]
			: []),
		{ role: "user", content: prompt },
	];

	const payload = {
		model,
		messages,
		temperature,
		max_completion_tokens: maxTokens,
	};

	if (jsonMode) {
		payload.response_format = { type: "json_object" };
	}

	try {
		const response = await fetch(
			"https://api.groq.com/openai/v1/chat/completions",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
				signal: controller.signal,
			},
		);

		if (!response.ok) {
			const err = await response.text();
			throw new Error(`Groq API error: ${response.status} ${err}`);
		}

		const data = await response.json();
		const latencyMs = Date.now() - startedAt;
		console.log(
			`[AI] Groq ${purpose} model=${model} latency=${latencyMs}ms`,
		);

		return data?.choices?.[0]?.message?.content || "";
	} catch (error) {
		if (error?.name === "AbortError") {
			throw new Error(`Groq ${purpose} request timed out after ${timeoutMs}ms`);
		}
		throw error;
	} finally {
		clearTimeout(timeoutId);
	}
}

async function callGroqPlan(prompt, options = {}) {
	return await callGroqChat({
		apiKey: GROQ_API_KEY,
		keyName: "GROQ_API_KEY",
		prompt,
		purpose: "plan",
		model: options.model || GROQ_MODELS.plan,
		temperature: options.temperature ?? 0.35,
		maxTokens: options.maxTokens ?? 1700,
		jsonMode: options.jsonMode ?? false,
		timeoutMs: options.timeoutMs ?? DEFAULT_GROQ_TIMEOUT_MS,
	});
}

async function callGroqFast(prompt, options = {}) {
	return await callGroqChat({
		apiKey: GROQ_API_KEY,
		keyName: "GROQ_API_KEY",
		prompt,
		purpose: "fast",
		model: options.model || GROQ_MODELS.fast,
		temperature: options.temperature ?? 0.2,
		maxTokens: options.maxTokens ?? 650,
		jsonMode: options.jsonMode ?? false,
		systemInstruction: options.systemInstruction,
		timeoutMs: options.timeoutMs ?? DEFAULT_GROQ_TIMEOUT_MS,
	});
}

async function callGroqRecipe(prompt, options = {}) {
	return await callGroqChat({
		apiKey: GROQ_RECIPE_API_KEY,
		keyName: "GROQ_RECIPE_API_KEY",
		prompt,
		purpose: "recipe",
		model: options.model || GROQ_MODELS.recipe,
		temperature: options.temperature ?? 0.15,
		maxTokens: options.maxTokens ?? 850,
		jsonMode: options.jsonMode ?? true,
		systemInstruction:
			options.systemInstruction ||
			"Return only valid JSON. No markdown. No extra text.",
		timeoutMs: options.timeoutMs ?? DEFAULT_GROQ_TIMEOUT_MS,
	});
}

function buildRecipePrompt(meal, userData) {
	const mealSummary = {
		name: String(meal?.name || "meal"),
		calories: Number.isFinite(Number(meal?.calories))
			? Math.round(Number(meal.calories))
			: undefined,
		protein: Number.isFinite(Number(meal?.protein))
			? Math.round(Number(meal.protein))
			: undefined,
		carbs: Number.isFinite(Number(meal?.carbs))
			? Math.round(Number(meal.carbs))
			: undefined,
		fat: Number.isFinite(Number(meal?.fat))
			? Math.round(Number(meal.fat))
			: undefined,
	};

	return `Return ONLY valid JSON.
Output must be exactly:
{"title":"string","ingredients":["string"],"steps":["string"],"notes":["string"]}

Meal:
${JSON.stringify(mealSummary)}

Constraints:
- Diet type: ${userData?.dietType || "no preference"}
- Allergens to avoid strictly: ${(userData?.allergies || []).join(", ") || "none"}
- Budget: ${userData?.budget || "medium"}
- Cuisine: ${userData?.cuisine || "any"}

Rules:
- Recipe must match meal name and macros.
- 5 to 10 ingredients.
- 4 to 8 concise cooking steps.
- Never include listed allergens.
- No markdown, no prose outside JSON.`;
}

function buildRecipeRetryPrompt(meal, userData) {
	return `Return one compact recipe as valid JSON only.
Schema: {"title":"string","ingredients":["string"],"steps":["string"],"notes":["string"]}
Meal name: ${String(meal?.name || "meal")}
Diet type: ${userData?.dietType || "no preference"}
Allergens to avoid: ${(userData?.allergies || []).join(", ") || "none"}
No markdown. No explanations.`;
}

function buildRecipeJsonRepairPrompt(rawText, meal, userData) {
	return `Convert the following text into VALID JSON only.
Return exactly this shape:
{"title":"string","ingredients":["string"],"steps":["string"],"notes":["string"]}

Meal item context:
${JSON.stringify(meal || {}, null, 2)}

User context:
${JSON.stringify(
		{
			dietType: userData?.dietType || "no preference",
			allergies: userData?.allergies || [],
			budget: userData?.budget || "medium",
			cuisine: userData?.cuisine || "any",
		},
		null,
		2,
	)}

If the text is truncated or malformed, complete it with a realistic recipe for the same meal and constraints.

TEXT:
${String(rawText || "")}`;
}

function normalizeRecipeOutput(recipe, meal) {
	const mealName = String(meal?.name || "meal");
	const normalized = {
		title: String(recipe?.title || `${mealName} recipe`),
		ingredients: Array.isArray(recipe?.ingredients)
			? recipe.ingredients.filter(Boolean).map((i) => String(i))
			: [],
		steps: Array.isArray(recipe?.steps)
			? recipe.steps.filter(Boolean).map((s) => String(s))
			: [],
		notes: Array.isArray(recipe?.notes)
			? recipe.notes.filter(Boolean).map((n) => String(n))
			: [],
	};

	if (normalized.ingredients.length === 0) {
		normalized.ingredients = [
			`1 serving ${mealName}`,
			"Salt and pepper to taste",
			"1 tbsp cooking oil",
		];
	}

	if (normalized.steps.length === 0) {
		normalized.steps = [
			`Prepare ingredients for ${mealName}.`,
			"Cook over medium heat until done.",
			"Plate and serve warm.",
		];
	}

	return normalized;
}

// --- Prompt builder ---
function buildPrompt(userData, presageData, readiness) {
	const catalogLines = EXERCISE_CATALOG.map(
		(ex) =>
			`  - "${ex.name}" (targets: ${ex.muscles.join(", ")}; body parts: ${ex.bodyParts.join(", ")})`,
	).join("\n");

	return `You are an expert fitness coach, physiotherapist, and nutritionist.

Generate a personalized plan based on:

USER DATA:
${JSON.stringify(userData, null, 2)}

REAL-TIME BODY DATA:
${JSON.stringify(presageData, null, 2)}

READINESS SCORE: ${readiness?.readiness_score ?? "N/A"}/100
RECOMMENDATION: ${readiness?.recommendation ?? "N/A"}

REQUIREMENTS:

Workout Plan:
- 7-day plan with specific exercises, sets, reps, and rest times
- Adapt intensity based on fatigue level, stress, and injury history
- Avoid exercises that could aggravate: ${(userData.healthIssues || []).join(", ") || "none"}
- Available equipment: ${(userData.equipment || []).join(", ") || "bodyweight only"}
- CRITICAL: You MUST ONLY use exercises from the following list. Use the EXACT names as shown. Do NOT invent or substitute exercises not on this list.

Workout quality constraints (MANDATORY):
- Return exactly 7 days in workout_plan
- Every day must include 2-4 exercises
- No duplicate exercise names within a day
- No exercise name may repeat on consecutive days
- Ensure variety: rotate movement patterns/focus so days are not near-identical
- Use balanced programming (compound + accessory work where possible)

AVAILABLE EXERCISES (use ONLY these, EXACT names):
${catalogLines}

Diet Plan:
- STRICT: Never include these allergens: ${(userData.allergies || []).join(", ") || "none"}
- Diet type: ${userData.dietType || "no preference"}
- Include 2 alternatives per meal
- Optimize for ${userData.budget || "medium"} budget and ${userData.cuisine || "any"} cuisine

Smart Adjustments:
- If stress is high, prescribe lighter workouts with mindfulness
- If heart rate is elevated, focus on recovery and light cardio
- If readiness score is below 45, recommend rest day with stretching

OUTPUT FORMAT (STRICT JSON, no markdown, no extra text):
{
  "workout_plan": [
    {
      "day": "Day 1",
      "focus": "string",
      "exercises": [
        { "name": "string", "sets": number, "reps": "string", "rest": "string", "notes": "string" }
      ],
      "duration_minutes": number
    }
  ],
  "diet_plan": {
    "daily_meals": [
      {
        "meal": "Breakfast",
        "primary": { "name": "string", "calories": number, "protein": number, "carbs": number, "fat": number },
        "alternatives": [
          { "name": "string", "calories": number, "protein": number, "carbs": number, "fat": number }
        ]
      }
    ]
  },
  "calories": number,
  "macros": { "protein": number, "carbs": number, "fat": number },
  "hydration_liters": number,
  "tips": ["string"],
  "risk_notes": ["string"]
}`;
}

async function callGeminiChain(prompt, contextLabel = "request") {
	for (let i = 0; i < GEMINI_KEYS.length; i += 1) {
		const keyLabel = i === 0 ? "primary" : "backup";
		try {
			const text = await callGeminiWithKey(prompt, GEMINI_KEYS[i]);
			console.log(`[AI] Gemini ${contextLabel} ${keyLabel} key succeeded`);
			return text;
		} catch (geminiError) {
			console.warn(
				`[AI] Gemini ${contextLabel} ${keyLabel} key failed, trying next:`,
				geminiError.message,
			);
		}
	}

	throw new Error(`No Gemini key succeeded for ${contextLabel}.`);
}

// --- Call AI with Gemini primary, Groq fallback ---
async function callPlanAI(prompt, { groqPrompt } = {}) {
	let geminiError;
	try {
		const text = await callGeminiChain(prompt, "plan");
		console.log("[AI] Gemini plan succeeded");
		return text;
	} catch (error) {
		geminiError = error;
		console.warn("[AI] Gemini plan failed, trying Groq fallback:", error.message);
	}

	try {
		const text = await callGroqPlan(groqPrompt || prompt, {
			model: "openai/gpt-oss-120b",
			temperature: 0.35,
			maxTokens: 1700,
			jsonMode: false,
		});
		console.log("[AI] Groq fallback model=openai/gpt-oss-120b succeeded");
		return text;
	} catch (groqError) {
		throw new Error(
			`Plan generation failed (Gemini: ${geminiError?.message || "n/a"}; Groq fallback: ${groqError?.message || "n/a"})`,
		);
	}
}

function parseJSON(text) {
	// Strip markdown code fences if present
	text = String(text)
		.replace(/```json\n?/g, "")
		.replace(/```\n?/g, "")
		.trim();

	try {
		return JSON.parse(text);
	} catch (_) {
		const firstBrace = text.indexOf("{");
		const lastBrace = text.lastIndexOf("}");
		if (firstBrace >= 0 && lastBrace > firstBrace) {
			return JSON.parse(text.slice(firstBrace, lastBrace + 1));
		}
		return parsePossiblyTruncatedJSON(text);
	}
}

async function parsePlanWithRecovery(rawText, userData, presageData, readiness) {
	try {
		return parseJSON(rawText);
	} catch (parseError) {
		console.warn("[AI] Parse failed, requesting recovery:", parseError.message);
		const recoveryPrompt = buildParseRecoveryPrompt(
			userData,
			presageData,
			readiness,
			parseError.message,
		);
		const retryText = await callPlanAI(recoveryPrompt, {
			groqPrompt: recoveryPrompt,
		});

		try {
			return parseJSON(retryText);
		} catch (secondParseError) {
			console.warn(
				"[AI] Recovery parse still failed, requesting compact regenerate:",
				secondParseError.message,
			);
			const compactPrompt = buildCompactGroqPrompt(
				userData,
				presageData,
				readiness,
			);
			const finalText = await callPlanAI(compactPrompt, {
				groqPrompt: compactPrompt,
			});
			try {
				return parseJSON(finalText);
			} catch (thirdParseError) {
				console.warn(
					"[AI] Final parse failed after compact regenerate, using deterministic fallback:",
					thirdParseError.message,
				);
				return buildDeterministicFallbackPlan(userData, readiness);
			}
		}
	}
}

// --- Public API ---
export async function generateFitnessPlan(userData, presageData, readiness) {
	try {
		const prompt = buildPrompt(userData, presageData, readiness);
		const compactFallbackPrompt = buildCompactGroqPrompt(
			userData,
			presageData,
			readiness,
		);
		let text = await callPlanAI(prompt, { groqPrompt: compactFallbackPrompt });
		let plan;
		try {
			plan = await parsePlanWithRecovery(
				text,
				userData,
				presageData,
				readiness,
			);
		} catch (parsePipelineError) {
			console.warn(
				"[AI] Parse pipeline failed early, switching to deterministic fallback plan:",
				parsePipelineError.message,
			);
			plan = buildDeterministicFallbackPlan(userData, readiness);
		}

		try {
			plan = validateAndNormalizeWorkoutPlan(plan, readiness, userData);
		} catch (validationError) {
			console.warn(
				"[AI] Initial plan invalid, requesting repair:",
				validationError.message,
			);
			const repairPrompt = buildRepairPrompt(
				plan,
				validationError.message,
				userData,
				presageData,
				readiness,
			);
			const compactRepairPrompt = buildCompactRepairPrompt(
				plan,
				validationError.message,
				userData,
				presageData,
				readiness,
			);
			text = await callPlanAI(repairPrompt, {
				groqPrompt: compactRepairPrompt,
			});
			plan = await parsePlanWithRecovery(
				text,
				userData,
				presageData,
				readiness,
			);

			try {
				plan = validateAndNormalizeWorkoutPlan(plan, readiness, userData);
			} catch (finalValidationError) {
				console.warn(
					"[AI] Repaired plan still invalid, applying deterministic fallback workout:",
					finalValidationError.message,
				);
				plan = {
					...plan,
					workout_plan: buildFallbackWorkoutPlan(plan, readiness, userData),
				};
				plan = validateAndNormalizeWorkoutPlan(plan, readiness, userData);
			}
		}

		try {
			plan = tuneWorkoutPlanForUser(plan, userData, readiness);
			plan = validateAndNormalizeWorkoutPlan(plan, readiness, userData);
		} catch (tuningError) {
			console.warn(
				"[AI] Constraint tuning failed, regenerating deterministic workout:",
				tuningError.message,
			);
			plan = {
				...plan,
				workout_plan: buildFallbackWorkoutPlan(plan, readiness, userData),
			};
			plan = validateAndNormalizeWorkoutPlan(plan, readiness, userData);
		}

		plan = normalizeAndEnsureDietPlan(plan, userData);

		// Validate allergens are not in the diet
		if (userData.allergies?.length > 0) {
			validateNoAllergens(plan, userData.allergies);
		}

		return plan;
	} catch (error) {
		console.error("[AI] Error generating plan:", error);
		try {
			console.warn(
				"[AI] Returning deterministic fallback plan after generation failure.",
			);
			const fallback = buildDeterministicFallbackPlan(userData, readiness);

			if (userData.allergies?.length > 0) {
				validateNoAllergens(fallback, userData.allergies);
			}

			return fallback;
		} catch (fallbackError) {
			console.error("[AI] Fallback plan generation failed:", fallbackError);
			throw new Error("Failed to generate fitness plan. Please try again.");
		}
	}
}

function validateNoAllergens(plan, allergies) {
	const allergenLower = allergies.map((a) => a.toLowerCase());
	const meals = plan.diet_plan?.daily_meals || [];

	for (const meal of meals) {
		const allOptions = [meal.primary, ...(meal.alternatives || [])];
		for (const option of allOptions) {
			const nameLower = option.name.toLowerCase();
			for (const allergen of allergenLower) {
				if (nameLower.includes(allergen)) {
					console.warn(
						`[AI] Allergen "${allergen}" found in "${option.name}" — flagging`,
					);
					option.name = `[ALLERGEN WARNING] ${option.name}`;
				}
			}
		}
	}
}

export async function generateMealSwap(currentMeal, userData, constraints) {
	try {
		const prompt = `You are a nutritionist. Replace this meal with an alternative that maintains the same nutritional profile.

Current meal: ${JSON.stringify(currentMeal)}
Diet type: ${userData.dietType || "no preference"}
STRICT allergies (NEVER include): ${(userData.allergies || []).join(", ") || "none"}
Budget: ${userData.budget || "medium"}
Cuisine preference: ${userData.cuisine || "any"}
${constraints ? `Additional constraints: ${constraints}` : ""}

Return ONLY valid JSON:
{ "name": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "recipe_brief": "string" }`;

		let text;
		try {
			try {
				text = await callGroqFast(prompt, {
					temperature: 0.2,
					maxTokens: 550,
					jsonMode: true,
					systemInstruction:
						"Return only valid JSON. No markdown. No extra text.",
				});
			} catch (jsonModeError) {
				console.warn(
					"[AI] Meal swap fast JSON mode failed, retrying without JSON mode:",
					jsonModeError.message,
				);
				text = await callGroqFast(prompt, {
					temperature: 0.2,
					maxTokens: 650,
					jsonMode: false,
					systemInstruction:
						"Return only valid JSON. No markdown. No extra text.",
				});
			}
		} catch (fastError) {
			console.warn(
				"[AI] Groq fast meal swap failed, trying Gemini:",
				fastError.message,
			);
			text = await callGeminiChain(prompt, "meal swap");
		}

		return parseJSON(text);
	} catch (error) {
		console.error("[AI] Meal swap error:", error);
		throw new Error("Failed to generate meal swap.");
	}
}

export async function generateMealRecipe(meal, userData) {
	try {
		const prompt = buildRecipePrompt(meal, userData);

		let text;
		try {
			text = await callGroqRecipe(prompt, {
				temperature: 0.15,
				maxTokens: 850,
				jsonMode: true,
			});
		} catch (primaryError) {
			const compactPrompt = buildRecipeRetryPrompt(meal, userData);
			text = await callGroqRecipe(compactPrompt, {
				temperature: 0.15,
				maxTokens: 700,
				jsonMode: false,
			});
		}

		let recipe;
		try {
			recipe = parseJSON(text);
		} catch (parseError) {
			console.warn(
				"[AI] Recipe parse failed, requesting JSON repair:",
				parseError.message,
			);
			try {
				const repairedText = await callGroqRecipe(
					buildRecipeJsonRepairPrompt(text, meal, userData),
					{ temperature: 0.1, maxTokens: 750, jsonMode: true },
				);
				recipe = parseJSON(repairedText);
			} catch (repairError) {
				console.warn(
					"[AI] Recipe repair failed, requesting minimal regenerate:",
					repairError.message,
				);
				const retryText = await callGroqRecipe(
					buildRecipeRetryPrompt(meal, userData),
					{ temperature: 0.1, maxTokens: 650, jsonMode: false },
				);
				recipe = parseJSON(retryText);
			}
		}

		return normalizeRecipeOutput(recipe, meal);
	} catch (error) {
		console.error("[AI] Meal recipe error:", error);
		return normalizeRecipeOutput(null, meal);
	}
}
