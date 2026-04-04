import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import DashboardScreen from "../screens/DashboardScreen";
import WorkoutScreen from "../screens/WorkoutScreen";
import ScanScreen from "../screens/ScanScreen";
import DietScreen from "../screens/DietScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { COLORS, FONT_FAMILIES } from "../constants/theme";

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
	Dashboard: { focused: "home", unfocused: "home-outline" },
	WorkoutTab: { focused: "barbell", unfocused: "barbell-outline" },
	Scan: { focused: "pulse", unfocused: "pulse-outline" },
	DietTab: { focused: "restaurant", unfocused: "restaurant-outline" },
	Profile: { focused: "person", unfocused: "person-outline" },
};

export default function MainNavigator() {
	return (
		<Tab.Navigator
			screenOptions={({ route }) => ({
				headerShown: false,
				tabBarStyle: {
					backgroundColor: COLORS.surfaceLight,
					borderTopColor: COLORS.border,
					borderTopWidth: 1.5,
					height: 85,
					paddingBottom: 20,
					paddingTop: 8,
				},
				tabBarActiveTintColor: COLORS.primary,
				tabBarInactiveTintColor: COLORS.textMuted,
				tabBarIcon: ({ focused, color, size }) => {
					const icons = TAB_ICONS[route.name];
					return (
						<Ionicons
							name={focused ? icons.focused : icons.unfocused}
							size={24}
							color={color}
						/>
					);
				},
				tabBarLabelStyle: {
					fontSize: 11,
					letterSpacing: 0.5,
					textTransform: "uppercase",
					fontFamily: FONT_FAMILIES.bodyBold,
				},
			})}
		>
			<Tab.Screen name="Dashboard" component={DashboardScreen} />
			<Tab.Screen
				name="WorkoutTab"
				component={WorkoutScreen}
				options={{ tabBarLabel: "Workout" }}
			/>
			<Tab.Screen name="Scan" component={ScanScreen} />
			<Tab.Screen
				name="DietTab"
				component={DietScreen}
				options={{ tabBarLabel: "Diet" }}
			/>
			<Tab.Screen name="Profile" component={ProfileScreen} />
		</Tab.Navigator>
	);
}
