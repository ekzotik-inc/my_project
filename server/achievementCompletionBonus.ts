import { eq } from "drizzle-orm";
import { achievementBonuses, pointLedger } from "../drizzle/schema";
import { calculateAchievements, isAchievementCatalogComplete } from "./achievementRules";
import { getParticipantAchievementMetrics } from "./achievementReadModel";

export const ACHIEVEMENT_CATALOG_COMPLETION_BONUS = 200;

export function resolveCatalogCompletionBonus(input: { catalogComplete: boolean; bonusAlreadyGranted: boolean }) {
  return input.catalogComplete && !input.bonusAlreadyGranted
    ? { shouldAward: true as const, points: ACHIEVEMENT_CATALOG_COMPLETION_BONUS }
    : { shouldAward: false as const, points: 0 };
}

function isDuplicateError(error: unknown) {
  const databaseError = error as { code?: unknown; message?: unknown };
  return databaseError?.code === "ER_DUP_ENTRY" || (typeof databaseError?.message === "string" && /duplicate|ER_DUP_ENTRY/i.test(databaseError.message));
}

/**
 * Runs only inside an explicit P&C/Chief approval transaction, after the report ledger row exists.
 * The unique achievementBonuses marker makes the 200-point reward idempotent across all moderation paths.
 */
export async function awardCatalogCompletionBonusInTransaction(input: {
  tx: any;
  participantId: number;
  teamId: number | null;
  periodId: number;
  createdByParticipantId: number | null;
}) {
  const metrics = await getParticipantAchievementMetrics({
    db: input.tx,
    participantId: input.participantId,
    teamId: input.teamId,
    periodId: input.periodId,
  });
  const decision = resolveCatalogCompletionBonus({
    catalogComplete: isAchievementCatalogComplete(calculateAchievements(metrics)),
    bonusAlreadyGranted: false,
  });
  if (!decision.shouldAward) return { awarded: false as const, points: 0 };

  try {
    await input.tx.insert(achievementBonuses).values({
      participantId: input.participantId,
      periodId: input.periodId,
      points: decision.points,
    });
  } catch (error) {
    if (isDuplicateError(error)) return { awarded: false as const, points: 0 };
    throw error;
  }

  await input.tx.insert(pointLedger).values({
    participantId: input.participantId,
    assignmentId: null,
    periodId: input.periodId,
    points: decision.points,
    eventType: "achievement_catalog_complete",
    note: "Бонус за подтверждённое закрытие всех 20 достижений",
    createdByParticipantId: input.createdByParticipantId,
  });
  return { awarded: true as const, points: decision.points };
}
