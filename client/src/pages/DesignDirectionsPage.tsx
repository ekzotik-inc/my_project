import { ArrowRight, BookOpen, Camera, Check, ChevronRight, Image, Leaf, Sparkles, Trophy, Users } from "lucide-react";
import { useState } from "react";
import { designDirections, type DesignDirection } from "@/designLabDirections";

function PreviewNav({ direction }: { direction: DesignDirection }) {
  return (
    <nav aria-label="Демонстрационная нижняя навигация" className="direction-preview-nav">
      <span className="is-active"><Leaf size={17} />Путь</span>
      <span><Image size={17} />Галерея</span>
      <span><Users size={17} />Команда</span>
      <span><Trophy size={17} />Лидеры</span>
      <span><BookOpen size={17} />Помощь</span>
    </nav>
  );
}

function MediaPlaceholder({ direction }: { direction: DesignDirection }) {
  return (
    <div className="direction-preview-media" aria-label="Обезличенный макет подтверждённой фотографии">
      <div className="direction-media-sun" />
      <div className="direction-media-arch direction-media-arch-a" />
      <div className="direction-media-arch direction-media-arch-b" />
      <div className="direction-media-caption">
        <span><Camera size={13} /> ПОДТВЕРЖДЁННЫЙ МОМЕНТ</span>
        <strong>{direction.id === "field" ? "Общее дело недели" : "Команда вместе"}</strong>
        <small>Обезличенный пример для выбора стиля</small>
      </div>
    </div>
  );
}

function DirectionPhone({ direction }: { direction: DesignDirection }) {
  const isSignal = direction.id === "signal";
  const isField = direction.id === "field";

  return (
    <section className="direction-phone" data-direction={direction.id} aria-label={`Предпросмотр направления ${direction.name}`}>
      <header className="direction-preview-topbar">
        <span className="direction-mini-brand"><span /> ДОБРЫЕ ДЕЛА</span>
        <button type="button" aria-label="Демонстрационное меню"><span /><span /><span /></button>
      </header>
      <div className="direction-preview-scroll">
        <div className="direction-context-row">
          <span>ПЕРИОД · НЕДЕЛЯ ДОБРЫХ ДЕЛ</span>
          <span className="direction-context-status"><Check size={13} /> активен</span>
        </div>

        <section className="direction-hero-block">
          <p>{isSignal ? "СЕГОДНЯ" : isField ? "ИСТОРИЯ НЕДЕЛИ" : "ЛИЧНЫЙ ВКЛАД"}</p>
          <h1>{direction.hero}</h1>
          <div className="direction-hero-detail">
            <strong>{isField ? "4" : isSignal ? "1" : "12"}</strong>
            <span>{isField ? "фото в ленте" : isSignal ? "задание ждёт" : "из 20 достижений"}</span>
          </div>
          <button type="button" className="direction-primary-action">
            {direction.action}<ArrowRight size={17} />
          </button>
        </section>

        <section className="direction-section-block direction-progress-block">
          <div className="direction-section-heading"><span>В ЭТОМ ПЕРИОДЕ</span><button type="button">Все <ChevronRight size={15} /></button></div>
          <div className="direction-progress-line"><span style={{ width: isSignal ? "72%" : isField ? "48%" : "61%" }} /></div>
          <div className="direction-progress-meta"><strong>{isSignal ? "72%" : isField ? "3 из 6" : "7 из 12"}</strong><span>{isField ? "маленьких шагов пройдено" : "дел подтверждено"}</span></div>
        </section>

        <section className="direction-section-block direction-gallery-block">
          <div className="direction-section-heading"><span>{isField ? "ФОТОИСТОРИЯ" : "ГАЛЕРЕЯ КОМАНДЫ"}</span><button type="button">Смотреть <ChevronRight size={15} /></button></div>
          <MediaPlaceholder direction={direction} />
        </section>

        <section className="direction-section-block direction-feed-block">
          <div className="direction-section-heading"><span>{isField ? "ПОСЛЕДНИЕ ШАГИ" : "ЖИВАЯ ЛЕНТА"}</span></div>
          <article><span className="direction-feed-mark"><Sparkles size={17} /></span><p><strong>Новое дело подтверждено</strong><small>Команда получила результат в общий зачёт</small></p><time>сегодня</time></article>
          <article><span className="direction-feed-mark"><Users size={17} /></span><p><strong>Команда растёт вместе</strong><small>Ещё один участник присоединился к периоду</small></p><time>вчера</time></article>
        </section>
      </div>
      <PreviewNav direction={direction} />
    </section>
  );
}

export default function DesignDirectionsPage() {
  const [selectedId, setSelectedId] = useState<DesignDirection["id"]>("quiet");
  const selected = designDirections.find((direction) => direction.id === selectedId) ?? designDirections[0];

  return (
    <main className="design-lab-page">
      <section className="design-lab-header">
        <div>
          <p>DESIGN LAB · НЕ PRODUCTION SCREEN</p>
          <h1>Три направления для<br />«Добрых дел»</h1>
          <span>Один сценарий, три разные visual системы. Макеты не используют реальные фото, имена или данные участников.</span>
        </div>
        <div className="design-lab-rules"><Check size={18} /> Один focal point<br /><Check size={18} /> Telegram-native touch<br /><Check size={18} /> Без visual шума</div>
      </section>

      <div className="direction-selector" role="tablist" aria-label="Выбор направления">
        {designDirections.map((direction) => (
          <button key={direction.id} role="tab" aria-selected={selectedId === direction.id} type="button" onClick={() => setSelectedId(direction.id)}>
            <span>{direction.label}</span>{direction.name}
          </button>
        ))}
      </div>

      <section className="design-lab-content">
        <DirectionPhone direction={selected} />
        <aside className="direction-brief" data-direction={selected.id}>
          <p className="direction-number">НАПРАВЛЕНИЕ {selected.label}</p>
          <h2>{selected.name}</h2>
          <p className="direction-premise">{selected.premise}</p>
          <div><span>СИЛЬНАЯ СТОРОНА</span><p>{selected.strength}</p></div>
          <div><span>ДИЗАЙН-РИСК</span><p>{selected.risk}</p></div>
          <p className="direction-decision">Выберите направление, если именно это ощущение должно стать общим языком всех participant-экранов.</p>
        </aside>
      </section>
    </main>
  );
}
