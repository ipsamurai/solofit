import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GradientButton from '../../components/GradientButton';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Ionicons name="fitness" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Solofit</Text>
        <Text style={styles.subtitle}>Your AI-Powered Fitness Coach</Text>
        <Text style={styles.description}>
          Real-time biometric tracking meets intelligent workout planning.{'\n'}
          Your body signals drive every recommendation.
        </Text>
      </View>

      <View style={styles.features}>
        {[
          { icon: 'pulse', text: 'Live heart rate & stress monitoring' },
          { icon: 'sparkles', text: 'AI-generated adaptive plans' },
          { icon: 'body', text: 'Camera posture detection' },
        ].map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name={f.icon} size={20} color={COLORS.primary} />
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.bottom}>
        <GradientButton title="Get Started" onPress={() => navigation.navigate('BasicInfo')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, paddingTop: 80 },
  hero: { alignItems: 'center', marginBottom: SPACING.xl },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: { ...FONTS.h1, fontSize: 40 },
  subtitle: { ...FONTS.body, color: COLORS.primaryLight, marginTop: SPACING.xs },
  description: { ...FONTS.bodySmall, textAlign: 'center', marginTop: SPACING.md, lineHeight: 22 },
  features: { marginTop: SPACING.xl, gap: SPACING.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  featureText: { ...FONTS.body },
  bottom: { position: 'absolute', bottom: 50, left: SPACING.lg, right: SPACING.lg },
});
