import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { VisibleDeedMark } from "@/components/VisibleDeedMark";
import { trpc } from "@/lib/trpc";
import { applyTelegramSafeAreas, getTelegramWebApp, telegramImpact, telegramSelectionHaptic, telegramSupportsVersion } from "@/lib/telegramNative";
import { Award, BookOpen, ChevronLeft, CircleCheck, Clock3, Expand, Leaf, Medal, RefreshCw, Trophy, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

type Tab = "progress" | "team" | "leaders" | "guide";

const rankAccents = ["bg-[#F7E6A2] text-[#72520C]", "bg-[#E2F0FA] text-[#2D647D]", "bg-[#FBE8EC] text-[#8C4653]"];
const rankMarks = ["#1", "#2", "#3"];
const achievementArt = {
  first_confirmed: "https://github.com/ekzotik-inc/my_project/releases/download/achievement-stickers-v2/first_confirmed.png",
  three_confirmed: "https://github.com/ekzotik-inc/my_project/releases/download/achievement-stickers-v2/three_confirmed.png",
  impact_100: "https://github.com/ekzotik-inc/my_project/releases/download/achievement-stickers-v2/impact_100.png",
  period_finisher: "https://github.com/ekzotik-inc/my_project/releases/download/achievement-stickers-v2/period_finisher.png",
  team_spark: "https://github.com/ekzotik-inc/my_project/releases/download/achievement-stickers-v2/team_spark.png",
} as const;
const tabItems: { id: Tab; label: string; icon: typeof Leaf }[] = [
  { id: "progress", label: "Мой путь", icon: Leaf },
  { id: "team", label: "Команда", icon: UsersRound },
  { id: "leaders", label: "Лидеры", icon: Trophy },
  { id: "guide", label: "Помощь", icon: BookOpen },
];

function actionLabel(status: string) {
  return ({ under_review: "отправил(а) отчёт", approved: "подтвердил(а) задание", rejected: "получил(а) комментарий" } as Record<string, string>)[status] || "обновил(а) задание";
}

function rankTone(index: number) {
  return rankAccents[index] || "bg-[#EEF4EC] text-[#476756]";
}

export default function StatisticsPage() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("progress");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const app = getTelegramWebApp();
  const initData = app?.initData || "";
  const canFullscreen = Boolean(telegramSupportsVersion(app, "8.0") && app?.requestFullscreen && !app.isFullscreen);
  useEffect(() => {
    const app = getTelegramWebApp();
    if (!app) return;
    const background = app.themeParams?.bg_color || "#F8FBF5";
    app.ready();
    app.expand();
    if (telegramSupportsVersion(app, "7.7")) app.enableVerticalSwipes?.();
    if (telegramSupportsVersion(app, "6.1")) {
      app.setHeaderColor?.(background);
      app.setBackgroundColor?.(background);
    }
    if (telegramSupportsVersion(app, "7.10")) app.setBottomBarColor?.(background);
    applyTelegramSafeAreas(app);
    const updateSafeAreas = () => applyTelegramSafeAreas(app);
    if (telegramSupportsVersion(app, "8.0")) {
      app.onEvent?.("safeAreaChanged", updateSafeAreas);
      app.onEvent?.("contentSafeAreaChanged", updateSafeAreas);
    }
    const goBack = () => { telegramImpact("light"); setLocation("/"); };
    if (telegramSupportsVersion(app, "6.1")) { app.BackButton?.show(); app.BackButton?.onClick(goBack); }
    return () => {
      if (telegramSupportsVersion(app, "6.1")) app.BackButton?.offClick(goBack);
      if (telegramSupportsVersion(app, "8.0")) {
        app.offEvent?.("safeAreaChanged", updateSafeAreas);
        app.offEvent?.("contentSafeAreaChanged", updateSafeAreas);
      }
    };
  }, [setLocation]);
  const { data, isLoading, error, refetch } = trpc.statistics.dashboard.useQuery({ initData }, { enabled: Boolean(initData), retry: false });
  const refreshDashboard = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    telegramImpact("light");
    try { await refetch(); setLastRefreshedAt(new Date()); }
    finally { setIsRefreshing(false); }
  };
  const personalProgress = useMemo(() => data?.personal.total ? Math.round((data.personal.approved / data.personal.total) * 100) : 0, [data]);
  const maximumTeamPoints = useMemo(() => Math.max(...(data?.teams.map(team => team.points) || [1]), 1), [data]);
  const maximumParticipantPoints = useMemo(() => Math.max(...(data?.topParticipants.map(person => person.points) || [1]), 1), [data]);

  if (!initData) return <div className="paper-grain min-h-screen bg-[#F8FBF5] p-5 text-[#163F2F]"><div className="mx-auto mt-24 max-w-sm overflow-hidden rounded-[1.9rem] bg-white shadow-[0_22px_60px_-38px_rgba(22,63,47,0.36)]"><div className="relative bg-[#163F2F] px-7 pb-12 pt-8 text-left text-white"><div className="float-slow absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#C6E5AA]" /><VisibleDeedMark className="relative bg-white text-[#163F2F]" /><p className="relative mt-6 text-[10px] font-extrabold tracking-[0.15em] text-white/65">ВАШ ДОБРЫЙ СЛЕД</p><h1 className="relative mt-2 text-3xl font-extrabold leading-[1.02] tracking-[-0.055em]">Вклад команды становится видимым</h1></div><div className="-mt-6 rounded-t-[1.7rem] bg-white p-7 text-center"><p className="text-lg font-extrabold tracking-[-0.035em]">Откройте статистику в Telegram</p><p className="mt-3 text-sm leading-6 text-muted-foreground">Здесь откроются личный маршрут, ритм команды, лидеры и поддержка — безопасно из кнопки «Статистика» в боте.</p><div className="mt-6 flex justify-center gap-2"><span className="rounded-full bg-[#E8F3EE] px-3 py-1.5 text-[10px] font-extrabold text-[#25613F]">Личный путь</span><span className="rounded-full bg-[#EAF2FA] px-3 py-1.5 text-[10px] font-extrabold text-[#3A6E8B]">Команда</span><span className="rounded-full bg-[#FFF4DB] px-3 py-1.5 text-[10px] font-extrabold text-[#866414]">Признание</span></div></div></div></div>;
  if (isLoading) return <div className="min-h-screen bg-[#F8FBF5] p-6"><div className="mx-auto max-w-md animate-pulse space-y-4"><div className="h-36 rounded-[1.8rem] bg-white" /><div className="h-48 rounded-[1.8rem] bg-white" /><div className="h-36 rounded-[1.8rem] bg-white" /></div></div>;
  if (error || !data) return <div className="min-h-screen bg-[#F8FBF5] p-5"><div className="mx-auto mt-24 max-w-sm rounded-[1.75rem] bg-white p-7 text-center"><p className="text-xl font-extrabold">Статистика пока недоступна</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{error?.message || "Попробуйте открыть экран снова из меню бота."}</p></div></div>;

  const nextActionTone = {
    revise: "bg-[#FFF0E9] text-[#98543E]",
    start: "bg-[#E4F4DE] text-[#276445]",
    review: "bg-[#FFF6D9] text-[#866414]",
    wait: "bg-[#E5F1FA] text-[#2B627D]",
    celebrate: "bg-[#EAE3F8] text-[#624790]",
  }[data.nextAction.tone];
  const periodCaption = personalProgress === 0 ? "Первое действие — самый простой способ включиться." : personalProgress === 100 ? "Все задания пройдены. Спасибо за устойчивость!" : "Каждый подтверждённый шаг делает видимым ваш вклад.";

  return <main className="min-h-screen bg-[#F7F4EA] pb-[calc(7rem+var(--tg-safe-bottom))] pl-[var(--tg-safe-left)] pr-[var(--tg-safe-right)] pt-[var(--tg-safe-top)] text-[#163F2F]"><div className="mx-auto max-w-xl px-4 pt-4 sm:px-6"><header className="flex items-center justify-between"><button onClick={() => { telegramImpact("light"); setLocation("/"); }} className="soft-press flex h-10 w-10 items-center justify-center rounded-2xl border border-black/[0.045] bg-white/85 shadow-[0_10px_22px_-18px_rgba(22,63,47,0.4)]" aria-label="Вернуться назад"><ChevronLeft className="h-5 w-5" /></button><div className="flex items-center gap-2"><div className="text-right"><p className="journal-kicker text-[#9B7330]">ДОБРЫЕ ДЕЛА</p><p className="mt-0.5 text-xs font-bold">{lastRefreshedAt ? `обновлено ${lastRefreshedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}` : "ваш добрый след"}</p></div><button onClick={refreshDashboard} disabled={isRefreshing} className="soft-press flex h-10 w-10 items-center justify-center rounded-2xl border border-black/[0.045] bg-white/85 shadow-[0_10px_22px_-18px_rgba(22,63,47,0.4)] disabled:opacity-60" aria-label="Обновить данные"><RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} /></button>{canFullscreen && <button onClick={() => { telegramImpact("light"); app?.requestFullscreen?.(); }} className="soft-press flex h-10 w-10 items-center justify-center rounded-2xl border border-black/[0.045] bg-white/85 shadow-[0_10px_22px_-18px_rgba(22,63,47,0.4)]" aria-label="Открыть на весь экран"><Expand className="h-4 w-4" /></button>}</div></header>

    <div key={tab} className="enter-gentle">{tab === "progress" && <section className="space-y-4"><section className="relative mt-5 overflow-hidden rounded-[2rem] bg-[#163F2F] px-6 py-7 text-white shadow-[0_25px_60px_-35px rgba(22,63,47,0.78)]"><div className="float-slow absolute -right-11 -top-12 h-40 w-40 rounded-full bg-[#C6E5AA]" /><div className="absolute -bottom-9 right-16 h-24 w-24 rotate-12 rounded-[1.5rem] bg-[#F4B7A9]" /><div className="relative"><p className="text-xs text-white/70">Рады видеть вас, {data.participant.fullName || "участник"}</p><h1 className="journal-display mt-2 max-w-[17rem] text-[2.55rem] leading-[0.93]">Ваше участие меняет общее дело</h1><div className="journal-rule mt-5 max-w-[16rem] opacity-55" /><div className="mt-5 flex items-end gap-4"><div><p className="text-[2.8rem] font-extrabold leading-none tracking-[-0.07em]">{data.personal.points}</p><p className="mt-1 text-xs font-bold text-white/70">заслуженных баллов</p></div><div className="mb-1.5 rounded-xl bg-white/12 px-3 py-2 text-xs font-bold">{data.participant.teamName || "Команда не выбрана"}</div></div></div></section>
      <section className={`flex items-center gap-3 rounded-[1.35rem] p-4 ${nextActionTone}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/75"><Award className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold tracking-[0.14em] opacity-65">СЛЕДУЮЩИЙ ШАГ</p><h2 className="mt-0.5 truncate text-base font-extrabold tracking-[-0.03em]">{data.nextAction.title}</h2></div><span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-extrabold">в боте</span></section>
      {data.period ? <section className="journal-surface rounded-[1.7rem] p-5"><div className="flex items-start justify-between gap-3"><div><p className="journal-label">В РАБОТЕ СЕЙЧАС</p><h2 className="journal-display mt-1.5 text-2xl leading-none">{data.period.title}</h2></div><Badge className="border-0 bg-[#DCEFD7] text-[#25613F] hover:bg-[#DCEFD7]">{data.personal.approved}/{data.personal.total}</Badge></div><p className="mt-3 text-sm leading-5 text-muted-foreground">{periodCaption}</p><div className="mt-5 flex items-center justify-between text-xs"><span className="font-bold">Личный прогресс</span><span className="font-extrabold text-[#25613F]">{personalProgress}%</span></div><Progress value={personalProgress} className="mt-2 h-2.5 bg-[#EDF4E9] [&>div]:bg-[#3D8758]" /><div className="mt-4 grid grid-cols-3 gap-3"><div className="rounded-2xl bg-[#EDF4E9] p-3"><CircleCheck className="h-4 w-4 text-[#25613F]" /><p className="mt-4 text-2xl font-extrabold tracking-[-0.05em]">{data.personal.approved}</p><p className="mt-0.5 text-[11px] text-[#47715A]">принято</p></div><div className="rounded-2xl bg-[#FFF4DB] p-3"><Clock3 className="h-4 w-4 text-[#9C6B12]" /><p className="mt-4 text-2xl font-extrabold tracking-[-0.05em]">{data.personal.reviewing}</p><p className="mt-0.5 text-[11px] text-[#7F692E]">на проверке</p></div><div className="rounded-2xl bg-[#EAF2FA] p-3"><Medal className="h-4 w-4 text-[#3A6E8B]" /><p className="mt-4 text-2xl font-extrabold tracking-[-0.05em]">{data.participant.rank ? `#${data.participant.rank}` : "—"}</p><p className="mt-0.5 text-[11px] text-[#477089]">ваше место</p></div></div></section> : <section className="journal-surface rounded-[1.7rem] p-5 text-sm leading-6 text-muted-foreground">🌱 Новый период пока не запущен. Как только P&C откроет его, бот пришлёт приглашение.</section>}
      <AchievementShelf achievements={data.achievements} />
      <section className="rounded-[1.7rem] bg-white p-5"><div className="flex items-end justify-between"><div><p className="text-[10px] font-extrabold tracking-[0.14em] text-[#55705E]">ЖИВАЯ ЛЕНТА</p><h2 className="mt-1.5 text-2xl font-extrabold tracking-[-0.05em]">Команда в действии</h2></div><UsersRound className="h-5 w-5 text-[#3D8758]" /></div><div className="mt-4 space-y-1">{data.recentActions.length ? data.recentActions.slice(0, 5).map((action, index) => <article key={`${action.participantName}-${action.updatedAt}-${index}`} className="flex gap-3 rounded-2xl p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F3EE] text-xs font-extrabold text-[#25613F]">{action.participantName?.slice(0, 1)?.toUpperCase() || "?"}</span><div className="min-w-0"><p className="text-sm leading-5"><b>{action.participantName || "Участник"}</b> {actionLabel(action.status)} «{action.taskTitle}»</p><p className="mt-1 text-[11px] text-muted-foreground">{action.teamName || "Команда"} · {new Date(action.updatedAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div></article>) : <p className="py-5 text-sm text-muted-foreground">Здесь появятся первые добрые действия вашей команды.</p>}</div></section></section>}

    {tab === "team" && <section className="mt-5 space-y-4"><section className="relative overflow-hidden rounded-[2rem] bg-[#E7F3E2] p-6"><div className="absolute -right-7 -top-7 h-28 w-28 rounded-full bg-[#BFDFF0]" /><div className="relative"><p className="text-[10px] font-extrabold tracking-[0.14em] text-[#55705E]">ВАША КОМАНДА</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-0.055em]">{data.participant.teamName || "Команда выбирается при регистрации"}</h1><div className="mt-6 flex gap-3"><div className="rounded-2xl bg-white/80 px-4 py-3"><p className="text-[10px] font-bold text-[#55705E]">МЕСТО</p><p className="mt-1 text-2xl font-extrabold">{data.participant.teamRank ? `#${data.participant.teamRank}` : "—"}</p></div><div className="rounded-2xl bg-white/80 px-4 py-3"><p className="text-[10px] font-bold text-[#55705E]">БАЛЛОВ</p><p className="mt-1 text-2xl font-extrabold">{data.teams.find(item => item.name === data.participant.teamName)?.points ?? 0}</p></div></div></div></section><section className="rounded-[1.7rem] bg-white p-5"><div className="flex items-end justify-between"><div><p className="text-[10px] font-extrabold tracking-[0.14em] text-[#55705E]">ОБЩИЙ РИТМ</p><h2 className="mt-1.5 text-2xl font-extrabold tracking-[-0.05em]">Все команды</h2></div><UsersRound className="h-5 w-5 text-[#3D8758]" /></div><div className="mt-5 space-y-4">{data.teams.length ? data.teams.map((team, index) => <div key={team.id} className={team.name === data.participant.teamName ? "rounded-2xl bg-[#F0F8EC] p-3" : "p-1"}><div className="flex items-center justify-between gap-3 text-sm"><p className="min-w-0 truncate font-bold"><span className="mr-2 text-muted-foreground">#{index + 1}</span>{team.name}</p><p className="shrink-0 text-xs text-muted-foreground">{team.points} баллов · {team.completed} заданий</p></div><Progress value={Math.round((team.points / maximumTeamPoints) * 100)} className="mt-2 h-2 bg-[#EDF4E9] [&>div]:bg-[#7EBB8A]" /></div>) : <p className="text-sm text-muted-foreground">Командный рейтинг появится после первых подтверждённых заданий.</p>}</div></section></section>}

    {tab === "leaders" && <section className="mt-5 space-y-4"><section className="rounded-[2rem] bg-[#163F2F] p-6 text-white"><p className="text-[10px] font-extrabold tracking-[0.14em] text-white/60">ОБЩИЙ ЗАЧЁТ</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-0.055em]">Лидеры добрых дел</h1><p className="mt-3 text-sm leading-6 text-white/70">Рейтинг строится только по баллам за подтверждённые P&C результаты.</p></section><section className="rounded-[1.7rem] bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-extrabold tracking-[-0.04em]">Тройка лидеров</h2><Trophy className="h-5 w-5 text-[#C27A16]" /></div><div className="mt-5 grid grid-cols-3 gap-2">{data.topParticipants.slice(0, 3).map((person, index) => <article key={person.id} className={`rounded-2xl p-3 text-center ${rankTone(index)}`}><p className="text-xs font-extrabold">{["🥇", "🥈", "🥉"][index]}</p><p className="mt-3 line-clamp-2 text-sm font-extrabold leading-4">{person.fullName || "Участник"}</p><p className="mt-2 text-lg font-extrabold">{person.points}</p><p className="text-[10px] opacity-70">баллов</p></article>)}{data.topParticipants.length === 0 && <p className="col-span-3 py-5 text-center text-sm text-muted-foreground">Первые подтверждённые результаты откроют лидерборд.</p>}</div></section><section className="rounded-[1.7rem] bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-extrabold tracking-[0.14em] text-[#55705E]">ТОП-10</p><h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em]">Участники</h2></div><Award className="h-5 w-5 text-[#D66E5A]" /></div><div className="mt-5 space-y-4">{data.topParticipants.length ? data.topParticipants.map((person, index) => <div key={person.id} className={person.fullName === data.participant.fullName ? "rounded-2xl bg-[#F0F8EC] p-3" : "px-1"}><div className="flex items-center gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${rankTone(index)}`}>{rankMarks[index] || index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{person.fullName || "Участник"}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{person.teamName || "Команда"}</p></div><p className="font-extrabold">{person.points}</p></div><Progress value={Math.round((person.points / maximumParticipantPoints) * 100)} className="mt-2 h-1.5 bg-[#EDF4E9] [&>div]:bg-[#D5A43A]" /></div>) : <p className="text-sm text-muted-foreground">Рейтинг появится после первого принятого отчёта.</p>}</div></section></section>}

    {tab === "guide" && <section className="mt-5 space-y-4"><section className="rounded-[2rem] bg-[#EAF2FA] p-6"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80"><BookOpen className="h-5 w-5 text-[#3A6E8B]" /></div><h1 className="mt-5 text-3xl font-extrabold tracking-[-0.055em]">Всё понятно по шагам</h1><p className="mt-3 text-sm leading-6 text-[#477089]">Короткие ответы, чтобы быстро включиться в доброе дело и уверенно пройти модерацию.</p></section><section className="overflow-hidden rounded-[1.7rem] bg-white"><details open className="border-b border-[#EAF1E8] p-5"><summary className="cursor-pointer list-none font-extrabold">Как выполнить и сдать задание?</summary><p className="mt-3 text-sm leading-6 text-muted-foreground">Откройте нужную активность в меню бота, пройдите все обязательные шаги и отправьте отчёт. P&C проверит материалы и пришлёт решение.</p></details><details className="border-b border-[#EAF1E8] p-5"><summary className="cursor-pointer list-none font-extrabold">Почему баллы не появляются сразу?</summary><p className="mt-3 text-sm leading-6 text-muted-foreground">Баллы начисляются только после явного подтверждения отчёта модератором. Пока отчёт проверяют, в приложении будет виден статус «на проверке».</p></details><details className="border-b border-[#EAF1E8] p-5"><summary className="cursor-pointer list-none font-extrabold">Отчёт вернули на доработку — что делать?</summary><p className="mt-3 text-sm leading-6 text-muted-foreground">Откройте задание в меню бота, прочитайте комментарий P&C, дополните материалы и отправьте отчёт повторно.</p></details><details className="p-5"><summary className="cursor-pointer list-none font-extrabold">Как работает командный рейтинг?</summary><p className="mt-3 text-sm leading-6 text-muted-foreground">В зачёт идут только баллы за подтверждённые результаты. Поэтому каждое принятое доброе дело усиливает и ваш личный, и командный результат.</p></details></section></section>}</div>
  </div><nav className="fixed bottom-[calc(0.75rem+var(--tg-safe-bottom))] left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 gap-1 rounded-[1.5rem] border border-white/70 bg-white/92 p-1.5 shadow-[0_18px_45px_-25px_rgba(22,63,47,0.45)] backdrop-blur">{tabItems.map(item => <button key={item.id} onClick={() => { telegramSelectionHaptic(); setTab(item.id); }} className={`soft-press flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition-colors ${tab === item.id ? "bg-[#163F2F] text-white" : "text-[#587065]"}`}><item.icon className="h-4 w-4" />{item.label}</button>)}</nav></main>;
}

type AchievementShelfItem = {
  id: keyof typeof achievementArt;
  title: string;
  description: string;
  category: string;
  current: number;
  target: number;
  unlocked: boolean;
};

function AchievementShelf({ achievements }: { achievements: AchievementShelfItem[] }) {
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementShelfItem | null>(null);
  const progress = selectedAchievement ? Math.min(100, Math.round((selectedAchievement.current / Math.max(selectedAchievement.target, 1)) * 100)) : 0;
  return <><section className="signal-surface overflow-hidden rounded-[1.55rem] p-4"><div className="flex items-center justify-between"><div><p className="journal-label">ПРИЗНАНИЕ</p><h2 className="mt-1 text-lg font-extrabold tracking-[-0.045em]">Достижения</h2></div><span className="signal-chip rounded-full px-2.5 py-1 text-[10px] font-extrabold">{achievements.filter(item => item.unlocked).length}/{achievements.length}</span></div><div className="mt-4 grid grid-cols-5 gap-1.5">{achievements.map(item => <button key={item.id} type="button" onClick={() => { telegramSelectionHaptic(); setSelectedAchievement(item); }} className="soft-press min-w-0 rounded-xl text-center outline-none focus-visible:ring-2 focus-visible:ring-[#316CFF]" aria-label={`${item.title}. ${item.unlocked ? "достижение подтверждено" : `прогресс ${item.current} из ${item.target}`}. Открыть детали`}><img src={achievementArt[item.id]} alt="" aria-hidden="true" draggable={false} data-locked={item.unlocked ? "false" : "true"} className="achievement-sticker mx-auto h-14 w-14 object-contain sm:h-[4.5rem] sm:w-[4.5rem]" /><p className="mt-1.5 line-clamp-2 min-h-7 text-[9px] font-bold leading-3 text-[#384258]">{item.title}</p><span className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${item.unlocked ? "bg-[#E1F9B0] text-[#23411B]" : "bg-[#EEF2FF] text-[#3158C9]"}`}>{item.unlocked ? "✓" : `${item.current}/${item.target}`}</span></button>)}</div></section><Dialog open={Boolean(selectedAchievement)} onOpenChange={open => !open && setSelectedAchievement(null)}>{selectedAchievement && <DialogContent className="max-w-[calc(100%-2rem)] rounded-[1.75rem] border-0 bg-[#F8FAFF] p-0 shadow-2xl"><div className="px-5 pb-6 pt-7"><DialogHeader className="items-center text-center"><img src={achievementArt[selectedAchievement.id]} alt="" aria-hidden="true" data-locked={selectedAchievement.unlocked ? "false" : "true"} className="achievement-sticker h-24 w-24 object-contain" /><p className="mt-3 text-[10px] font-extrabold tracking-[0.15em] text-[#316CFF]">{selectedAchievement.category.toUpperCase()}</p><DialogTitle className="mt-1 text-2xl font-extrabold tracking-[-0.055em] text-[#17233D]">{selectedAchievement.title}</DialogTitle><DialogDescription className="mt-2 text-sm leading-5 text-[#566177]">{selectedAchievement.description}</DialogDescription></DialogHeader><div className="mt-6 rounded-2xl bg-white p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-extrabold text-[#17233D]">{selectedAchievement.unlocked ? "Подтверждено P&C" : "Ваш прогресс"}</p><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${selectedAchievement.unlocked ? "bg-[#E1F9B0] text-[#23411B]" : "bg-[#E8EEFF] text-[#3158C9]"}`}>{selectedAchievement.unlocked ? "Готово" : `${selectedAchievement.current}/${selectedAchievement.target}`}</span></div><Progress value={progress} className="mt-3 h-2 bg-[#E9EDF6] [&>div]:bg-[#316CFF]" /><p className="mt-3 text-xs leading-5 text-[#566177]">{selectedAchievement.unlocked ? "Условие выполнено и подтверждено. Так держать!" : `Чтобы получить бейдж, достигните ${selectedAchievement.target} ${selectedAchievement.target === 1 ? "подтверждённого результата" : "единиц прогресса"}.`}</p></div></div></DialogContent>}</Dialog></>;
}
