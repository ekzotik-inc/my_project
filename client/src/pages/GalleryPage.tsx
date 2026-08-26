import { ParticipantPhotoGallery } from "@/components/ParticipantPhotoGallery";
import { getTelegramWebApp } from "@/lib/telegramNative";

export default function GalleryPage() {
  const initData = getTelegramWebApp()?.initData || "";
  return <main className="min-h-screen bg-[#F7F4EA] p-4 pt-[calc(1rem+var(--tg-safe-top))] text-[#17233D]"><div className="mx-auto max-w-xl"><ParticipantPhotoGallery initData={initData} /></div></main>;
}
