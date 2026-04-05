import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Card from "../components/Card";
import useStore from "../store/useStore";
import {
	generateMealSwap,
	generateMealRecipe,
} from "../services/geminiService";
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from "../constants/theme";

function MacroBar({ label, value, total, color }) {
	const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
	return (
		<View style={styles.macroItem}>
			<View style={styles.macroLabelRow}>
				<Text style={styles.macroLabel}>{label}</Text>
				<Text style={styles.macroValue}>{value}g</Text>
			</View>
			<View style={styles.macroBarBg}>
				<View
					style={[
						styles.macroBarFill,
						{ width: `${pct}%`, backgroundColor: color },
					]}
				/>
			</View>
		</View>
	);
}

export default function DietScreen() {
	const { fitnessPlan, setFitnessPlan, user } = useStore();
	const [swapping, setSwapping] = useState(null);
	const [expandedRecipes, setExpandedRecipes] = useState({});
	const [recipesByKey, setRecipesByKey] = useState({});
	const [loadingRecipeKey, setLoadingRecipeKey] = useState(null);

	const dietPlan = fitnessPlan?.diet_plan;
	const meals = dietPlan?.daily_meals;

	const handleSwap = async (mealIndex, optionIndex) => {
		const meal = meals[mealIndex];
		const current =
			optionIndex === -1 ? meal.primary : meal.alternatives[optionIndex];

		setSwapping(`${mealIndex}-${optionIndex}`);
		try {
			const newMeal = await generateMealSwap(current, user);

			const updatedPlan = { ...fitnessPlan };
			const updatedMeals = [...updatedPlan.diet_plan.daily_meals];
			if (optionIndex === -1) {
				updatedMeals[mealIndex] = {
					...updatedMeals[mealIndex],
					primary: newMeal,
				};
			} else {
				const alts = [...updatedMeals[mealIndex].alternatives];
				alts[optionIndex] = newMeal;
				updatedMeals[mealIndex] = {
					...updatedMeals[mealIndex],
					alternatives: alts,
				};
			}
			updatedPlan.diet_plan = {
				...updatedPlan.diet_plan,
				daily_meals: updatedMeals,
			};
			setFitnessPlan(updatedPlan);
		} catch (e) {
			Alert.alert("Swap Failed", e.message);
		}
		setSwapping(null);
	};

	const recipeKeyFor = (mealIndex, optionIndex) =>
		`${mealIndex}:${optionIndex}`;

	const toggleRecipe = async (mealIndex, optionIndex, mealOption) => {
		const key = recipeKeyFor(mealIndex, optionIndex);
		const isOpen = !!expandedRecipes[key];

		if (isOpen) {
			setExpandedRecipes((prev) => ({ ...prev, [key]: false }));
			return;
		}

		setExpandedRecipes((prev) => ({ ...prev, [key]: true }));

		if (recipesByKey[key] || loadingRecipeKey === key) return;

		setLoadingRecipeKey(key);
		try {
			const recipe = await generateMealRecipe(mealOption, user);
			setRecipesByKey((prev) => ({ ...prev, [key]: recipe }));
		} catch (e) {
			Alert.alert("Recipe unavailable", e.message);
			setExpandedRecipes((prev) => ({ ...prev, [key]: false }));
		} finally {
			setLoadingRecipeKey(null);
		}
	};

	const renderRecipe = (key) => {
		if (loadingRecipeKey === key) {
			return (
				<View style={styles.recipeBox}>
					<ActivityIndicator size="small" color={COLORS.primary} />
					<Text style={styles.recipeLoading}>Generating recipe...</Text>
				</View>
			);
		}

		const recipe = recipesByKey[key];
		if (!recipe) return null;

		return (
			<View style={styles.recipeBox}>
				<Text style={styles.recipeTitle}>{recipe.title}</Text>
				<Text style={styles.recipeSection}>Ingredients</Text>
				{(recipe.ingredients || []).map((item, idx) => (
					<Text key={`i-${idx}`} style={styles.recipeLine}>
						- {item}
					</Text>
				))}

				<Text style={[styles.recipeSection, { marginTop: SPACING.sm }]}>
					Steps
				</Text>
				{(recipe.steps || []).map((step, idx) => (
					<Text key={`s-${idx}`} style={styles.recipeLine}>
						{idx + 1}. {step}
					</Text>
				))}
			</View>
		);
	};

	if (!dietPlan) {
		return (
			<SafeAreaView style={styles.safe}>
				<View style={styles.empty}>
					<Ionicons
						name="restaurant-outline"
						size={64}
						color={COLORS.textMuted}
					/>
					<Text style={styles.emptyTitle}>No Diet Plan</Text>
					<Text style={styles.emptyText}>
						Generate an AI plan from the Dashboard first.
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	const macros = fitnessPlan?.macros;

	return (
		<SafeAreaView style={styles.safe}>
			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.title}>Diet Plan</Text>

				{/* Daily summary */}
				<Card style={styles.summaryCard}>
					<View style={styles.summaryRow}>
						<View style={styles.summaryItem}>
							<Text style={styles.summaryValue}>{fitnessPlan?.calories}</Text>
							<Text style={styles.summaryLabel}>Calories</Text>
						</View>
						<View style={styles.summaryItem}>
							<Text style={styles.summaryValue}>
								{fitnessPlan?.hydration_liters}L
							</Text>
							<Text style={styles.summaryLabel}>Water</Text>
						</View>
					</View>
					{macros && (
						<View style={styles.macros}>
							<MacroBar
								label="Protein"
								value={macros.protein}
								total={macros.protein + macros.carbs + macros.fat}
								color={COLORS.primary}
							/>
							<MacroBar
								label="Carbs"
								value={macros.carbs}
								total={macros.protein + macros.carbs + macros.fat}
								color={COLORS.accent}
							/>
							<MacroBar
								label="Fat"
								value={macros.fat}
								total={macros.protein + macros.carbs + macros.fat}
								color={COLORS.warning}
							/>
						</View>
					)}
				</Card>

				{/* Meals */}
				{meals?.map((meal, mi) => (
					<Card key={mi} style={styles.mealCard}>
						<Text style={styles.mealType}>{meal.meal}</Text>

						{(() => {
							const primaryKey = recipeKeyFor(mi, -1);
							const primaryOpen = !!expandedRecipes[primaryKey];
							return (
								<>
									{/* Primary */}
									<View style={styles.optionRow}>
										<TouchableOpacity
											style={styles.optionInfo}
											onPress={() => toggleRecipe(mi, -1, meal.primary)}
											activeOpacity={0.8}
										>
											<View style={styles.optionTitleRow}>
												<Text style={styles.optionName}>
													{meal.primary?.name}
												</Text>
												<Ionicons
													name={primaryOpen ? "chevron-up" : "chevron-down"}
													size={16}
													color={COLORS.textMuted}
												/>
											</View>
											<Text style={styles.optionCal}>
												{meal.primary?.calories} cal | P:{meal.primary?.protein}
												g C:
												{meal.primary?.carbs}g F:{meal.primary?.fat}g
											</Text>
										</TouchableOpacity>
										<TouchableOpacity
											onPress={() => handleSwap(mi, -1)}
											disabled={swapping === `${mi}--1`}
											style={styles.swapBtn}
										>
											<Ionicons
												name="swap-horizontal"
												size={18}
												color={COLORS.primary}
											/>
										</TouchableOpacity>
									</View>
									{primaryOpen && renderRecipe(primaryKey)}

									{/* Alternatives */}
									{meal.alternatives?.map((alt, ai) => {
										const altKey = recipeKeyFor(mi, ai);
										const altOpen = !!expandedRecipes[altKey];
										return (
											<View key={ai}>
												<View style={styles.altRow}>
													<TouchableOpacity
														style={styles.optionInfo}
														onPress={() => toggleRecipe(mi, ai, alt)}
														activeOpacity={0.8}
													>
														<Text style={styles.altLabel}>
															Alternative {ai + 1}
														</Text>
														<View style={styles.optionTitleRow}>
															<Text style={styles.altName}>{alt.name}</Text>
															<Ionicons
																name={altOpen ? "chevron-up" : "chevron-down"}
																size={16}
																color={COLORS.textMuted}
															/>
														</View>
														<Text style={styles.optionCal}>
															{alt.calories} cal | P:{alt.protein}g C:
															{alt.carbs}g F:
															{alt.fat}g
														</Text>
													</TouchableOpacity>
													<TouchableOpacity
														onPress={() => handleSwap(mi, ai)}
														disabled={swapping === `${mi}-${ai}`}
														style={styles.swapBtn}
													>
														<Ionicons
															name="swap-horizontal"
															size={16}
															color={COLORS.textMuted}
														/>
													</TouchableOpacity>
												</View>
												{altOpen && renderRecipe(altKey)}
											</View>
										);
									})}
								</>
							);
						})()}
					</Card>
				))}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: COLORS.background },
	content: { padding: SPACING.lg, paddingBottom: 100 },
	title: {
		...FONTS.h1,
		fontSize: 44,
		lineHeight: 44,
		color: COLORS.primaryDark,
		marginBottom: SPACING.md,
	},
	empty: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: SPACING.xl,
	},
	emptyTitle: { ...FONTS.h2, marginTop: SPACING.lg },
	emptyText: { ...FONTS.bodySmall, textAlign: "center", marginTop: SPACING.sm },
	summaryCard: {
		marginBottom: SPACING.lg,
	},
	summaryRow: {
		flexDirection: "row",
		justifyContent: "space-around",
		marginBottom: SPACING.md,
	},
	summaryItem: { alignItems: "center" },
	summaryValue: {
		...FONTS.h2,
		color: COLORS.primary,
		fontSize: 40,
		lineHeight: 40,
	},
	summaryLabel: { ...FONTS.caption },
	macros: { gap: SPACING.sm },
	macroItem: {},
	macroLabelRow: { flexDirection: "row", justifyContent: "space-between" },
	macroLabel: { ...FONTS.caption },
	macroValue: { ...FONTS.caption },
	macroBarBg: {
		height: 6,
		backgroundColor: COLORS.surfaceLight,
		borderRadius: 3,
		marginTop: 4,
		overflow: "hidden",
	},
	macroBarFill: { height: "100%", borderRadius: 3 },
	mealCard: {
		marginBottom: SPACING.md,
	},
	mealType: { ...FONTS.h3, color: COLORS.primary, marginBottom: SPACING.sm },
	optionRow: { flexDirection: "row", alignItems: "center" },
	optionInfo: { flex: 1 },
	optionTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: SPACING.sm,
	},
	optionName: { ...FONTS.body },
	optionCal: { ...FONTS.caption, marginTop: 2 },
	swapBtn: { padding: SPACING.sm },
	altRow: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: SPACING.sm,
		paddingTop: SPACING.sm,
		borderTopWidth: 1,
		borderTopColor: COLORS.border,
	},
	altLabel: { ...FONTS.caption, color: COLORS.textMuted },
	altName: { ...FONTS.bodySmall },
	recipeBox: {
		marginTop: SPACING.sm,
		backgroundColor: COLORS.surface,
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: BORDER_RADIUS.md,
		padding: SPACING.sm,
	},
	recipeLoading: {
		...FONTS.bodySmall,
		marginTop: SPACING.xs,
		color: COLORS.textSecondary,
	},
	recipeTitle: { ...FONTS.body, marginBottom: SPACING.xs },
	recipeSection: { ...FONTS.caption, color: COLORS.primary },
	recipeLine: { ...FONTS.bodySmall, marginTop: 2 },
});
