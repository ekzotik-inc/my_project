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
  category: "Личный вклад" | "Командный вклад";
  current: number;
  target: number;
  unlocked: boolean;
};

type AchievementDefinition = Omit<Achievement, "current" | "unlocked"> & {
  getCurrent: (metrics: AchievementMetrics) => number;
  isAvailable?: (metrics: AchievementMetrics) => boolean;
};

const catalog: AchievementDefinition[] = [
  { id: "first_confirmed", title: "Первый добрый след", description: "P&C подтвердила ваш первый результат.", category: "Личный вклад", target: 1, getCurrent: metrics => metrics.approvedTasks },
  { id: "three_confirmed", title: "Надёжный участник", description: "Три ваших результата получили подтверждение P&C.", category: "Личный вклад", target: 3, getCurrent: metrics => metrics.approvedTasks },
  { id: "impact_100", title: "100 баллов добра", description: "Подтверждённый вклад принёс команде 100 баллов.", category: "Личный вклад", target: 100, getCurrent: metrics => metrics.awardedPoints },
  { id: "period_finisher", title: "Финиш периода", description: "Все задания активного периода подтверждены P&C.", category: "Личный вклад", target: 1, getCurrent: metrics => metrics.periodTaskCount > 0 && metrics.periodApprovedTasks >= metrics.periodTaskCount ? 1 : 0, isAvailable: metrics => metrics.periodTaskCount > 0 },
  { id: "team_spark", title: "Командный импульс", description: "Команда подтвердила пять заданий в текущем периоде.", category: "Командный вклад", target: 5, getCurrent: metrics => metrics.teamPeriodApprovedTasks, isAvailable: metrics => metrics.periodTaskCount > 0 },
];

export function calculateAchievements(metrics: AchievementMetrics): Achievement[] {
  return catalog
    .filter(definition => definition.isAvailable?.(metrics) ?? true)
    .map(definition => {
      const current = Math.max(0, definition.getCurrent(metrics));
      return { ...definition, current: Math.min(current, definition.target), unlocked: current >= definition.target };
    });
}
