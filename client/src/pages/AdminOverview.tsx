import { AdminAccessNotice } from "@/components/AdminAccessNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CalendarRange, ClipboardCheck, Send, UsersRound } from "lucide-react";
import { useLocation } from "wouter";

const numberFormatter = new Intl.NumberFormat("ru-RU");

export default function AdminOverview() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.admin.overview.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  if (user?.role !== "admin") return <AdminAccessNotice />;

  const metrics = [
    { label: "Участники", value: data?.participants ?? 0, meta: `${data?.pendingParticipants ?? 0} ждут решения`, icon: UsersRound, tone: "bg-[#E2F0FA]" },
    { label: "Команды", value: data?.activeTeams ?? 0, meta: "активные команды", icon: UsersRound, tone: "bg-[#FBE8EC]" },
    { label: "Активности", value: data?.publishedActivities ?? 0, meta: "опубликовано сейчас", icon: ClipboardCheck, tone: "bg-[#E8F3EE]" },
    { label: "Проверка", value: data?.reportsAwaitingReview ?? 0, meta: "отчётов ожидают", icon: CalendarRange, tone: "bg-[#F5EDE0]" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-1 py-4 sm:px-5 sm:py-7">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#111111] px-6 py-9 text-white shadow-[0_28px_70px_-42px_rgba(0,0,0,0.62)] sm:px-10 sm:py-11">
        <div className="absolute -right-10 -top-16 h-52 w-52 rounded-full bg-[#BFDDF1] opacity-90" />
        <div className="absolute -bottom-20 right-32 h-44 w-44 rotate-12 rounded-[2.5rem] bg-[#F3BFCB]" />
        <div className="relative max-w-2xl">
          <Badge className="border-0 bg-white/12 px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/12">ПАНЕЛЬ КОМАНДЫ P&amp;C</Badge>
          <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[0.98] tracking-[-0.055em] sm:text-5xl">Добрые дела — в одном ритме</h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-white/68 sm:text-base">
            Настраивайте недельный период, создавайте задания и контролируйте модерацию без автоматического начисления баллов.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => setLocation("/periods")} className="rounded-xl bg-white px-5 font-bold text-black hover:bg-white/90">
              Новый период <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setLocation("/teams")} className="rounded-xl border-white/20 bg-transparent px-5 font-bold text-white hover:bg-white/10 hover:text-white">
              Управлять командами
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(metric => (
          <article key={metric.label} className="rounded-[1.45rem] border border-black/[0.055] bg-card p-5 shadow-[0_10px_35px_-28px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${metric.tone}`}><metric.icon className="h-4 w-4" /></div>
              <span className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground">СЕЙЧАС</span>
            </div>
            <p className="mt-6 text-[2.15rem] font-extrabold leading-none tracking-[-0.06em]">{isLoading ? "—" : numberFormatter.format(metric.value)}</p>
            <p className="mt-2 text-sm font-bold tracking-[-0.02em]">{metric.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{metric.meta}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <article className="rounded-[1.65rem] border border-black/[0.055] bg-card p-6 sm:p-7">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground">СТАРТ ПЕРИОДА</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.045em]">Создайте общий ритм недели</h2>
            </div>
            <div className="rounded-2xl bg-[#E2F0FA] p-3"><CalendarRange className="h-5 w-5" /></div>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            Новый период объединяет всех участников одним сроком и одним количеством назначенных заданий. Дополнительные настройки будут доступны при создании задания.
          </p>
          <Button variant="outline" onClick={() => setLocation("/periods")} className="mt-6 rounded-xl border-black/10 bg-transparent font-bold hover:bg-[#F4F6F7]">Настроить период <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </article>
        <article className="rounded-[1.65rem] bg-[#E8F3EE] p-6 sm:p-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/75"><Send className="h-4 w-4" /></div>
          <h2 className="mt-5 text-xl font-extrabold tracking-[-0.04em]">Рассылки будут здесь</h2>
          <p className="mt-2 text-sm leading-6 text-[#486050]">Конструктор текста, изображения, Markdown, кнопок и сегментов будет добавлен следующим этапом.</p>
        </article>
      </section>
    </div>
  );
}
