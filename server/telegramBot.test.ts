import { describe, expect, it } from "vitest";
import { formatParticipantDashboard } from "./telegramBot";

describe("Telegram participant dashboard", () => {
  it("shows personal points and task states for an active period", () => {
    const message = formatParticipantDashboard({
      period: { id: 1, title: "Добрые дела · Неделя 1" },
      assignments: [
        { id: 10, status: "assigned", awardedPoints: 0, title: "Пикник", points: 20 },
        { id: 11, status: "under_review", awardedPoints: 0, title: "Помощь", points: 30 },
        { id: 12, status: "approved", awardedPoints: 40, title: "Сбор", points: 40 },
      ],
      points: 40,
    } as never);

    expect(message).toContain("Ваши баллы: 40");
    expect(message).toContain("Доступно: 1");
    expect(message).toContain("На проверке: 1");
    expect(message).toContain("Подтверждено: 1 из 3");
  });

  it("explains when no activity period is active", () => {
    expect(formatParticipantDashboard({ period: null, assignments: [], points: 0 } as never)).toContain("нет активного периода");
  });
});
