import { GoogleGenerativeAI } from "@google/generative-ai";

import { GEMINI_API_KEY, GROQ_API_KEY } from "@env";
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

function getWorkoutBounds(readinessScore = 50) {
	if (readinessScore >= 75)
		return { minPerDay: 4, maxPerDay: 7, minUniqueWeek: 14 };
	if (readinessScore >= 45)
		return { minPerDay: 3, maxPerDay: 6, minUniqueWeek: 12 };
	return { minPerDay: 2, maxPerDay: 5, minUniqueWeek: 10 };
}

function validateAndNormalizeWorkoutPlan(plan, readiness) {
	if (!plan || typeof plan !== "object") {
		throw new Error("Plan is not a valid object.");
	}

	if (!Array.isArray(plan.workout_plan) || plan.workout_plan.length !== 7) {
		throw new Error("workout_plan must contain exactly 7 days.");
	}

	const score = readiness?.readiness_score ?? 50;
	const { minPerDay, maxPerDay, minUniqueWeek } = getWorkoutBounds(score);

	const weekFrequency = new Map();
	const uniqueWeekNames = new Set();
	let recoveryDays = 0;

	plan.workout_plan = plan.workout_plan.map((day, dayIdx) => {
		const focusLower = String(day?.focus || "").toLowerCase();
		const isRecoveryDay =
			focusLower.includes("recovery") ||
			focusLower.includes("rest") ||
			focusLower.includes("mobility") ||
			focusLower.includes("stretch");

		if (isRecoveryDay) recoveryDays += 1;

		const minForDay = isRecoveryDay ? Math.max(2, minPerDay - 1) : minPerDay;

		if (!Array.isArray(day?.exercises)) {
			throw new Error(`Day ${dayIdx + 1} is missing an exercises array.`);
		}

		if (day.exercises.length < minForDay || day.exercises.length > maxPerDay) {
			throw new Error(
				`Day ${dayIdx + 1} must contain ${minForDay}-${maxPerDay} exercises, got ${day.exercises.length}.`,
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
			namesInDay.add(canonicalName);

			uniqueWeekNames.add(canonicalName);
			weekFrequency.set(
				canonicalName,
				(weekFrequency.get(canonicalName) || 0) + 1,
			);

			return {
				...ex,
				name: canonicalName,
			};
		});

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

	for (const [name, count] of weekFrequency.entries()) {
		if (count > 2) {
			throw new Error(
				`Exercise "${name}" appears ${count} times. Max allowed is 2 per week.`,
			);
		}
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
${JSON.stringify(previousJson, null, 2)}

Hard rules:
- Keep the same output schema.
- workout_plan must have exactly 7 days.
- Each day must have multiple exercises (not a single-exercise day).
- No duplicate exercise names inside the same day.
- Any single exercise may appear at most 2 times across the whole week.
- Keep high variety across the week.
- Exercise names must be EXACT matches from the list below only.

Allowed exercises (exact names):
${catalogLines}`;
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- Groq fallback (OpenAI-compatible API) ---
async function callGroq(prompt) {
	const response = await fetch(
		"https://api.groq.com/openai/v1/chat/completions",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${GROQ_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "openai/gpt-oss-120b",
				messages: [{ role: "user", content: prompt }],
				temperature: 0.4,
				max_completion_tokens: 8192,
			}),
		},
	);

	if (!response.ok) {
		const err = await response.text();
		throw new Error(`Groq API error: ${response.status} ${err}`);
	}

	const data = await response.json();
	return data.choices[0].message.content;
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
- Every day must include multiple exercises (never 1 exercise only)
- High readiness (${readiness?.readiness_score ?? "N/A"}): 4-7 exercises/day
- Medium readiness: 3-6 exercises/day
- Low readiness: 2-5 exercises/day (recovery-oriented days allowed)
- No duplicate exercise names within a day
- Across the week, each exact exercise name can appear at most 2 times total
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

// --- Call AI with Gemini primary, Groq fallback ---
async function callAI(prompt) {
	// Try Gemini first
	try {
		const model = genAI.getGenerativeModel({
			model: "gemini-2.5-flash",
			generationConfig: {
				temperature: 0.5,
				topP: 0.9,
			},
		});
		const result = await model.generateContent(prompt);
		const response = await result.response;
		console.log("[AI] Gemini succeeded");
		return response.text();
	} catch (geminiError) {
		console.warn(
			"[AI] Gemini failed, falling back to Groq:",
			geminiError.message,
		);
	}

	// Fallback to Groq
	console.log("[AI] Using Groq fallback");
	return await callGroq(prompt);
}

function parseJSON(text) {
	// Strip markdown code fences if present
	text = text
		.replace(/```json\n?/g, "")
		.replace(/```\n?/g, "")
		.trim();
	return JSON.parse(text);
}

// --- Public API ---
export async function generateFitnessPlan(userData, presageData, readiness) {
	try {
		const prompt = buildPrompt(userData, presageData, readiness);
		let text = await callAI(prompt);
		let plan = parseJSON(text);

		try {
			plan = validateAndNormalizeWorkoutPlan(plan, readiness);
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
			text = await callAI(repairPrompt);
			plan = parseJSON(text);
			plan = validateAndNormalizeWorkoutPlan(plan, readiness);
		}

		// Validate allergens are not in the diet
		if (userData.allergies?.length > 0) {
			validateNoAllergens(plan, userData.allergies);
		}

		return plan;
	} catch (error) {
		console.error("[AI] Error generating plan:", error);
		throw new Error("Failed to generate fitness plan. Please try again.");
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

		const text = await callAI(prompt);
		return parseJSON(text);
	} catch (error) {
		console.error("[AI] Meal swap error:", error);
		throw new Error("Failed to generate meal swap.");
	}
}
