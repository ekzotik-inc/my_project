import { describe, expect, it } from "vitest";
import { formatParticipantDashboard, formatReturningParticipantGreeting } from "./telegramBot";

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

    expect(message).toContain("*Есть дело, которое ждёт вашего шага*");
    expect(message).toContain("*40 баллов*");
    expect(message).toContain("Прогресс периода: *1 из 3* · 33%");
  });

  it("explains when no activity period is active", () => {
    expect(formatParticipantDashboard({ period: null, assignments: [], points: 0 } as never)).toContain("*Сейчас — спокойная пауза*");
  });

  it("greets an approved participant without repeating the full route card", () => {
    const message = formatReturningParticipantGreeting({
      fullName: "Анна Иванова",
      dashboard: { assignments: [{ status: "under_review" }], period: { title: "Неделя" } } as never,
    });
    expect(message).toContain("*С возвращением, Анна*");
    expect(message).toContain("Ваш последний результат уже у P&C");
    expect(message).not.toContain("Прогресс периода");
  });
});
