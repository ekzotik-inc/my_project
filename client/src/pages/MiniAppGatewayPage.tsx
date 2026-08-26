import { Button } from "@/components/ui/button";
import { VisibleDeedMark } from "@/components/VisibleDeedMark";
import { getTelegramWebApp, telegramImpact } from "@/lib/telegramNative";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BriefcaseBusiness, LoaderCircle, Route, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function MiniAppGatewayPage() {
  const [, setLocation] = useLocation();
  const app = getTelegramWebApp();
  const initData = app?.initData || "";
  const utils = trpc.useUtils();
  const { data: access, isLoading, error } = trpc.miniApp.access.useQuery({ initData }, { enabled: Boolean(initData), retry: false });
  const workspace = trpc.auth.telegramWorkspace.useMutation({
    onSuccess: async user => {
      telegramImpact("medium");
      await utils.auth.me.invalidate();
      setLocation(user.role === "admin" ? "/" : "/review");
    },
  });

  useEffect(() => {
    if (access && !access.workspaceRole) setLocation("/statistics");
  }, [access, setLocation]);

  if (!initData) return <MiniAppOnlyNotice />;
  if (isLoading) return <div className="min-h-screen bg-[#F7F8FC] p-6 pt-[calc(6rem+var(--tg-safe-top))]"><div className="mx-auto flex max-w-sm flex-col items-center rounded-[2rem] bg-white p-8 text-center shadow-[0_24px_55px_-38px_rgba(49,108,255,0.28)]"><LoaderCircle className="h-6 w-6 animate-spin text-[#316CFF]" /><p className="mt-4 text-sm font-bold text-[#27314D]">Открываем ваш маршрут…</p></div></div>;
  if (error || !access) return <MiniAppOnlyNotice error={error?.message} />;
  if (!access.workspaceRole) return null;

  const isChief = access.workspaceRole === "admin";
  const workspaceLabel = isChief ? "Панель Chief" : "Панель P&C";
  const workspaceDescription = isChief ? "Периоды, задания, команды и решения по развитию программы." : "Очередь результатов, доказательства и аккуратные решения по проверке.";
  return <main className="paper-grain min-h-screen bg-[#F7F8FC] px-5 pb-[calc(2rem+var(--tg-safe-bottom))] pt-[calc(3rem+var(--tg-safe-top))] text-[#182035]"><section className="mx-auto max-w-md"><div className="relative overflow-hidden rounded-[2rem] bg-[#182035] p-7 text-white shadow-[0_28px_68px_-42px_rgba(24,32,53,0.72)]"><div className="float-slow absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#316CFF]" /><div className="absolute -bottom-10 right-9 h-20 w-20 rotate-12 rounded-[1.5rem] bg-[#DDF75D]" /><VisibleDeedMark className="relative bg-white text-[#316CFF]" /><p className="relative mt-6 journal-kicker text-white/65">ДОБРЫЕ ДЕЛА</p><h1 className="relative mt-2 text-4xl leading-[0.95]">Здравствуйте, {access.participantName || "коллега"}</h1><p className="relative mt-4 max-w-xs text-sm leading-6 text-white/72">Выберите, куда идти сейчас.</p></div><div className="signal-surface -mt-5 space-y-3 rounded-b-[2rem] p-5 pt-8"><button onClick={() => { telegramImpact("light"); setLocation("/statistics"); }} className="soft-press flex w-full items-center gap-4 rounded-2xl bg-[#EEF2FF] p-4 text-left"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#316CFF]"><Route className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-extrabold">Мой маршрут</span><span className="mt-1 block text-xs leading-5 text-[#53607D]">Прогресс и команда</span></span><ArrowRight className="h-4 w-4 text-[#53607D]" /></button><button onClick={() => workspace.mutate({ initData })} disabled={workspace.isPending} className="soft-press flex w-full items-center gap-4 rounded-2xl bg-[#316CFF] p-4 text-left text-white disabled:opacity-65"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/12"><BriefcaseBusiness className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-extrabold">{workspace.isPending ? "Открываем…" : workspaceLabel}</span><span className="mt-1 block text-xs leading-5 text-white/72">{workspaceDescription}</span></span><ArrowRight className="h-4 w-4" /></button><p className="flex items-start gap-2 px-1 pt-2 text-[11px] leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#316CFF]" />Роль определена сервером.</p></div></section></main>;
}

export function MiniAppOnlyNotice({ error }: { error?: string }) {
  return <main className="paper-grain flex min-h-screen items-center justify-center bg-[#F7F8FC] p-5 text-[#182035]"><section className="signal-surface w-full max-w-sm rounded-[2rem] p-7 text-center"><VisibleDeedMark className="mx-auto" /><p className="journal-label mt-6">ДОБРЫЕ ДЕЛА</p><h1 className="mt-2 text-3xl leading-[0.95]">Откройте приложение из Telegram</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">Войдите через «Статистику» или меню бота.</p>{error ? <p className="mt-4 rounded-xl bg-[#FFF4F4] p-3 text-xs leading-5 text-[#9A363D]">{error}</p> : null}</section></main>;
}
