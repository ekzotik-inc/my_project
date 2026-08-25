import { describe, expect, it } from "vitest";
import {
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

    expect(message).toContain("*Новое доброе дело уже ждёт вас!*");
    expect(message).toContain("*Командный пикник*");
    expect(message).toContain("*Награда:* +30 баллов");
    expect(message).toContain("кнопку «Открыть задания»");
  });

  it("celebrates an approved report without implying points are automatic", () => {
    const message = formatReportApprovalNotification({ title: "Сбор вещей", points: 45 });

    expect(message).toContain("*Ваш результат принят!*");
    expect(message).toContain("*Начислено:* +45 баллов");
    expect(message).toContain("подтверждено модератором");
  });

  it("formats an active period launch with a clear next step", () => {
    expect(formatNewPeriodNotification({ title: "Неделя заботы", description: "Делаем добро вместе." })).toContain(
      "*Старт нового периода*"
    );
  });
});
