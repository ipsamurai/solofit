/**
 * Exercise GIF lookup utility
 *
 * Uses the exercisedb_v1_sample database (30 exercises) to find the best
 * matching GIF for any exercise name coming from the AI workout plan.
 *
 * Matching strategy:
 *   1. Word-overlap score against exercise names in the DB
 *   2. If no name match (score < 1), fall back to body-part matching
 *      using the workout day's focus string
 *
 * All requires() are static — RN bundler cannot handle dynamic requires.
 * Using gifs_180x180 for fast loading.
 */

// ─── Static GIF map (exerciseId → require) ────────────────────────────────────
const GIF_MAP = {
  '2ORFMoR': require('../../assets/exercisedb_v1_sample/gifs_180x180/2ORFMoR.gif'),
  '2Qh2J1e': require('../../assets/exercisedb_v1_sample/gifs_180x180/2Qh2J1e.gif'),
  '3eGE2JC': require('../../assets/exercisedb_v1_sample/gifs_180x180/3eGE2JC.gif'),
  '3tAXPQ6': require('../../assets/exercisedb_v1_sample/gifs_180x180/3tAXPQ6.gif'),
  '3TZduzM': require('../../assets/exercisedb_v1_sample/gifs_180x180/3TZduzM.gif'),
  '3XFdb1Z': require('../../assets/exercisedb_v1_sample/gifs_180x180/3XFdb1Z.gif'),
  '4dF3maG': require('../../assets/exercisedb_v1_sample/gifs_180x180/4dF3maG.gif'),
  '4dUn2iv': require('../../assets/exercisedb_v1_sample/gifs_180x180/4dUn2iv.gif'),
  '5bpPTHv': require('../../assets/exercisedb_v1_sample/gifs_180x180/5bpPTHv.gif'),
  '05Cf2v8': require('../../assets/exercisedb_v1_sample/gifs_180x180/05Cf2v8.gif'),
  '5uFK1xr': require('../../assets/exercisedb_v1_sample/gifs_180x180/5uFK1xr.gif'),
  '5v7KYld': require('../../assets/exercisedb_v1_sample/gifs_180x180/5v7KYld.gif'),
  '6bOA1Oi': require('../../assets/exercisedb_v1_sample/gifs_180x180/6bOA1Oi.gif'),
  '6cKQC5E': require('../../assets/exercisedb_v1_sample/gifs_180x180/6cKQC5E.gif'),
  '6HiHHe0': require('../../assets/exercisedb_v1_sample/gifs_180x180/6HiHHe0.gif'),
  '6kSxYnw': require('../../assets/exercisedb_v1_sample/gifs_180x180/6kSxYnw.gif'),
  '6MfS53i': require('../../assets/exercisedb_v1_sample/gifs_180x180/6MfS53i.gif'),
  '6sMAmNv': require('../../assets/exercisedb_v1_sample/gifs_180x180/6sMAmNv.gif'),
  '6sYyrRX': require('../../assets/exercisedb_v1_sample/gifs_180x180/6sYyrRX.gif'),
  '7F1DVzn': require('../../assets/exercisedb_v1_sample/gifs_180x180/7F1DVzn.gif'),
  '7I6LNUG': require('../../assets/exercisedb_v1_sample/gifs_180x180/7I6LNUG.gif'),
  '7inpWch': require('../../assets/exercisedb_v1_sample/gifs_180x180/7inpWch.gif'),
  '7saC5zz': require('../../assets/exercisedb_v1_sample/gifs_180x180/7saC5zz.gif'),
  '7zdxRTl': require('../../assets/exercisedb_v1_sample/gifs_180x180/7zdxRTl.gif'),
  '8eqjhOl': require('../../assets/exercisedb_v1_sample/gifs_180x180/8eqjhOl.gif'),
  '8K0w2yA': require('../../assets/exercisedb_v1_sample/gifs_180x180/8K0w2yA.gif'),
  '8oYqOt9': require('../../assets/exercisedb_v1_sample/gifs_180x180/8oYqOt9.gif'),
  '8ozhUIZ': require('../../assets/exercisedb_v1_sample/gifs_180x180/8ozhUIZ.gif'),
  '8urJS9b': require('../../assets/exercisedb_v1_sample/gifs_180x180/8urJS9b.gif'),
  '8xUv4J7': require('../../assets/exercisedb_v1_sample/gifs_180x180/8xUv4J7.gif'),
};

