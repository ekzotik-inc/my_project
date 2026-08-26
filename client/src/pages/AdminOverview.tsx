import { AdminAccessNotice } from "@/components/AdminAccessNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowRight, BellRing, CalendarRange, CheckCircle2, ClipboardCheck, ListChecks, Megaphone, Send, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useLocation } from "wouter";

const numberFormatter = new Intl.NumberFormat("ru-RU");

type RouteMetric = { label: string; value: number; meta: string; icon: typeof UsersRound; tone: "sky" | "rose" | "mint" | "amber"; route: string };
type NextMove = { title: string; note: string; icon: typeof UsersRound; route: string; accent: "sky" | "mint" | "gold" | "rose" };

export default function AdminOverview() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.admin.overview.useQuery(undefined, { enabled: user?.role === "admin" });
  if (user?.role !== "admin") return <AdminAccessNotice />;

  const reviewCount = data?.reportsAwaitingReview ?? 0;
  const metrics: RouteMetric[] = [
    { label: "Участники", value: data?.participants ?? 0, meta: `${data?.pendingParticipants ?? 0} ждут решения`, icon: UsersRound, tone: "sky", route: "/participants" },
    { label: "Команды", value: data?.activeTeams ?? 0, meta: "активные сейчас", icon: UsersRound, tone: "rose", route: "/teams" },
    { label: "Задания", value: data?.publishedActivities ?? 0, meta: "опубликовано", icon: ClipboardCheck, tone: "mint", route: "/activities" },
    { label: "Проверка", value: reviewCount, meta: reviewCount ? "нужны решения P&C" : "очередь чистая", icon: ShieldCheck, tone: reviewCount ? "amber" : "mint", route: "/review" },
  ];
  const nextMoves: NextMove[] = reviewCount ? [
    { title: "Разобрать очередь результатов", note: `${reviewCount} отчётов ждут честного решения P&C`, icon: ShieldCheck, route: "/review", accent: "rose" },
    { title: "Проверить ритм заданий", note: "Убедитесь, что период и задания доступны всем участникам", icon: ListChecks, route: "/activities", accent: "mint" },
    { title: "Поддержать участников", note: "Отправьте короткое живое напоминание или благодарность", icon: Megaphone, route: "/broadcasts", accent: "gold" },
  ] : [
    { title: "Задать общий период", note: "Период объединяет команду единым сроком и набором заданий", icon: CalendarRange, route: "/periods", accent: "sky" },
    { title: "Опубликовать доброе дело", note: "Настройте шаги, баллы и правила подтверждения результата", icon: ClipboardCheck, route: "/activities", accent: "mint" },
    { title: "Поддержать участников", note: "Сообщение с Markdown, изображением и понятным действием", icon: Megaphone, route: "/broadcasts", accent: "gold" },
  ];

  return <div className="mx-auto max-w-7xl space-y-6 px-1 py-4 sm:px-5 sm:py-7">
    <section className="enter-gentle relative overflow-hidden rounded-[2rem] bg-[#182035] px-6 py-8 text-white shadow-[0_30px_75px_-45px_rgba(24,32,53,0.7)] sm:px-9 sm:py-10">
      <div className="float-slow absolute -right-10 -top-16 h-52 w-52 rounded-full bg-[#316CFF] opacity-90" /><div className="absolute -bottom-20 right-32 h-44 w-44 rotate-12 rounded-[2.5rem] bg-[#DDF75D]" />
      <div className="relative"><Badge className="border-0 bg-white/12 px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/12"><Sparkles className="mr-1.5 h-3 w-3" />CHIEF</Badge><h1 className="mt-5 max-w-xl text-4xl leading-[0.95] sm:text-5xl">{reviewCount ? `${reviewCount} ждут решения` : "Программа под контролем"}</h1><p className="mt-3 max-w-lg text-sm leading-6 text-white/70">{reviewCount ? "Откройте очередь и примите следующее решение." : "Настройте следующий период или опубликуйте задание."}</p><div className="mt-7 flex flex-wrap gap-3">{reviewCount ? <Button onClick={() => setLocation("/review")} className="soft-press h-12 rounded-xl bg-[#DDF75D] px-5 font-extrabold text-[#1A2A15] hover:bg-[#E7FA87]"><BellRing className="mr-2 h-4 w-4" />К очереди</Button> : <Button onClick={() => setLocation("/periods")} className="soft-press h-12 rounded-xl bg-[#DDF75D] px-5 font-extrabold text-[#1A2A15] hover:bg-[#E7FA87]"><CalendarRange className="mr-2 h-4 w-4" />Настроить период</Button>}<Button variant="outline" onClick={() => setLocation("/activities")} className="soft-press h-12 rounded-xl border-white/20 bg-transparent px-5 font-bold text-white hover:bg-white/10 hover:text-white">Новое задание <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>
    </section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(metric => <MetricCard key={metric.label} {...metric} loading={isLoading} onClick={() => setLocation(metric.route)} />)}</section>
    <section className="grid gap-5 lg:grid-cols-[1.18fr_0.82fr]"><article className="overflow-hidden rounded-[1.75rem] border border-black/[0.055] bg-card"><div className="flex items-start justify-between border-b border-black/[0.055] p-5 sm:p-6"><div><p className="text-[10px] font-extrabold tracking-[0.14em] text-[#55705E]">СЛЕДУЮЩИЕ ХОДЫ</p><h2 className="mt-1.5 text-2xl font-extrabold tracking-[-0.05em]">Что поддержит ритм сейчас</h2></div><Activity className="h-5 w-5 text-[#39704C]" /></div><div className="divide-y divide-black/[0.055]">{nextMoves.map((move, index) => <NextMoveRow key={move.title} move={move} order={index + 1} onClick={() => setLocation(move.route)} />)}</div></article><article className="relative overflow-hidden rounded-[1.75rem] bg-[#FBE8D9] p-6 sm:p-7"><div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/45" /><div className="relative"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/75"><Send className="h-4 w-4" /></span><p className="mt-6 text-[10px] font-extrabold tracking-[0.14em] text-[#84624E]">ТОН ПРОГРАММЫ</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-0.05em]">Поддерживайте участие, а не только сроки</h2><p className="mt-3 text-sm leading-6 text-[#70523F]">Создавайте сообщения с благодарностью, ясной следующей точкой и уважением к времени участников.</p><Button onClick={() => setLocation("/broadcasts")} className="soft-press mt-6 h-11 rounded-xl bg-[#163F2F] font-bold text-white hover:bg-[#215640]">Создать сообщение <Send className="ml-2 h-4 w-4" /></Button></div></article></section>
  </div>;
}

