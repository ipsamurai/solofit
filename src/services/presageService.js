/**
 * Presage SmartSpectra SDK Service
 *
 * In production, this integrates with the real Presage SDK.
 * For development/simulator, it provides realistic mock data.
 */

import { PRESAGE_API_KEY } from '@env';
const USE_MOCK = true; // Toggle for development — set false on real device with camera

function generateMockVitals() {
  const heartRate = Math.floor(60 + Math.random() * 40); // 60-100 bpm
  const breathingRate = Math.floor(12 + Math.random() * 8); // 12-20 breaths/min
  const stressRaw = Math.random();
  let stressLevel;
  if (stressRaw < 0.4) stressLevel = 'low';
  else if (stressRaw < 0.75) stressLevel = 'medium';
  else stressLevel = 'high';

  return { heart_rate: heartRate, breathing_rate: breathingRate, stress_level: stressLevel };
}

export async function initializePresage(apiKey = PRESAGE_API_KEY) {
  if (USE_MOCK) {
    console.log('[Presage] Initialized in mock mode');
    return true;
  }

  // Real SDK initialization would go here
  // await PresageSDK.initialize({ apiKey });
  return true;
}

export async function startVitalsScan(durationMs = 15000) {
  if (USE_MOCK) {
    // Simulate a scan taking time
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(generateMockVitals());
      }, Math.min(durationMs, 3000)); // Faster in mock
    });
  }

  // Real SDK scan would go here
  // const result = await PresageSDK.startScan({ duration: durationMs });
  // return {
  //   heart_rate: result.heartRate,
  //   breathing_rate: result.breathingRate,
  //   stress_level: result.stressLevel,
  // };
}

export function stopScan() {
  if (USE_MOCK) return;
  // PresageSDK.stopScan();
}
