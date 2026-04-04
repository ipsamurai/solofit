import { GoogleGenerativeAI } from '@google/generative-ai';

import { GEMINI_API_KEY, GROQ_API_KEY } from '@env';


const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- Groq fallback (OpenAI-compatible API) ---
async function callGroq(prompt) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_completion_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// --- Prompt builder ---
function buildPrompt(userData, presageData, readiness) {
  return `You are an expert fitness coach, physiotherapist, and nutritionist.

Generate a personalized plan based on:

USER DATA:
${JSON.stringify(userData, null, 2)}

REAL-TIME BODY DATA:
${JSON.stringify(presageData, null, 2)}

READINESS SCORE: ${readiness?.readiness_score ?? 'N/A'}/100
RECOMMENDATION: ${readiness?.recommendation ?? 'N/A'}

REQUIREMENTS:

Workout Plan:
- 7-day plan with specific exercises, sets, reps, and rest times
- Adapt intensity based on fatigue level, stress, and injury history
- Avoid exercises that could aggravate: ${(userData.healthIssues || []).join(', ') || 'none'}
- Available equipment: ${(userData.equipment || []).join(', ') || 'bodyweight only'}

Diet Plan:
- STRICT: Never include these allergens: ${(userData.allergies || []).join(', ') || 'none'}
- Diet type: ${userData.dietType || 'no preference'}
- Include 2 alternatives per meal
- Optimize for ${userData.budget || 'medium'} budget and ${userData.cuisine || 'any'} cuisine

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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log('[AI] Gemini succeeded');
    return response.text();
  } catch (geminiError) {
    console.warn('[AI] Gemini failed, falling back to Groq:', geminiError.message);
  }

  // Fallback to Groq
  console.log('[AI] Using Groq fallback');
  return await callGroq(prompt);
}

function parseJSON(text) {
  // Strip markdown code fences if present
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(text);
}

// --- Public API ---
export async function generateFitnessPlan(userData, presageData, readiness) {
  try {
    const prompt = buildPrompt(userData, presageData, readiness);
    const text = await callAI(prompt);
    const plan = parseJSON(text);

    // Validate allergens are not in the diet
    if (userData.allergies?.length > 0) {
      validateNoAllergens(plan, userData.allergies);
    }

    return plan;
  } catch (error) {
    console.error('[AI] Error generating plan:', error);
    throw new Error('Failed to generate fitness plan. Please try again.');
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
          console.warn(`[AI] Allergen "${allergen}" found in "${option.name}" — flagging`);
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
Diet type: ${userData.dietType || 'no preference'}
STRICT allergies (NEVER include): ${(userData.allergies || []).join(', ') || 'none'}
Budget: ${userData.budget || 'medium'}
Cuisine preference: ${userData.cuisine || 'any'}
${constraints ? `Additional constraints: ${constraints}` : ''}

Return ONLY valid JSON:
{ "name": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "recipe_brief": "string" }`;

    const text = await callAI(prompt);
    return parseJSON(text);
  } catch (error) {
    console.error('[AI] Meal swap error:', error);
    throw new Error('Failed to generate meal swap.');
  }
}
