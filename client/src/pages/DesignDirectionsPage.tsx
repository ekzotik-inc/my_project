import { ArrowRight, BookOpen, CalendarDays, ChevronRight, Compass, HeartHandshake, Image, Leaf, Menu, Plus, Trophy, Users, Zap } from "lucide-react";
import { useState } from "react";
import { designDirections, type DesignDirection } from "@/designLabDirections";
import "@/designLabV2.css";
import "@/designLabV2-extra.css";

function EditorialPhone() {
  return <section className="prototype-phone prototype-editorial" aria-label="Impact Journal prototype">
    <header className="editorial-top"><span>АВГУСТ · 2026</span><button type="button" aria-label="Меню"><Menu size={18} /></button></header>
    <main className="editorial-body">
      <p className="editorial-eyebrow">МОЙ ЖУРНАЛ ВКЛАДА</p><h2>Добрые дела<br /><em>в движении</em></h2>
      <div className="editorial-score"><strong>12</strong><span>подтверждённых<br />дел за период</span></div><div className="editorial-rule" />
      <section className="editorial-timeline" aria-label="Хронология вклада">
        <div><b>01</b><p><strong>Следующий шаг</strong><span>Задание недели ждёт участия</span></p><ChevronRight size={17} /></div>
        <div><b>02</b><p><strong>Командный след</strong><span>7 дел помогли команде вырасти</span></p><ChevronRight size={17} /></div>
      </section>
      <section className="editorial-photo-chapter"><div className="editorial-photo-graphic"><span className="editorial-sun" /><span className="editorial-hill hill-a" /><span className="editorial-hill hill-b" /></div><div><span>ГЛАВА НЕДЕЛИ · ПОДТВЕРЖДЕНО</span><strong>Общий день<br />на природе</strong><small>Один момент, который остался с командой</small></div></section>
    </main>
    <footer className="editorial-footer"><span><Leaf size={16} /> Маршрут</span><span>Галерея</span><span>Команда</span><button type="button">Продолжить <ArrowRight size={16} /></button></footer>
  </section>;
}

function SignalPhone() {
  return <section className="prototype-phone prototype-signal" aria-label="Action Console prototype">
    <header className="signal-top"><div><span className="signal-live-dot" /> ПЕРИОД АКТИВЕН</div><button type="button" aria-label="Меню"><Menu size={18} /></button></header>
    <main className="signal-body">
      <div className="signal-breadcrumb"><Compass size={15} /> МОЙ МАРШРУТ <span>/</span> СЕГОДНЯ</div>
      <section className="signal-command"><span>ЗАДАЧА В ФОКУСЕ</span><h2>Соберите<br />команду</h2><p>Одно действие, которое даст +40 к общему прогрессу.</p><button type="button">Открыть задачу <ArrowRight size={17} /></button></section>
      <section className="signal-progress"><div><span>ПРОГРЕСС ПЕРИОДА</span><strong>72%</strong></div><div className="signal-rail"><i /></div><p><b>9 из 12</b> шагов подтверждено</p></section>
      <section className="signal-cells" aria-label="Ключевые показатели">
        <div><span>ЛИЧНЫЙ ВКЛАД</span><strong>223<small>б</small></strong><i>+40 после задачи</i></div><div><span>КОМАНДА</span><strong>2<small>место</small></strong><i>в рейтинге периода</i></div>
        <div><span>ДОСТИЖЕНИЯ</span><strong>2<small>/9</small></strong><i>получено</i></div><div><span>ФОТОИСТОРИИ</span><strong>4<small>новых</small></strong><i>в галерее</i></div>
      </section>
      <section className="signal-feed"><span>ПОСЛЕДНИЙ СИГНАЛ</span><p><Zap size={16} /><b>Отчёт подтверждён.</b> Баллы добавлены в общий зачёт.</p></section>
    </main>
    <footer className="signal-dock"><nav><span className="active"><Leaf size={19} />Путь</span><span><Image size={19} />Фото</span><span><Users size={19} />Команда</span><span><Trophy size={19} />Топ</span></nav><button type="button">Начать <ArrowRight size={18} /></button></footer>
  </section>;
}

