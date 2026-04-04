import { ActivityIndicator, LogBox, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts as useBebas } from "@expo-google-fonts/bebas-neue";
import { useFonts as useSpaceGrotesk } from "@expo-google-fonts/space-grotesk";
import AppNavigator from "./src/navigation/AppNavigator";
import { COLORS } from "./src/constants/theme";

// Import font resources so useFonts can register them.
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import {
	SpaceGrotesk_400Regular,
	SpaceGrotesk_500Medium,
	SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";

// Harmless no-op in New Architecture — suppress the warning
LogBox.ignoreLogs(["setLayoutAnimationEnabledExperimental"]);

export default function App() {
	const [bebasLoaded] = useBebas({ BebasNeue_400Regular });
	const [spaceLoaded] = useSpaceGrotesk({
		SpaceGrotesk_400Regular,
		SpaceGrotesk_500Medium,
		SpaceGrotesk_700Bold,
	});

	if (!bebasLoaded || !spaceLoaded) {
		return (
			<SafeAreaProvider>
				<View
					style={{
						flex: 1,
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: COLORS.background,
					}}
				>
					<ActivityIndicator size="large" color={COLORS.primary} />
				</View>
			</SafeAreaProvider>
		);
	}

	return (
		<SafeAreaProvider>
			<StatusBar style="dark" />
			<AppNavigator />
		</SafeAreaProvider>
	);
}
