import { Dialog, DialogContent } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { telegramImpact, telegramSelectionHaptic } from "@/lib/telegramNative";
import { ChevronLeft, ChevronRight, ImageOff, Images, LoaderCircle } from "lucide-react";
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";

type GalleryPhoto = { id: number; imageUrl: string; activityTitle: string; teamName: string | null; createdAt: Date };
type Direction = "prev" | "next";
type DeckTransition = { direction: Direction; outgoing: GalleryPhoto; incoming: GalleryPhoto } | null;
type DragState = { pointerId: number | null; startX: number; startY: number };

const deckGeometry = [
  { x: 0, y: 0, rotate: -1.2, scale: 1 },
  { x: -3, y: -14, rotate: -2.8, scale: 0.972 },
  { x: 4, y: -28, rotate: 2.6, scale: 0.944 },
] as const;

function formatPhotoDate(value: Date) {
  return new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function ParticipantPhotoGallery({ initData }: { initData: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [transition, setTransition] = useState<DeckTransition>(null);
  const drag = useRef<DragState>({ pointerId: null, startX: 0, startY: 0 });
  const suppressTap = useRef(false);
  const gallery = trpc.gallery.feed.useInfiniteQuery(
    { initData, limit: 12 },
    { enabled: Boolean(initData), retry: false, getNextPageParam: lastPage => lastPage.nextCursor ?? undefined },
  );
  const photos = useMemo(() => gallery.data?.pages.flatMap(page => page.items) ?? [], [gallery.data]);
  const current = photos[activeIndex] ?? null;
  const deckCards = useMemo(() => {
    if (!photos.length) return [];
    return deckGeometry.map((geometry, depth) => ({ depth, geometry, photo: photos[(activeIndex + depth) % photos.length]! }));
  }, [activeIndex, photos]);

  useEffect(() => {
    if (activeIndex >= photos.length && photos.length) setActiveIndex(photos.length - 1);
  }, [activeIndex, photos.length]);

  useEffect(() => {
    if (photos.length && activeIndex >= photos.length - 3 && gallery.hasNextPage && !gallery.isFetchingNextPage) void gallery.fetchNextPage();
  }, [activeIndex, gallery, photos.length]);

  const move = (direction: Direction) => {
    if (!current || transition) return;
    const nextIndex = direction === "next" ? activeIndex + 1 : activeIndex - 1;
    const incoming = photos[nextIndex];
    if (!incoming) {
      if (direction === "next" && gallery.hasNextPage && !gallery.isFetchingNextPage) void gallery.fetchNextPage();
      return;
    }
    setTransition({ direction, outgoing: current, incoming });
    telegramSelectionHaptic();
    window.setTimeout(() => {
      setActiveIndex(nextIndex);
      setTransition(null);
    }, 260);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.current.startX;
    const verticalDistance = event.clientY - drag.current.startY;
    const stageWidth = event.currentTarget.clientWidth;
    const requiredDistance = Math.max(88, Math.min(120, stageWidth * 0.25));
    const isHorizontal = Math.abs(distance) > Math.abs(verticalDistance) * 1.35;
    drag.current = { pointerId: null, startX: 0, startY: 0 };
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (isHorizontal && Math.abs(distance) >= 12) {
      suppressTap.current = true;
      window.setTimeout(() => { suppressTap.current = false; }, 280);
    }
    if (isHorizontal && Math.abs(distance) >= requiredDistance) {
      move(distance < 0 ? "next" : "prev");
    }
  };
  const onPointerCancel = () => {
    drag.current = { pointerId: null, startX: 0, startY: 0 };
  };

  if (gallery.isLoading) return <GalleryLoading />;
  if (gallery.error) return <GalleryMessage title="Галерея пока недоступна" body={gallery.error.message || "Попробуйте открыть вкладку ещё раз из Telegram."} />;
  if (!current) return <GalleryMessage title="Фотографии появятся здесь" body="Когда P&C подтвердит первые фотоотчёты, они появятся в общей галерее." />;

  const canMovePrev = activeIndex > 0 && !transition;
  const canMoveNext = activeIndex < photos.length - 1 && !transition;
  const frontGeometry = deckGeometry[0];

  return <><section className="origin-gallery-hero relative overflow-hidden rounded-[1.45rem] px-5 py-5 text-white"><div className="origin-gallery-orb origin-gallery-orb-lime" /><div className="relative"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/12"><Images className="h-4 w-4" /></span><p className="mt-3 text-[9px] font-extrabold tracking-[0.14em] text-white/65">ОБЩАЯ ГАЛЕРЕЯ</p><h1 className="journal-display mt-1.5 max-w-[17rem] text-[2.12rem] leading-[0.92]">Добрые дела в кадре</h1><p className="mt-3 max-w-[18rem] text-xs leading-5 text-white/72">Подтверждённые P&C моменты команды в одной ленте.</p></div></section><section className="origin-gallery-surface mt-3 rounded-[1.45rem] p-4"><div className="flex items-center justify-between gap-3"><div><p className="journal-label">ФОТОИСТОРИИ</p><h2 className="mt-1 text-lg font-extrabold tracking-[-0.045em]">Лента команды</h2></div><span className="gallery-counter">{activeIndex + 1} / {photos.length}{gallery.hasNextPage ? "+" : ""}</span></div><div className="origin-stack-stage relative mt-3 aspect-[5/6] select-none" style={{ touchAction: "pan-y" }} onPointerDown={onPointerDown} onPointerUp={onPointerEnd} onPointerCancel={onPointerCancel}>{[...deckCards].reverse().map(({ depth, geometry, photo }) => { const isFront = depth === 0; const isIncomingNext = transition?.direction === "next" && depth === 1; const isOutgoing = Boolean(transition) && isFront; const transform = isOutgoing ? `translate3d(${transition?.direction === "next" ? "-118%" : "118%"}, ${geometry.y}px, 0) rotate(${transition?.direction === "next" ? -9 : 9}deg) scale(${geometry.scale})` : isIncomingNext ? `translate3d(0, ${frontGeometry.y}px, 0) rotate(${frontGeometry.rotate}deg) scale(${frontGeometry.scale})` : `translate3d(${geometry.x}px, ${geometry.y}px, 0) rotate(${geometry.rotate}deg) scale(${geometry.scale})`; return <button key={`${photo.id}-${depth}`} type="button" onClick={() => { if (isFront && !suppressTap.current && !transition) { telegramImpact("light"); setSelectedPhoto(photo); } }} className="origin-stack-plane kod-photo-card absolute inset-x-0 top-[2.8rem] overflow-hidden rounded-[1.1rem] text-left outline-none focus-visible:ring-2 focus-visible:ring-[#316CFF]" style={{ zIndex: 8 - depth, opacity: isOutgoing ? 0 : 1 - depth * 0.1, transform, pointerEvents: isFront ? "auto" : "none" }} aria-label={isFront ? `Открыть фотографию: ${photo.activityTitle}` : undefined}><img src={photo.imageUrl} alt={isFront ? `Фотография с активности «${photo.activityTitle}»` : ""} aria-hidden={!isFront} draggable={false} loading={isFront ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover" />{isFront && <><span className="origin-stack-shade" /><span className="kod-photo-caption absolute inset-x-0 bottom-0 z-10"><span className="kod-photo-meta">{photo.teamName || "КОМАНДА"} <i /> {formatPhotoDate(photo.createdAt)}</span><span className="mt-2 block line-clamp-2 text-[1.35rem] font-extrabold leading-6 text-white">{photo.activityTitle}</span><span className="mt-2 block text-[10px] font-bold text-white/78">Коснитесь, чтобы открыть полный кадр</span></span></>}</button>; })}{transition?.direction === "prev" && <div className="origin-stack-incoming-card origin-stack-incoming-card-prev absolute inset-x-0 top-[2.8rem] z-[7] overflow-hidden rounded-[1.1rem]"><img src={transition.incoming.imageUrl} alt="" aria-hidden="true" draggable={false} className="h-full w-full object-cover" /></div>}</div><div className="mt-3 flex items-center justify-between gap-3"><button type="button" onClick={() => move("prev")} disabled={!canMovePrev} className="gallery-nav-button" aria-label="Предыдущая фотография"><ChevronLeft className="h-5 w-5" /><span>Назад</span></button><p className="text-center text-[10px] font-bold leading-4 text-[#66718A]">Проведите по фото</p><button type="button" onClick={() => move("next")} disabled={!canMoveNext} className="gallery-nav-button gallery-nav-button-primary" aria-label="Следующая фотография"><span>{gallery.isFetchingNextPage ? "Загрузка" : "Дальше"}</span>{gallery.isFetchingNextPage ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-5 w-5" />}</button></div>{gallery.hasNextPage && <button type="button" onClick={() => gallery.fetchNextPage()} disabled={gallery.isFetchingNextPage} className="soft-press mt-3 w-full rounded-xl py-2.5 text-xs font-extrabold text-[#3158C9] disabled:opacity-50">{gallery.isFetchingNextPage ? "Подгружаем фотографии…" : "Показать ещё"}</button>}</section><Dialog open={Boolean(selectedPhoto)} onOpenChange={open => !open && setSelectedPhoto(null)}>{selectedPhoto && <DialogContent className="gallery-lightbox max-w-[calc(100%-1.5rem)] overflow-hidden rounded-[1.75rem] border-0 bg-[#111827] p-0 text-white shadow-2xl"><img src={selectedPhoto.imageUrl} alt={`Фотография с активности «${selectedPhoto.activityTitle}»`} decoding="async" className="max-h-[70vh] w-full object-contain" /><div className="p-5"><p className="text-[10px] font-extrabold tracking-[0.14em] text-white/60">{selectedPhoto.teamName || "КОМАНДА"}</p><p className="mt-1 text-lg font-extrabold">{selectedPhoto.activityTitle}</p><p className="mt-2 text-xs text-white/65">{formatPhotoDate(selectedPhoto.createdAt)}</p></div></DialogContent>}</Dialog></>;
}

function GalleryLoading() {
  return <div className="animate-pulse space-y-4"><div className="h-56 rounded-[2rem] bg-[#17233D]/90" /><div className="aspect-[4/5] rounded-[1.75rem] bg-white" /></div>;
}

function GalleryMessage({ title, body }: { title: string; body: string }) {
  return <section className="rounded-[1.8rem] bg-white p-7 text-center shadow-[0_20px_50px_-35px_rgba(22,35,61,0.42)]"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#EEF2FF] text-[#316CFF]"><ImageOff className="h-6 w-6" /></span><h1 className="mt-5 text-xl font-extrabold tracking-[-0.045em]">{title}</h1><p className="mt-3 text-sm leading-6 text-[#566177]">{body}</p></section>;
}