function MosaicPhone() {
  return <section className="prototype-phone prototype-mosaic" aria-label="Community Mosaic prototype">
    <header className="mosaic-top"><div className="mosaic-logo"><span><HeartHandshake size={16} /></span><b>ДОБРЫЕ<br />ДЕЛА</b></div><button type="button" aria-label="Календарь"><CalendarDays size={18} /></button></header>
    <main className="mosaic-body">
      <p className="mosaic-kicker">КОМАНДА · ВМЕСТЕ</p><h2>Маленькие шаги.<br /><em>Общий след.</em></h2>
      <section className="mosaic-collage" aria-label="Обезличенная фотомозаика"><div className="mosaic-tile tile-hero"><p>42<br /><small>момента</small></p></div><div className="mosaic-tile tile-sky"><span className="shape-star" /></div><div className="mosaic-tile tile-leaf"><span className="shape-leaf" /></div><div className="mosaic-tile tile-note"><p>Новый<br />день<br /><i>вместе</i></p></div></section>
      <section className="mosaic-pulse"><div className="mosaic-ring"><span>72<small>%</small></span></div><p><b>Пульс команды</b><span>До общей цели осталось 3 подтверждённых дела.</span></p><ChevronRight size={18} /></section>
      <section className="mosaic-stories"><div><span>СЕГОДНЯ</span><p><b>Команда вышла на прогулку</b><small>3 фото добавлены после проверки</small></p></div><div><span>ВЧЕРА</span><p><b>Ещё одно достижение близко</b><small>Остался один шаг до награды</small></p></div></section>
    </main>
    <footer className="mosaic-dock"><span><Leaf size={19} />Путь</span><span><Image size={19} />Фото</span><button type="button"><Plus size={22} />Поделиться</button><span><Users size={19} />Команда</span><span><BookOpen size={19} />Ещё</span></footer>
  </section>;
}

function Prototype({ direction }: { direction: DesignDirection }) {
  if (direction.id === "signal") return <SignalPhone />;
  if (direction.id === "mosaic") return <MosaicPhone />;
  return <EditorialPhone />;
}

export default function DesignDirectionsPage() {
  const [selectedId, setSelectedId] = useState<DesignDirection["id"]>(() => {
    const requested = new URLSearchParams(window.location.search).get("direction");
    return designDirections.some((direction) => direction.id === requested) ? requested as DesignDirection["id"] : "editorial";
  });
  const selected = designDirections.find((direction) => direction.id === selectedId) ?? designDirections[0];
  return <main className="design-lab-page design-lab-v2">
    <section className="design-lab-header"><div><p>DESIGN LAB · ТРИ РАЗНЫЕ СИСТЕМЫ</p><h1>Не цвета.<br />Три способа<br />прожить продукт.</h1><span>Один сценарий «Мой путь + Галерея», но разные типографика, графика, логика экрана, способ показать данные и навигация.</span></div><div className="design-lab-rules"><CheckIcon /> Отдельная type system<br /><CheckIcon /> Отдельная information architecture<br /><CheckIcon /> Отдельная navigation model</div></section>
    <div className="direction-selector" role="tablist" aria-label="Выбор направления">{designDirections.map((direction) => <button key={direction.id} role="tab" aria-selected={selectedId === direction.id} type="button" onClick={() => setSelectedId(direction.id)}><span>{direction.label}</span>{direction.name}</button>)}</div>
    <section className="design-lab-content"><Prototype direction={selected} /><aside className="direction-brief direction-brief-v2" data-direction={selected.id}><p className="direction-number">КОНЦЕПЦИЯ {selected.label}</p><h2>{selected.name}</h2><p className="direction-premise">{selected.premise}</p><dl><div><dt>ТИПОГРАФИКА</dt><dd>{selected.typography}</dd></div><div><dt>КОМПОНОВКА</dt><dd>{selected.layout}</dd></div><div><dt>НАВИГАЦИЯ</dt><dd>{selected.navigation}</dd></div></dl><div className="direction-evaluation"><span>СИЛЬНАЯ СТОРОНА</span><p>{selected.strength}</p><span>ДИЗАЙН-РИСК</span><p>{selected.risk}</p></div><p className="direction-decision">Здесь нужно выбрать не понравившийся цвет, а язык, которым продукт будет говорить на всех participant-экранах.</p></aside></section>
  </main>;
}

function CheckIcon() { return <span className="lab-check">✓</span>; }
