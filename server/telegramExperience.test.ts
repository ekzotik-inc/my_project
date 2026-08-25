import { describe, expect, it } from "vitest";
import {
  formatParticipantHelp,
  formatNewActivityNotification,
  formatNewPeriodNotification,
  formatReportApprovalNotification,
} from "./telegramBot";

describe("Telegram communication templates", () => {
  it("formats a new activity as an actionable Markdown notification", () => {
    const message = formatNewActivityNotification({
      periodTitle: "Неделя добрых дел",
      title: "Командный пикник",
      description: "Проведите время вместе на природе.",
      points: 30,
    });

    expect(message).toContain("*Новое доброе дело для всей команды*");
    expect(message).toContain("*Командный пикник*");
    expect(message).toContain("*+30 баллов*");
    expect(message).toContain("Баллы появятся только после проверки");
  });

  it("celebrates an approved report without implying points are automatic", () => {
    const message = formatReportApprovalNotification({ title: "Сбор вещей", points: 45 });

    expect(message).toContain("*Результат принят — спасибо!*");
    expect(message).toContain("*+45 баллов*");
    expect(message).toContain("P&C подтвердила");
  });

  it("formats an active period launch with a clear next step", () => {
    expect(formatNewPeriodNotification({ title: "Неделя заботы", description: "Делаем добро вместе." })).toContain(
      "*Начинаем новый период*"
    );
  });

  it("offers a concise participant help route without changing the approval rule", () => {
    const message = formatParticipantHelp();
    expect(message).toContain("*Как устроены «Добрые дела»*");
    expect(message).toContain("После подтверждения получите баллы");
    expect(message).toContain("одинаковый набор заданий");
  });

  it("keeps help readable with Telegram-safe bullet formatting", () => {
    expect(formatParticipantHelp()).toContain("• Откройте *Мой ритм* через /menu");
  });
});
