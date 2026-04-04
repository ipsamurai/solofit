import React, { useState } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

// Interactive 3D exercise viewer mock
// In production, this would use a Three.js or React Three Fiber renderer
// For now, we render an interactive joint-based figure that responds to touch

const JOINTS = [
  { id: 'head', x: 50, y: 8, label: 'Head' },
  { id: 'neck', x: 50, y: 15, label: 'Neck' },
  { id: 'l_shoulder', x: 35, y: 22, label: 'L.Shoulder' },
  { id: 'r_shoulder', x: 65, y: 22, label: 'R.Shoulder' },
  { id: 'l_elbow', x: 25, y: 38, label: 'L.Elbow' },
  { id: 'r_elbow', x: 75, y: 38, label: 'R.Elbow' },
  { id: 'l_wrist', x: 20, y: 52, label: 'L.Wrist' },
  { id: 'r_wrist', x: 80, y: 52, label: 'R.Wrist' },
  { id: 'torso', x: 50, y: 40, label: 'Torso' },
  { id: 'l_hip', x: 40, y: 55, label: 'L.Hip' },
  { id: 'r_hip', x: 60, y: 55, label: 'R.Hip' },
  { id: 'l_knee', x: 38, y: 72, label: 'L.Knee' },
  { id: 'r_knee', x: 62, y: 72, label: 'R.Knee' },
  { id: 'l_ankle', x: 36, y: 90, label: 'L.Ankle' },
  { id: 'r_ankle', x: 64, y: 90, label: 'R.Ankle' },
];

const BONES = [
  ['head', 'neck'],
  ['neck', 'l_shoulder'], ['neck', 'r_shoulder'],
  ['l_shoulder', 'l_elbow'], ['r_shoulder', 'r_elbow'],
  ['l_elbow', 'l_wrist'], ['r_elbow', 'r_wrist'],
  ['l_shoulder', 'torso'], ['r_shoulder', 'torso'],
  ['torso', 'l_hip'], ['torso', 'r_hip'],
  ['l_hip', 'l_knee'], ['r_hip', 'r_knee'],
  ['l_knee', 'l_ankle'], ['r_knee', 'r_ankle'],
];

export default function ExerciseViewer3D({ exercise, highlightJoints = [] }) {
  const [selectedJoint, setSelectedJoint] = useState(null);
  const [rotation, setRotation] = useState(0);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      setRotation((prev) => prev + gesture.dx * 0.5);
    },
  });

  const getJointPos = (id) => {
    const joint = JOINTS.find((j) => j.id === id);
    if (!joint) return { x: 0, y: 0 };
    // Simple rotation simulation
    const offsetX = Math.sin((rotation * Math.PI) / 180) * (joint.x - 50) * 0.3;
    return { x: joint.x + offsetX, y: joint.y };
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{exercise || 'Exercise Viewer'}</Text>
      <Text style={styles.hint}>Drag to rotate model</Text>

      <View style={styles.canvas} {...panResponder.panHandlers}>
        {/* Bones */}
        {BONES.map(([from, to], i) => {
          const a = getJointPos(from);
          const b = getJointPos(to);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <View
              key={i}
              style={[
                styles.bone,
                {
                  left: `${a.x}%`,
                  top: `${a.y}%`,
                  width: `${len}%`,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}

        {/* Joints */}
        {JOINTS.map((joint) => {
          const pos = getJointPos(joint.id);
          const isHighlighted = highlightJoints.includes(joint.id);
          const isSelected = selectedJoint === joint.id;

          return (
            <View
              key={joint.id}
              style={[
                styles.joint,
                {
                  left: `${pos.x - 2}%`,
                  top: `${pos.y - 1.5}%`,
                  backgroundColor: isHighlighted ? COLORS.warning : COLORS.primary,
                },
                isSelected && styles.jointSelected,
              ]}
              onTouchStart={() => setSelectedJoint(joint.id)}
            >
              {isSelected && (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipText}>{joint.label}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.legendText}>Normal</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.legendText}>Highlighted</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: { ...FONTS.h3, marginBottom: 2 },
  hint: { ...FONTS.caption, marginBottom: SPACING.md },
  canvas: {
    height: 300,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    position: 'relative',
    overflow: 'hidden',
  },
  bone: {
    position: 'absolute',
    height: 2,
    backgroundColor: COLORS.textMuted,
    // transformOrigin not supported on Android
  },
  joint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  jointSelected: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.text,
  },
  tooltip: {
    position: 'absolute',
    bottom: 20,
    left: -20,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  tooltipText: { ...FONTS.caption, color: COLORS.text },
  legend: { flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...FONTS.caption },
});
