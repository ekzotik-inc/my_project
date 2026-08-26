export type DesignDirection = {
  id: "editorial" | "signal" | "mosaic";
  label: string;
  name: string;
  premise: string;
  strength: string;
  risk: string;
  typography: string;
  layout: string;
  navigation: string;
};

export const designDirections: DesignDirection[] = [
  {
    id: "editorial",
    label: "01",
    name: "Impact Journal",
    premise: "Личный маршрут как спокойный журнал вклада: крупное число, линейная хронология и один доказанный момент недели.",
    strength: "Даёт больше смысла и воздуха: человек читает свою историю, а не сканирует dashboard.",
    risk: "Подходит, только если дисциплинированно сохранять один главный результат и не возвращать сетку равнозначных KPI.",
    typography: "Serif display + спокойный sans-serif текст",
    layout: "Вертикальная хронология, full-bleed photo chapter, CTA как завершающая строка",
    navigation: "Тонкая текстовая нижняя рейка без отдельной яркой капсулы",
  },
  {
    id: "signal",
    label: "02",
    name: "Action Console",
    premise: "Telegram-native рабочая консоль: status bar, одна задача в фокусе, измеримые метрики и большая нижняя команда.",
    strength: "Лучший вариант для регулярного прохождения заданий: следующий шаг и состояние считываются за секунды.",
    risk: "Нужно удержать тон дружелюбным: данные и status signals не должны превращать добрые дела в сухой трекер.",
    typography: "Точная grotesk type + tabular цифры и короткие labels",
    layout: "Command module, progress rail, data cells и sticky action dock",
    navigation: "Компактная icon rail с отдельной строкой текущего раздела",
  },
  {
    id: "mosaic",
    label: "03",
    name: "Community Mosaic",
    premise: "Участие как живая мозаика команды: фотографии и общие жесты идут первыми, а прогресс собран в human-friendly pulse.",
    strength: "Лучше всего показывает, ради чего существует программа: общие моменты, люди и ощутимый командный импакт.",
    risk: "Мозаика требует строгого отбора фото и коротких подписей, иначе экран станет перегруженной лентой.",
    typography: "Тёплый rounded display + прямой интерфейсный текст",
    layout: "Асимметричная photo mosaic, team pulse и короткие story fragments",
    navigation: "Плавающий social dock с центральным действием «Поделиться»",
  },
];
