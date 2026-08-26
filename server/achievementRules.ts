export type AchievementId =
  | "first_confirmed" | "three_confirmed" | "five_confirmed" | "ten_confirmed" | "twenty_confirmed"
  | "impact_100" | "impact_250" | "impact_500" | "impact_1000"
  | "period_finisher" | "period_traveler" | "period_marathon"
  | "team_first_spark" | "team_spark" | "team_wave" | "team_force"
  | "team_500" | "team_1000" | "team_connect" | "team_catalyst";

export type AchievementMetrics = {
  approvedTasks: number;
  awardedPoints: number;
  completedPeriods: number;
  teamApprovedTasks: number;
  teamAwardedPoints: number;
  teamContributors: number;
  periodApprovedTasks: number;
  periodTaskCount: number;
  teamPeriodApprovedTasks: number;
};

export type Achievement = {
  id: AchievementId;
  title: string;
  description: string;
  category: "Личный вклад" | "Ритм периода" | "Командный вклад";
  current: number;
  target: number;
  unlocked: boolean;
};

type AchievementDefinition = Omit<Achievement, "current" | "unlocked"> & { getCurrent: (metrics: AchievementMetrics) => number };

const catalog: AchievementDefinition[] = [
  { id: "first_confirmed", title: "Первый добрый след", description: "P&C подтвердила ваш первый результат.", category: "Личный вклад", target: 1, getCurrent: m => m.approvedTasks },
  { id: "three_confirmed", title: "Надёжный участник", description: "Три ваших результата получили подтверждение P&C.", category: "Личный вклад", target: 3, getCurrent: m => m.approvedTasks },
  { id: "five_confirmed", title: "Пять добрых дел", description: "Пять подтверждённых результатов стали частью общего дела.", category: "Личный вклад", target: 5, getCurrent: m => m.approvedTasks },
  { id: "ten_confirmed", title: "Десятка вклада", description: "Десять ваших результатов подтверждены P&C.", category: "Личный вклад", target: 10, getCurrent: m => m.approvedTasks },
  { id: "twenty_confirmed", title: "Сильный ритм", description: "Двадцать подтверждённых результатов — устойчивый личный вклад.", category: "Личный вклад", target: 20, getCurrent: m => m.approvedTasks },
  { id: "impact_100", title: "100 баллов добра", description: "Подтверждённые результаты принесли команде 100 баллов.", category: "Личный вклад", target: 100, getCurrent: m => m.awardedPoints },
  { id: "impact_250", title: "250 баллов добра", description: "Ваш подтверждённый вклад достиг 250 баллов.", category: "Личный вклад", target: 250, getCurrent: m => m.awardedPoints },
  { id: "impact_500", title: "500 баллов добра", description: "Ваши принятые результаты достигли 500 баллов.", category: "Личный вклад", target: 500, getCurrent: m => m.awardedPoints },
  { id: "impact_1000", title: "1000 баллов добра", description: "Тысяча подтверждённых баллов — заметный личный след.", category: "Личный вклад", target: 1000, getCurrent: m => m.awardedPoints },
  { id: "period_finisher", title: "Финиш периода", description: "Вы полностью закрыли один период подтверждённых заданий.", category: "Ритм периода", target: 1, getCurrent: m => m.completedPeriods },
  { id: "period_traveler", title: "Путь периодов", description: "Три периода закрыты полностью и подтверждены P&C.", category: "Ритм периода", target: 3, getCurrent: m => m.completedPeriods },
  { id: "period_marathon", title: "Марафон добра", description: "Пять периодов завершены без незакрытых заданий.", category: "Ритм периода", target: 5, getCurrent: m => m.completedPeriods },
  { id: "team_first_spark", title: "Первый импульс", description: "Команда подтвердила свой первый общий результат.", category: "Командный вклад", target: 1, getCurrent: m => m.teamApprovedTasks },
  { id: "team_spark", title: "Командный импульс", description: "Команда подтвердила пять заданий.", category: "Командный вклад", target: 5, getCurrent: m => m.teamApprovedTasks },
  { id: "team_wave", title: "Волна добра", description: "Команда накопила пятнадцать подтверждённых результатов.", category: "Командный вклад", target: 15, getCurrent: m => m.teamApprovedTasks },
  { id: "team_force", title: "Сила команды", description: "Тридцать подтверждённых командных результатов уже в зачёте.", category: "Командный вклад", target: 30, getCurrent: m => m.teamApprovedTasks },
  { id: "team_500", title: "Команда 500", description: "Командный подтверждённый вклад достиг 500 баллов.", category: "Командный вклад", target: 500, getCurrent: m => m.teamAwardedPoints },
  { id: "team_1000", title: "Команда 1000", description: "Командный подтверждённый вклад достиг 1000 баллов.", category: "Командный вклад", target: 1000, getCurrent: m => m.teamAwardedPoints },
  { id: "team_connect", title: "Три голоса", description: "Три участника команды уже получили подтверждённые результаты.", category: "Командный вклад", target: 3, getCurrent: m => m.teamContributors },
  { id: "team_catalyst", title: "Катализатор команды", description: "Пять участников команды включились с подтверждёнными результатами.", category: "Командный вклад", target: 5, getCurrent: m => m.teamContributors },
];

export const ACHIEVEMENT_CATALOG_SIZE = catalog.length;

export function calculateAchievements(metrics: AchievementMetrics): Achievement[] {
  return catalog.map(definition => {
    const current = Math.max(0, definition.getCurrent(metrics));
    return { ...definition, current: Math.min(current, definition.target), unlocked: current >= definition.target };
  });
}

export function isAchievementCatalogComplete(achievements: Achievement[]) {
  return achievements.length === ACHIEVEMENT_CATALOG_SIZE && achievements.every(item => item.unlocked);
}
