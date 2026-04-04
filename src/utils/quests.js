export const DAILY_QUESTS = [
  {
    id: 'scan_vitals',
    title: 'Check Your Vitals',
    description: 'Run a Presage biometric scan',
    xp: 25,
    icon: 'pulse',
  },
  {
    id: 'complete_workout',
    title: 'Complete a Workout',
    description: 'Finish all exercises for the day',
    xp: 100,
    icon: 'barbell',
  },
  {
    id: 'log_meals',
    title: 'Review Meal Plan',
    description: 'Check your diet plan for today',
    xp: 15,
    icon: 'restaurant',
  },
  {
    id: 'posture_check',
    title: 'Posture Check',
    description: 'Run a posture analysis',
    xp: 30,
    icon: 'body',
  },
  {
    id: 'stay_hydrated',
    title: 'Stay Hydrated',
    description: 'Drink your recommended water intake',
    xp: 20,
    icon: 'water',
  },
];

export function getTodaysQuests() {
  // Rotate quests — pick 3 based on day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const shuffled = [...DAILY_QUESTS].sort((a, b) => {
    const ha = hashString(a.id + dayOfYear);
    const hb = hashString(b.id + dayOfYear);
    return ha - hb;
  });
  return shuffled.slice(0, 3);
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