// ─── Exercise database (inline — avoids async JSON load) ──────────────────────
const EXERCISES = [
  { id: '2ORFMoR', name: 'hack calf raise',                            bodyParts: ['lower legs'],  muscles: ['calves'] },
  { id: '2Qh2J1e', name: 'sled 45 leg press',                          bodyParts: ['upper legs'],  muscles: ['glutes'] },
  { id: '3eGE2JC', name: 'dumbbell front raise',                        bodyParts: ['shoulders'],   muscles: ['delts'] },
  { id: '3tAXPQ6', name: 'dumbbell over bench reverse wrist curl',      bodyParts: ['lower arms'],  muscles: ['forearms'] },
  { id: '3TZduzM', name: 'barbell incline bench press',                 bodyParts: ['chest'],       muscles: ['pectorals'] },
  { id: '3XFdb1Z', name: 'cable squatting curl',                        bodyParts: ['upper arms'],  muscles: ['biceps'] },
  { id: '4dF3maG', name: 'dumbbell one arm hammer preacher curl',       bodyParts: ['upper arms'],  muscles: ['biceps'] },
  { id: '4dUn2iv', name: 'barbell standing close grip curl',            bodyParts: ['upper arms'],  muscles: ['biceps'] },
  { id: '5bpPTHv', name: 'kettlebell pistol squat',                     bodyParts: ['upper legs'],  muscles: ['glutes'] },
  { id: '05Cf2v8', name: 'impossible dips',                             bodyParts: ['upper arms'],  muscles: ['triceps'] },
  { id: '5uFK1xr', name: 'barbell seated overhead triceps extension',   bodyParts: ['upper arms'],  muscles: ['triceps'] },
  { id: '5v7KYld', name: 'smith incline bench press',                   bodyParts: ['chest'],       muscles: ['pectorals'] },
  { id: '6bOA1Oi', name: 'weighted side bend stability ball',           bodyParts: ['waist'],       muscles: ['abs'] },
  { id: '6cKQC5E', name: 'dumbbell one arm upright row',                bodyParts: ['shoulders'],   muscles: ['delts'] },
  { id: '6HiHHe0', name: 'barbell standing rocking leg calf raise',     bodyParts: ['lower legs'],  muscles: ['calves'] },
  { id: '6kSxYnw', name: 'barbell wrist curl',                          bodyParts: ['lower arms'],  muscles: ['forearms'] },
  { id: '6MfS53i', name: 'dumbbell lying single extension',             bodyParts: ['upper arms'],  muscles: ['triceps'] },
  { id: '6sMAmNv', name: 'dumbbell reverse spider curl',                bodyParts: ['upper arms'],  muscles: ['biceps'] },
  { id: '6sYyrRX', name: 'bent knee lying twist',                       bodyParts: ['upper legs'],  muscles: ['glutes'] },
  { id: '7F1DVzn', name: 'lever front pulldown lat pulldown',           bodyParts: ['back'],        muscles: ['lats'] },
  { id: '7I6LNUG', name: 'lever seated row cable row',                  bodyParts: ['back'],        muscles: ['upper back'] },
  { id: '7inpWch', name: 'dumbbell standing concentration curl',        bodyParts: ['upper arms'],  muscles: ['biceps'] },
  { id: '7saC5zz', name: 'cable decline fly chest fly',                 bodyParts: ['chest'],       muscles: ['pectorals'] },
  { id: '7zdxRTl', name: 'smith leg press',                             bodyParts: ['upper legs'],  muscles: ['glutes'] },
  { id: '8eqjhOl', name: 'dumbbell palms incline bench press',          bodyParts: ['upper arms'],  muscles: ['triceps'] },
  { id: '8K0w2yA', name: 'hanging knee raise ab raise',                 bodyParts: ['waist'],       muscles: ['abs'] },
  { id: '8oYqOt9', name: 'cable seated curl',                           bodyParts: ['upper arms'],  muscles: ['biceps'] },
  { id: '8ozhUIZ', name: 'barbell standing calf raise',                 bodyParts: ['lower legs'],  muscles: ['calves'] },
  { id: '8urJS9b', name: 'weighted hyperextension back extension',      bodyParts: ['back'],        muscles: ['spine'] },
  { id: '8xUv4J7', name: 'cable seated crunch',                         bodyParts: ['waist'],       muscles: ['abs'] },
];

