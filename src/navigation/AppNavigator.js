import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebaseConfig";
import OnboardingNavigator from "./OnboardingNavigator";
import MainNavigator from "./MainNavigator";
import PostureScreen from "../screens/PostureScreen";
import LeaderboardScreen from "../screens/LeaderboardScreen";
import CommunityScreen from "../screens/CommunityScreen";
import AuthScreen from "../screens/AuthScreen";
import useStore from "../store/useStore";
import { COLORS } from "../constants/theme";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
	const hasOnboarded = useStore((s) => s.hasOnboarded);
	const authUser = useStore((s) => s.authUser);
	const setAuthUser = useStore((s) => s.setAuthUser);
	const [authReady, setAuthReady] = useState(false);

	useEffect(() => {
		const unsub = onAuthStateChanged(auth, (user) => {
			setAuthUser(user);
			setAuthReady(true);
		});
		return unsub;
	}, []);

	if (!authReady) {
		return (
			<View
				style={{
					flex: 1,
					backgroundColor: COLORS.background,
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<ActivityIndicator size="large" color={COLORS.primary} />
			</View>
		);
	}

	return (
		<NavigationContainer>
			<Stack.Navigator screenOptions={{ headerShown: false }}>
				{!authUser ? (
					<Stack.Screen name="Auth" component={AuthScreen} />
				) : hasOnboarded ? (
					<>
						<Stack.Screen name="Main" component={MainNavigator} />
						<Stack.Screen name="Posture" component={PostureScreen} />
						<Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
						<Stack.Screen name="Community" component={CommunityScreen} />
					</>
				) : (
					<Stack.Screen name="Onboarding" component={OnboardingNavigator} />
				)}
			</Stack.Navigator>
		</NavigationContainer>
	);
}
