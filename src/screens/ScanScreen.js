import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GradientButton from '../components/GradientButton';
import VitalCard from '../components/VitalCard';
import ReadinessGauge from '../components/ReadinessGauge';
import useStore from '../store/useStore';
import { startVitalsScan } from '../services/presageService';
import { calculateReadiness } from '../utils/readinessEngine';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export default function ScanScreen() {
  const { user, setVitals, setReadiness, vitals, readiness } = useStore();
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (scanning) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [scanning]);

  const handleScan = async () => {
    setScanning(true);
    setScanComplete(false);
    try {
      const data = await startVitalsScan(15000);
      setVitals(data);
      const r = calculateReadiness(data, user);
      setReadiness(r);
      setScanComplete(true);
    } catch (e) {
      console.error(e);
    }
    setScanning(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Vitals Scan</Text>
        <Text style={styles.subtitle}>
          {scanning ? 'Hold still — scanning your vitals...' : 'Measure your biometrics using Presage SDK'}
        </Text>

        {/* Scan Animation */}
        <View style={styles.scanArea}>
          <Animated.View style={[styles.scanCircle, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons
              name={scanning ? 'pulse' : 'heart-circle'}
              size={72}
              color={scanning ? COLORS.heartRate : COLORS.primary}
            />
          </Animated.View>
          {scanning && <Text style={styles.scanningText}>Scanning...</Text>}
        </View>

        {/* Results */}
        {scanComplete && vitals && (
          <View style={styles.results}>
            <View style={styles.vitalsRow}>
              <VitalCard icon="heart" label="Heart Rate" value={vitals.heart_rate} unit="bpm" color={COLORS.heartRate} />
              <View style={{ width: SPACING.sm }} />
              <VitalCard icon="water" label="Breathing" value={vitals.breathing_rate} unit="/min" color={COLORS.breathing} />
            </View>
            <View style={[styles.vitalsRow, { marginTop: SPACING.sm }]}>
              <VitalCard
                icon="flash"
                label="Stress"
                value={vitals.stress_level}
                color={vitals.stress_level === 'high' ? COLORS.danger : vitals.stress_level === 'medium' ? COLORS.warning : COLORS.success}
              />
            </View>

            {readiness && (
              <View style={{ marginTop: SPACING.md }}>
                <ReadinessGauge
                  score={readiness.readiness_score}
                  recommendation={readiness.recommendation}
                  details={readiness.details}
                />
              </View>
            )}
          </View>
        )}

        <View style={styles.bottom}>
          <GradientButton
            title={scanning ? 'Scanning...' : scanComplete ? 'Scan Again' : 'Start Scan'}
            onPress={handleScan}
            loading={scanning}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, padding: SPACING.lg },
  title: { ...FONTS.h1 },
  subtitle: { ...FONTS.bodySmall, marginTop: SPACING.xs },
  scanArea: { alignItems: 'center', justifyContent: 'center', marginTop: SPACING.xxl },
  scanCircle: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.primary + '40',
  },
  scanningText: { ...FONTS.body, color: COLORS.heartRate, marginTop: SPACING.md },
  results: { marginTop: SPACING.xl },
  vitalsRow: { flexDirection: 'row' },
  bottom: { marginTop: 'auto', paddingBottom: SPACING.lg },
});
