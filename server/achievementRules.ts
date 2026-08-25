export type AchievementId = "first_confirmed" | "three_confirmed" | "impact_100" | "period_finisher" | "team_spark";

export type AchievementMetrics = {
  approvedTasks: number;
  awardedPoints: number;
  periodApprovedTasks: number;
  periodTaskCount: number;
  teamPeriodApprovedTasks: number;
};

export type Achievement = {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  category: "Личный вклад" | "Командный вклад";
  current: number;
  target: number;
  unlocked: boolean;
};

type AchievementDefinition = Omit<Achievement, "current" | "unlocked"> & {
  getCurrent: (metrics: AchievementMetrics) => number;
  isAvailable?: (metrics: AchievementMetrics) => boolean;
};

export const achievementCatalog: AchievementDefinition[] = [
  {
    id: "first_confirmed",
    title: "Первый добрый след",
    description: "Первое задание подтверждено P&C.",
    icon: "🌱",
    category: "Личный вклад",
    target: 1,
    getCurrent: metrics => metrics.approvedTasks,
  },
  {
    id: "three_confirmed",
    title: "Надёжный участник",
    description: "Три результата подтверждены P&C.",
    icon: "🌿",
    category: "Личный вклад",
    target: 3,
    getCurrent: metrics => metrics.approvedTasks,
  },
  {
    id: "impact_100",
    title: "100 баллов добра",
    description: "Ваши подтверждённые дела принесли 100 баллов.",
    icon: "🏅",
    category: "Личный вклад",
    target: 100,
    getCurrent: metrics => metrics.awardedPoints,
  },
  {
    id: "period_finisher",
    title: "Финиш периода",
    description: "Все задания текущего периода подтверждены P&C.",
    icon: "✨",
    category: "Личный вклад",
    target: 1,
    getCurrent: metrics => metrics.periodTaskCount > 0 && metrics.periodApprovedTasks >= metrics.periodTaskCount ? 1 : 0,
    isAvailable: metrics => metrics.periodTaskCount > 0,
  },
  {
    id: "team_spark",
    title: "Командный импульс",
    description: "Ваша команда подтвердила пять заданий в текущем периоде.",
    icon: "🤝",
    category: "Командный вклад",
    target: 5,
    getCurrent: metrics => metrics.teamPeriodApprovedTasks,
    isAvailable: metrics => metrics.periodTaskCount > 0,
  },
];

export function calculateAchievements(metrics: AchievementMetrics): Achievement[] {
  return achievementCatalog
    .filter(definition => definition.isAvailable?.(metrics) ?? true)
    .map(definition => {
      const current = Math.max(0, definition.getCurrent(metrics));
      return {
        id: definition.id,
        title: definition.title,
        description: definition.description,
        icon: definition.icon,
        category: definition.category,
        target: definition.target,
        current: Math.min(current, definition.target),
        unlocked: current >= definition.target,
      };
    });
}

export function findNewAchievements(before: Achievement[], after: Achievement[]) {
  const unlockedBefore = new Set(before.filter(item => item.unlocked).map(item => item.id));
  return after.filter(item => item.unlocked && !unlockedBefore.has(item.id));
}
