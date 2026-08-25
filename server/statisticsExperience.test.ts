import { describe, expect, it } from "vitest";
import { deriveNextAction } from "./statisticsDb";

describe("Mini App next-action guidance", () => {
  it("prioritizes a returned assignment so the participant knows what needs revision", () => {
    expect(deriveNextAction([{ status: "rejected", title: "Командный пикник" }])).toEqual({
      tone: "revise",
      title: "Нужна небольшая доработка",
      body: "Откройте «Командный пикник» в меню бота, дополните материалы и отправьте отчёт повторно.",
    });
  });

  it("encourages the participant to start an available assignment", () => {
    expect(deriveNextAction([{ status: "assigned", title: "Сбор вещей" }])).toEqual({
      tone: "start",
      title: "Можно сделать доброе дело уже сейчас",
      body: "Откройте «Сбор вещей» в меню бота и пройдите шаги выполнения.",
    });
  });

  it("recognizes when all assignments have been approved", () => {
    expect(deriveNextAction([{ status: "approved", title: "Сбор" }])).toEqual({
      tone: "celebrate",
      title: "Все задания периода подтверждены",
      body: "Спасибо за вклад — ваш результат уже усилил командный зачёт.",
    });
  });
});
