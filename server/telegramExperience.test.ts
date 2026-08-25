import { describe, expect, it } from "vitest";
import {
  formatParticipantHelp,
  formatWelcomeGuide,
  formatWelcomeMessage,
  getActivityNotificationPresentation,
  formatNewActivityNotification,
  formatNewPeriodNotification,
  formatReportApprovalNotification,
  PREMIUM_EMOJI,
} from "./telegramBot";

describe("Telegram communication templates", () => {
  it("formats a new activity as an actionable Premium Emoji notification", () => {
    const message = formatNewActivityNotification({
      periodTitle: "Неделя добрых дел",
      title: "Командный пикник",
      description: "Проведите время вместе на природе.",
      points: 30,
    });

    expect(message).toContain("Новое дело для всей команды");
    expect(message).toContain("Командный пикник");
    expect(message).toContain("+30 баллов");
    expect(message).toContain(`emoji-id="${PREMIUM_EMOJI.action.id}"`);
    expect(message).toContain(`emoji-id="${PREMIUM_EMOJI.score.id}"`);
    expect(message).toContain("все шаги и материалы уже внутри");
  });

  it("celebrates an approved report without implying points are automatic", () => {
    const message = formatReportApprovalNotification({ title: "Сбор вещей", points: 45 });

    expect(message).toContain("Ваш вклад подтверждён");
    expect(message).toContain("+45 баллов");
    expect(message).toContain("P&amp;C приняла результат");
    expect(message).toContain(`emoji-id="${PREMIUM_EMOJI.applause.id}"`);
  });

  it("formats an active period launch with a clear next step", () => {
    expect(formatNewPeriodNotification({ title: "Неделя заботы", description: "Делаем добро вместе." })).toContain(
      "Открыт новый период"
    );
  });

  it("offers a concise participant help route without changing the approval rule", () => {
    const message = formatParticipantHelp();
    expect(message).toContain("*Как работает ваш маршрут*");
    expect(message).toContain("После подтверждения баллы и статистика обновятся сами");
    expect(message).toContain("одинаковый набор заданий");
  });

  it("keeps help readable with Telegram-safe bullet formatting", () => {
    expect(formatParticipantHelp()).toContain("• В /menu выберите дело");
  });

  it("uses an activity cover as Telegram photo preview and preserves a text fallback", () => {
    const base = { periodTitle: "Неделя заботы", title: "Письмо добра", description: "Поддержите коллегу.", points: 20 };
    expect(getActivityNotificationPresentation({ ...base, coverImageUrl: "https://images.example/cover.jpg" }).photo).toBe("https://images.example/cover.jpg");
    expect(getActivityNotificationPresentation(base).photo).toBeNull();
  });

  it("creates a personal, action-oriented welcome without changing approval rules", () => {
    const welcome = formatWelcomeMessage("Анна");
    expect(welcome).toContain("Рады видеть вас, Анна");
    expect(welcome).toContain("заметный общий вклад");
    expect(welcome).toContain(`emoji-id="${PREMIUM_EMOJI.sparkle.id}"`);
    expect(formatWelcomeGuide()).toContain("баллы появляются только после решения P&amp;C");
  });
});
