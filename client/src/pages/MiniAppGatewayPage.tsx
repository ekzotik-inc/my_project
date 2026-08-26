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
  if (isLoading) return <div className="min-h-screen bg-[#F8FBF5] p-6 pt-[calc(6rem+var(--tg-safe-top))]"><div className="mx-auto flex max-w-sm flex-col items-center rounded-[2rem] bg-white p-8 text-center shadow-[0_24px_55px_-38px_rgba(22,63,47,0.45)]"><LoaderCircle className="h-6 w-6 animate-spin text-[#25613F]" /><p className="mt-4 text-sm font-bold text-[#355544]">Проверяем ваш маршрут…</p></div></div>;
  if (error || !access) return <MiniAppOnlyNotice error={error?.message} />;
  if (!access.workspaceRole) return null;

  const isChief = access.workspaceRole === "admin";
  const workspaceLabel = isChief ? "Панель Chief" : "Панель P&C";
  const workspaceDescription = isChief ? "Периоды, задания, команды и решения по развитию программы." : "Очередь результатов, доказательства и аккуратные решения по проверке.";
  return <main className="paper-grain min-h-screen bg-[#F8FBF5] px-5 pb-[calc(2rem+var(--tg-safe-bottom))] pt-[calc(3rem+var(--tg-safe-top))] text-[#163F2F]"><section className="mx-auto max-w-md"><div className="relative overflow-hidden rounded-[2rem] bg-[#163F2F] p-7 text-white shadow-[0_28px_68px_-42px_rgba(22,63,47,0.72)]"><div className="float-slow absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#C6E5AA]" /><VisibleDeedMark className="relative bg-white text-[#163F2F]" /><p className="relative mt-6 text-[10px] font-extrabold tracking-[0.16em] text-white/65">ДОБРЫЕ ДЕЛА</p><h1 className="relative mt-2 text-3xl font-extrabold leading-[1] tracking-[-0.06em]">Здравствуйте, {access.participantName || "коллега"}</h1><p className="relative mt-4 text-sm leading-6 text-white/72">Для вас доступны личный маршрут участника и рабочее пространство {isChief ? "Chief" : "P&C"}.</p></div><div className="-mt-5 space-y-3 rounded-b-[2rem] bg-white p-5 pt-8 shadow-[0_24px_55px_-38px_rgba(22,63,47,0.45)]"><button onClick={() => { telegramImpact("light"); setLocation("/statistics"); }} className="soft-press flex w-full items-center gap-4 rounded-2xl bg-[#F3F8F0] p-4 text-left"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2A7047]"><Route className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-extrabold">Мой маршрут</span><span className="mt-1 block text-xs leading-5 text-[#55705E]">Личный прогресс, команда, признание и помощь.</span></span><ArrowRight className="h-4 w-4 text-[#55705E]" /></button><button onClick={() => workspace.mutate({ initData })} disabled={workspace.isPending} className="soft-press flex w-full items-center gap-4 rounded-2xl bg-[#163F2F] p-4 text-left text-white disabled:opacity-65"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/12"><BriefcaseBusiness className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-extrabold">{workspace.isPending ? "Открываем…" : workspaceLabel}</span><span className="mt-1 block text-xs leading-5 text-white/68">{workspaceDescription}</span></span><ArrowRight className="h-4 w-4" /></button><p className="flex items-start gap-2 px-1 pt-2 text-[11px] leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2A7047]" />Роль определена сервером по подписанным данным Telegram, а не по данным телефона.</p></div></section></main>;
}

export function MiniAppOnlyNotice({ error }: { error?: string }) {
  return <main className="paper-grain flex min-h-screen items-center justify-center bg-[#F8FBF5] p-5 text-[#163F2F]"><section className="w-full max-w-sm rounded-[2rem] bg-white p-7 text-center shadow-[0_24px_55px_-38px_rgba(22,63,47,0.45)]"><VisibleDeedMark className="mx-auto bg-[#163F2F] text-white" /><p className="mt-6 text-[10px] font-extrabold tracking-[0.16em] text-[#55705E]">ДОБРЫЕ ДЕЛА</p><h1 className="mt-2 text-2xl font-extrabold tracking-[-0.05em]">Откройте приложение из Telegram</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Роль и доступ определяются по защищённым данным Mini App. Войдите через кнопку «Статистика» или меню бота.</p>{error ? <p className="mt-4 rounded-xl bg-[#FFF4F4] p-3 text-xs leading-5 text-[#9A363D]">{error}</p> : null}</section></main>;
}
