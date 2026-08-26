import { Dialog, DialogContent } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { applyTelegramSafeAreas, getTelegramWebApp, telegramImpact, telegramSelectionHaptic, telegramSupportsVersion } from "@/lib/telegramNative";
import { ChevronLeft, ChevronRight, ImageOff, Images, LoaderCircle, Maximize2, Sparkles, X } from "lucide-react";
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

type GalleryPhoto = { id: number; imageUrl: string; activityTitle: string; teamName: string | null; createdAt: Date };
type Direction = "prev" | "next";

function formatPhotoDate(value: Date) {
  return new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export default function GalleryPage() {
  const [, setLocation] = useLocation();
  const app = getTelegramWebApp();
  const initData = app?.initData || "";
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const drag = useRef<{ pointerId: number | null; startX: number }>({ pointerId: null, startX: 0 });
  const suppressTap = useRef(false);
  const canFullscreen = Boolean(telegramSupportsVersion(app, "8.0") && app?.requestFullscreen && !app.isFullscreen);
  const gallery = trpc.gallery.feed.useInfiniteQuery(
    { initData, limit: 12 },
    { enabled: Boolean(initData), retry: false, getNextPageParam: lastPage => lastPage.nextCursor ?? undefined },
  );
  const photos = useMemo(() => gallery.data?.pages.flatMap(page => page.items) ?? [], [gallery.data]);
  const current = photos[activeIndex] ?? null;
  const queued = [0, 1, 2].map(offset => ({ offset, photo: photos[activeIndex + offset] })).filter((item): item is { offset: number; photo: GalleryPhoto } => Boolean(item.photo));

  useEffect(() => {
    const telegram = getTelegramWebApp();
    if (!telegram) return;
    const background = telegram.themeParams?.bg_color || "#F7F4EA";
    telegram.ready();
    telegram.expand();
    if (telegramSupportsVersion(telegram, "6.1")) {
      telegram.setHeaderColor?.(background);
      telegram.setBackgroundColor?.(background);
      telegram.BackButton?.show();
    }
    applyTelegramSafeAreas(telegram);
    const goBack = () => { telegramImpact("light"); setLocation("/statistics"); };
    const updateSafeAreas = () => applyTelegramSafeAreas(telegram);
    if (telegramSupportsVersion(telegram, "6.1")) telegram.BackButton?.onClick(goBack);
    if (telegramSupportsVersion(telegram, "8.0")) {
      telegram.onEvent?.("safeAreaChanged", updateSafeAreas);
      telegram.onEvent?.("contentSafeAreaChanged", updateSafeAreas);
    }
    return () => {
      if (telegramSupportsVersion(telegram, "6.1")) telegram.BackButton?.offClick(goBack);
      if (telegramSupportsVersion(telegram, "8.0")) {
        telegram.offEvent?.("safeAreaChanged", updateSafeAreas);
        telegram.offEvent?.("contentSafeAreaChanged", updateSafeAreas);
      }
    };
  }, [setLocation]);

  useEffect(() => {
    if (activeIndex >= photos.length && photos.length) setActiveIndex(photos.length - 1);
  }, [activeIndex, photos.length]);

  useEffect(() => {
    if (photos.length && activeIndex >= photos.length - 3 && gallery.hasNextPage && !gallery.isFetchingNextPage) gallery.fetchNextPage();
  }, [activeIndex, gallery, photos.length]);

  const move = (direction: Direction) => {
    if (!photos.length) return;
    if (direction === "next") {
      if (activeIndex < photos.length - 1) setActiveIndex(value => value + 1);
      else if (gallery.hasNextPage && !gallery.isFetchingNextPage) gallery.fetchNextPage();
    } else if (activeIndex > 0) {
      setActiveIndex(value => value - 1);
    }
    telegramSelectionHaptic();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { pointerId: event.pointerId, startX: event.clientX };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current.pointerId !== event.pointerId) return;
    setDragX(Math.max(-80, Math.min(80, event.clientX - drag.current.startX)));
  };
  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.current.startX;
    drag.current.pointerId = null;
    if (Math.abs(distance) >= 42) {
      suppressTap.current = true;
      move(distance < 0 ? "next" : "prev");
      window.setTimeout(() => { suppressTap.current = false; }, 0);
    }
    setDragX(0);
  };

  if (!initData) return <GalleryFallback />;
  if (gallery.isLoading) return <GalleryLoading />;
  if (gallery.error) return <GalleryMessage title="Галерея пока недоступна" body={gallery.error.message || "Попробуйте открыть этот экран ещё раз из Telegram."} />;
  if (!current) return <GalleryMessage title="Фотографии появятся здесь" body="Когда P&C подтвердит первые фотоотчёты, они появятся в общей галерее." />;

  return <main className="min-h-screen bg-[#F7F4EA] pb-[calc(2rem+var(--tg-safe-bottom))] pl-[var(--tg-safe-left)] pr-[var(--tg-safe-right)] pt-[var(--tg-safe-top)] text-[#17233D]"><div className="mx-auto max-w-xl px-4 pb-6 pt-4 sm:px-6"><header className="flex items-center justify-between"><button onClick={() => { telegramImpact("light"); setLocation("/statistics"); }} className="soft-press grid h-10 w-10 place-items-center rounded-2xl border border-black/[0.045] bg-white/85 shadow-[0_10px_22px_-18px_rgba(22,63,47,0.4)]" aria-label="Вернуться к статистике"><ChevronLeft className="h-5 w-5" /></button><div className="text-right"><p className="journal-kicker text-[#316CFF]">ОБЩАЯ ГАЛЕРЕЯ</p><p className="mt-0.5 text-xs font-bold text-[#536078]">Подтверждённые моменты команды</p></div>{canFullscreen ? <button onClick={() => { telegramImpact("light"); app?.requestFullscreen?.(); }} className="soft-press grid h-10 w-10 place-items-center rounded-2xl border border-black/[0.045] bg-white/85 shadow-[0_10px_22px_-18px_rgba(22,63,47,0.4)]" aria-label="Открыть на весь экран"><Maximize2 className="h-4 w-4" /></button> : <span className="h-10 w-10" />}</header><section className="relative mt-5 overflow-hidden rounded-[2rem] bg-[#17233D] px-6 py-7 text-white shadow-[0_25px_60px_-35px_rgba(22,35,61,0.72)]"><div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#DDF75D] opacity-90" /><div className="absolute -bottom-8 right-16 h-20 w-20 rotate-12 rounded-[1.4rem] bg-[#F4B7A9]" /><div className="relative"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/14"><Images className="h-5 w-5" /></span><p className="mt-5 text-[10px] font-extrabold tracking-[0.14em] text-white/65">ДОБРЫЕ ДЕЛА В КАДРЕ</p><h1 className="journal-display mt-2 max-w-[17rem] text-[2.45rem] leading-[0.94]">Моменты, которыми делится команда</h1><p className="mt-4 max-w-[18rem] text-sm leading-5 text-white/72">В галерею попадают только фотографии из отчётов, которые уже подтвердила P&C.</p></div></section><section className="gallery-surface mt-4 rounded-[1.75rem] p-4"><div className="flex items-center justify-between gap-3"><div><p className="journal-label">ЛЕНТА</p><h2 className="mt-1 text-xl font-extrabold tracking-[-0.045em]">Листайте карточки</h2></div><span className="gallery-counter">{activeIndex + 1} · {photos.length}{gallery.hasNextPage ? "+" : ""}</span></div><div className="gallery-stack-viewport relative mt-5 aspect-[4/5] select-none" style={{ touchAction: "pan-y" }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}>{[...queued].reverse().map(({ photo, offset }) => { const isFront = offset === 0; const translateX = isFront ? dragX : 0; return <button key={photo.id} type="button" onClick={() => { if (isFront && !suppressTap.current) { telegramImpact("light"); setSelectedPhoto(photo); } }} className="gallery-stack-card absolute inset-x-0 top-0 overflow-hidden rounded-[1.65rem] text-left outline-none focus-visible:ring-2 focus-visible:ring-[#316CFF]" style={{ zIndex: 4 - offset, opacity: 1 - offset * 0.2, transform: `translate3d(${translateX}px, ${offset * 13}px, 0) scale(${1 - offset * 0.038})`, pointerEvents: isFront ? "auto" : "none" }} aria-label={isFront ? `Открыть фотографию: ${photo.activityTitle}` : undefined}><img src={photo.imageUrl} alt={isFront ? `Фотография с активности «${photo.activityTitle}»` : ""} aria-hidden={!isFront} draggable={false} loading={isFront ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover" /><span className="gallery-photo-shade" /><span className="absolute inset-x-4 bottom-4 z-10"><span className="block text-[10px] font-extrabold tracking-[0.14em] text-white/70">{photo.teamName || "КОМАНДА"}</span><span className="mt-1 block line-clamp-2 text-lg font-extrabold leading-5 text-white">{photo.activityTitle}</span><span className="mt-2 block text-[11px] font-bold text-white/74">{formatPhotoDate(photo.createdAt)} · нажмите, чтобы раскрыть</span></span></button>; })}</div><div className="mt-5 flex items-center justify-between gap-3"><button type="button" onClick={() => move("prev")} disabled={activeIndex === 0} className="gallery-nav-button" aria-label="Предыдущая фотография"><ChevronLeft className="h-5 w-5" /><span>Назад</span></button><div className="flex items-center gap-1.5" aria-live="polite">{[0, 1, 2].map(offset => <span key={offset} className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ${offset === 0 ? "w-5 bg-[#316CFF]" : "w-1.5 bg-[#D8E0F5]"}`} />)}</div><button type="button" onClick={() => move("next")} disabled={activeIndex === photos.length - 1 && !gallery.hasNextPage} className="gallery-nav-button gallery-nav-button-primary" aria-label="Следующая фотография"><span>{gallery.isFetchingNextPage ? "Загрузка" : "Дальше"}</span>{gallery.isFetchingNextPage ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-5 w-5" />}</button></div>{gallery.hasNextPage && <button type="button" onClick={() => gallery.fetchNextPage()} disabled={gallery.isFetchingNextPage} className="soft-press mt-4 w-full rounded-xl py-2.5 text-xs font-extrabold text-[#3158C9] disabled:opacity-50">{gallery.isFetchingNextPage ? "Подгружаем фотографии…" : "Показать ещё"}</button>}</section><section className="mt-4 flex gap-3 rounded-[1.35rem] bg-[#EEF2FF] p-4 text-[#3158C9]"><Sparkles className="mt-0.5 h-5 w-5 shrink-0" /><p className="text-xs leading-5">Галерея не показывает чеки, документы, комментарии или контакты. Только одобренные фотографии и минимальный контекст активности.</p></section></div><Dialog open={Boolean(selectedPhoto)} onOpenChange={open => !open && setSelectedPhoto(null)}>{selectedPhoto && <DialogContent className="gallery-lightbox max-w-[calc(100%-1.5rem)] overflow-hidden rounded-[1.75rem] border-0 bg-[#111827] p-0 text-white shadow-2xl"><img src={selectedPhoto.imageUrl} alt={`Фотография с активности «${selectedPhoto.activityTitle}»`} decoding="async" className="max-h-[70vh] w-full object-contain" /><div className="p-5"><p className="text-[10px] font-extrabold tracking-[0.14em] text-white/60">{selectedPhoto.teamName || "КОМАНДА"}</p><p className="mt-1 text-lg font-extrabold">{selectedPhoto.activityTitle}</p><p className="mt-2 text-xs text-white/65">{formatPhotoDate(selectedPhoto.createdAt)}</p></div></DialogContent>}</Dialog></main>;
}

function GalleryLoading() {
  return <main className="min-h-screen bg-[#F7F4EA] p-5"><div className="mx-auto max-w-xl animate-pulse"><div className="h-11 w-11 rounded-2xl bg-white" /><div className="mt-5 h-56 rounded-[2rem] bg-[#17233D]/90" /><div className="mt-4 aspect-[4/5] rounded-[1.75rem] bg-white" /></div></main>;
}

function GalleryFallback() {
  return <GalleryMessage title="Откройте галерею в Telegram" body="Безопасный доступ к фотографиям доступен только из Mini App, открытого через кнопку «Статистика» в боте." />;
}

function GalleryMessage({ title, body }: { title: string; body: string }) {
  return <main className="min-h-screen bg-[#F7F4EA] p-5 text-[#17233D]"><div className="mx-auto mt-24 max-w-sm rounded-[1.8rem] bg-white p-7 text-center shadow-[0_20px_50px_-35px_rgba(22,35,61,0.42)]"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#EEF2FF] text-[#316CFF]"><ImageOff className="h-6 w-6" /></span><h1 className="mt-5 text-xl font-extrabold tracking-[-0.045em]">{title}</h1><p className="mt-3 text-sm leading-6 text-[#566177]">{body}</p></div></main>;
}
