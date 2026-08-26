export type DesignDirection = {
  id: "quiet" | "signal" | "field";
  label: string;
  name: string;
  premise: string;
  strength: string;
  risk: string;
  hero: string;
  action: string;
};

export const designDirections: DesignDirection[] = [
  {
    id: "quiet",
    label: "01",
    name: "Quiet Editorial",
    premise: "Спокойная editorial-подача: один главный результат, много воздуха и фото как смысловой центр.",
    strength: "Лучше всего для долгого ежедневного использования и ясной иерархии.",
    risk: "Требует дисциплины: нельзя возвращать лишние цветные карточки.",
    hero: "12 подтверждённых дел",
    action: "Продолжить путь",
  },
  {
    id: "signal",
    label: "02",
    name: "Cobalt Signal",
    premise: "Более собранный, контрастный mobile product: чёткие статусы, уверенный primary action и плотная навигация.",
    strength: "Лучше всего для активного цикла заданий и быстрых решений в Mini App.",
    risk: "Нужен жёсткий лимит cobalt: он остаётся только сигналом, а не фоном для всего.",
    hero: "Следующий шаг готов",
    action: "Открыть задание",
  },
  {
    id: "field",
    label: "03",
    name: "Field Notes",
    premise: "Тёплый human-first журнал команды: фактура, фотографии и короткие истории, но без декоративного шума.",
    strength: "Лучше всего раскрывает живые моменты команды и фотогалерею.",
    risk: "Не должен превращаться в «бумажный» эффект; контраст и чтение остаются приоритетом.",
    hero: "Команда в действии",
    action: "Смотреть моменты",
  },
];
