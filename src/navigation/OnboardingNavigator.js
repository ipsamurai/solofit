import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import BasicInfoScreen from '../screens/onboarding/BasicInfoScreen';
import GoalsScreen from '../screens/onboarding/GoalsScreen';
import DietScreen from '../screens/onboarding/DietScreen';
import HealthScreen from '../screens/onboarding/HealthScreen';
import SummaryScreen from '../screens/onboarding/SummaryScreen';

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="BasicInfo" component={BasicInfoScreen} />
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="Diet" component={DietScreen} />
      <Stack.Screen name="Health" component={HealthScreen} />
      <Stack.Screen name="Summary" component={SummaryScreen} />
    </Stack.Navigator>
  );
}
