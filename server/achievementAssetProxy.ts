const achievementAssetKeys = {
  first_confirmed: "system/achievement-stickers/first_confirmed_3f12f993.png",
  three_confirmed: "system/achievement-stickers/three_confirmed_2254b957.png",
  impact_100: "system/achievement-stickers/impact_100_e68bb5fd.png",
  period_finisher: "system/achievement-stickers/period_finisher_d8fdfa03.png",
  team_spark: "system/achievement-stickers/team_spark_6a35ffae.png",
} as const;

export function getAchievementAssetKey(id: string): string | null {
  return achievementAssetKeys[id as keyof typeof achievementAssetKeys] ?? null;
}