// ─── Body-part keyword map for focus-based fallback ──────────────────────────
const FOCUS_BODY_PARTS = [
  { keywords: ['chest', 'pec', 'bench', 'fly', 'push'],            parts: ['chest'] },
  { keywords: ['back', 'lat', 'row', 'pull', 'deadlift'],          parts: ['back'] },
  { keywords: ['leg', 'squat', 'quad', 'glute', 'hamstring', 'lunge'], parts: ['upper legs', 'lower legs'] },
  { keywords: ['shoulder', 'delt', 'overhead', 'press'],           parts: ['shoulders'] },
  { keywords: ['arm', 'bicep', 'curl'],                            parts: ['upper arms'] },
  { keywords: ['tricep', 'dip', 'extension', 'pushdown'],          parts: ['upper arms'] },
  { keywords: ['core', 'ab', 'crunch', 'plank', 'twist'],         parts: ['waist'] },
  { keywords: ['calf'],                                            parts: ['lower legs'] },
  { keywords: ['wrist', 'forearm', 'grip'],                        parts: ['lower arms'] },
];

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function tokenize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function scoreNameMatch(aiName, dbExercise) {
  const aiTokens = tokenize(aiName);
  const dbTokens = tokenize(dbExercise.name);
  let score = 0;
  for (const t of aiTokens) {
    if (dbTokens.includes(t)) score += 2;
    else if (dbTokens.some((d) => d.includes(t) || t.includes(d))) score += 1;
  }
  return score;
}

function getFocusBodyParts(focusStr) {
  const lower = (focusStr || '').toLowerCase();
  for (const { keywords, parts } of FOCUS_BODY_PARTS) {
    if (keywords.some((k) => lower.includes(k))) return parts;
  }
  return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Find the best matching GIF for an exercise from the AI plan.
 *
 * @param {string} exerciseName  - Exercise name from the AI plan (e.g. "Bench Press")
 * @param {string} workoutFocus  - Day focus string (e.g. "Chest & Triceps")
 * @returns {{ source: any, matchedName: string } | null}
 */
export function findExerciseGif(exerciseName, workoutFocus) {
  // 1. Score every DB exercise by name overlap
  let best = null;
  let bestScore = 0;

  for (const ex of EXERCISES) {
    const score = scoreNameMatch(exerciseName, ex);
    if (score > bestScore) {
      bestScore = score;
      best = ex;
    }
  }

  if (best && bestScore >= 1) {
    return { source: GIF_MAP[best.id], matchedName: best.name };
  }

  // 2. Fallback: pick by body-part from workout focus
  const focusParts = getFocusBodyParts(workoutFocus) || getFocusBodyParts(exerciseName);
  if (focusParts) {
    const candidates = EXERCISES.filter((ex) =>
      ex.bodyParts.some((bp) => focusParts.includes(bp))
    );
    if (candidates.length) {
      // Pick the one with highest name score among candidates (could be 0, just pick first)
      const fallback = candidates.reduce((a, b) =>
        scoreNameMatch(exerciseName, a) >= scoreNameMatch(exerciseName, b) ? a : b
      );
      return { source: GIF_MAP[fallback.id], matchedName: fallback.name };
    }
  }

  // 3. No match — return null (dropdown won't show GIF button)
  return null;
}
