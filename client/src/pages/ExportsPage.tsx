import { AdminAccessNotice } from "@/components/AdminAccessNotice";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Download, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function ExportsPage() {
  const { user } = useAuth();
  const exportCurrent = trpc.admin.exports.current.useMutation({
    onSuccess: file => { window.open(file.url, "_blank", "noopener,noreferrer"); toast.success("Excel-файл сформирован и открыт для скачивания"); },
    onError: error => toast.error(error.message),
  });
  if (user?.role !== "admin") return <AdminAccessNotice />;
  return <div className="mx-auto max-w-5xl px-1 py-4 sm:px-5 sm:py-7"><header><p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground">ДАННЫЕ</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-0.055em]">Экспорт Excel</h1><p className="mt-3 max-w-2xl text-sm text-muted-foreground">Сформируйте актуальную выгрузку без тестовых данных. Каждый файл создаётся заново на основе текущей базы.</p></header><section className="mt-8 overflow-hidden rounded-[1.9rem] bg-[#111111] p-7 text-white shadow-[0_24px_60px_-35px_rgba(0,0,0,0.55)] sm:p-10"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E2F0FA] text-black"><FileSpreadsheet className="h-5 w-5" /></div><h2 className="mt-7 text-3xl font-extrabold tracking-[-0.055em]">Единый файл для команды P&amp;C</h2><p className="mt-4 max-w-xl text-sm leading-6 text-white/65">В книгу входят участники, задания и периоды, статусы отчётов, приложенные материалы, журнал начисленных баллов и история рассылок.</p><Button onClick={() => exportCurrent.mutate()} disabled={exportCurrent.isPending} className="mt-8 h-12 rounded-xl bg-white px-5 font-bold text-black hover:bg-white/90"><Download className="mr-2 h-4 w-4" />{exportCurrent.isPending ? "Формируем файл…" : "Скачать текущий Excel"}</Button></section><section className="mt-5 rounded-[1.65rem] bg-[#E8F3EE] p-6 sm:p-7"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><p className="text-sm leading-6 text-[#355544]">Выгрузка содержит только данные, которые существуют в системе на момент создания. Фотографии и документы не встраиваются в книгу, но добавляются как ссылки в листе «Материалы отчётов».</p></div></section></div>;
}