function ChiefSignal({ reviewCount, onReview }: { reviewCount: number; onReview: () => void }) { return <aside className="rounded-[1.55rem] border border-white/10 bg-white/[0.09] p-5 backdrop-blur"><p className="text-[10px] font-extrabold tracking-[0.14em] text-white/60">ГЛАВНЫЙ СИГНАЛ</p><div className="mt-4 flex items-start gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${reviewCount ? "bg-[#F4B7A9] text-[#5E3029]" : "bg-[#C6E5AA] text-[#285039]"}`}>{reviewCount ? <BellRing className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}</span><div><p className="text-xl font-extrabold tracking-[-0.04em]">{reviewCount ? "Очередь ждёт решения" : "Очередь чистая"}</p><p className="mt-1 text-sm leading-5 text-white/68">{reviewCount ? "Подтверждение в P&C — единственный момент, когда участник получает баллы." : "Можно сфокусироваться на новом ритме и поддержке команды."}</p></div></div><button onClick={onReview} className="soft-press mt-5 flex w-full items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-left text-sm font-bold hover:bg-white/15"><span>Открыть «На проверке»</span><ArrowRight className="h-4 w-4" /></button></aside>; }
function MetricCard({ label, value, meta, icon: Icon, tone, loading, onClick }: RouteMetric & { loading: boolean; onClick: () => void }) { const colors = { sky: "bg-[#E2F0FA]", rose: "bg-[#FBE8EC]", amber: "bg-[#FFF0D2]", mint: "bg-[#E8F3EE]" }; return <button onClick={onClick} className="surface-lift rounded-[1.45rem] border border-black/[0.055] bg-card p-5 text-left shadow-[0_10px_35px_-28px_rgba(0,0,0,0.5)]"><div className="flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${colors[tone]}`}><Icon className="h-4 w-4" /></span><ArrowRight className="h-4 w-4 text-muted-foreground" /></div><p className="mt-6 text-[2.15rem] font-extrabold leading-none tracking-[-0.06em]">{loading ? "—" : numberFormatter.format(value)}</p><p className="mt-2 text-sm font-bold tracking-[-0.02em]">{label}</p><p className="mt-1 text-xs text-muted-foreground">{meta}</p></button>; }
function NextMoveRow({ move, order, onClick }: { move: NextMove; order: number; onClick: () => void }) { const colors = { rose: "bg-[#FFE7E9] text-[#A6444B]", gold: "bg-[#FFF3C9] text-[#936300]", sky: "bg-[#E7EEFF] text-[#3158C9]", mint: "bg-[#E8F8C9] text-[#3F651F]" }; const Icon = move.icon; return <button onClick={onClick} className="surface-lift flex w-full items-center gap-4 px-5 py-4 text-left sm:px-6"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${colors[move.accent]}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[10px] font-extrabold tracking-[0.12em] text-muted-foreground">ШАГ {order}</span><span className="mt-1 block font-extrabold text-[#182035]">{move.title}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-[#64708E]" /></button>; }
