/**
 * Readiness / Fatigue Engine
 *
 * Calculates readiness score based on Presage biometric data and user profile.
 *
 * @param {Object} presageData - { heart_rate, breathing_rate, stress_level }
 * @param {Object} userData - User profile from onboarding
 * @returns {{ readiness_score: number, recommendation: string, details: string }}
 */
export function calculateReadiness(presageData, userData) {
  if (!presageData) {
    return { readiness_score: 50, recommendation: 'light workout', details: 'No biometric data available' };
  }

  const { heart_rate, breathing_rate, stress_level } = presageData;

  let score = 100;

  // Heart rate scoring — elevated resting HR indicates fatigue
  const age = parseInt(userData?.age) || 30;
  const maxHR = 220 - age;
  const restingHRThreshold = 80;

  if (heart_rate > restingHRThreshold) {
    const excess = heart_rate - restingHRThreshold;
    score -= Math.min(excess * 2, 30);
  }

  if (heart_rate > maxHR * 0.7) {
    score -= 20;
  }

  // Breathing rate scoring — elevated breathing at rest signals stress/fatigue
  if (breathing_rate > 18) {
    score -= (breathing_rate - 18) * 3;
  }

  // Stress level scoring
  if (stress_level === 'high') {
    score -= 25;
  } else if (stress_level === 'medium') {
    score -= 10;
  }

  // Health issues modifier
  if (userData?.healthIssues?.length > 0 && !userData.healthIssues.includes('None')) {
    score -= 5;
  }

  // Clamp
  score = Math.max(0, Math.min(100, Math.round(score)));

  let recommendation;
  let details;

  if (score >= 75) {
    recommendation = 'intense workout';
    details = 'Your body is well-rested and ready for a challenging session.';
  } else if (score >= 45) {
    recommendation = 'light workout';
    details = 'Moderate fatigue detected. Consider a lighter session today.';
  } else {
    recommendation = 'rest';
    details = 'Your body needs recovery. Focus on stretching or take the day off.';
  }

  return { readiness_score: score, recommendation, details };
}
