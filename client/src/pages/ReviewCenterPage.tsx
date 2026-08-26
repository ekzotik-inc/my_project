import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Check, ChevronRight, CircleAlert, Clock3, FileText, Image as ImageIcon, Inbox, Search, Trophy, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/useMobile";
import { telegramImpact, telegramSelectionHaptic } from "@/lib/telegramNative";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

function compactDate(value: Date | null) {
  if (!value) return "только что";
  return new Date(value).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function percentage(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : 0;
}

export default function ReviewCenterPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const canModerate = user?.role === "admin" || user?.role === "pc_admin";
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.reviewCenter.dashboard.useQuery(undefined, { enabled: canModerate });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [pendingDecision, setPendingDecision] = useState<"approved" | "rejected" | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const moderate = trpc.admin.reviewCenter.moderate.useMutation({
    onSuccess: async result => {
      await Promise.all([
        utils.admin.reviewCenter.dashboard.invalidate(),
        utils.admin.overview.invalidate(),
        utils.admin.communicationDigest.invalidate(),
      ]);
      toast.success(result.awardedPoints > 0 ? `Результат подтверждён: +${result.awardedPoints} баллов` : "Отчёт возвращён на доработку");
    },
    onError: error => toast.error(error.message),
  });

  const teamNames = useMemo(() => Array.from(new Set(data?.queue.map(item => item.teamName || "Без команды") ?? [])), [data?.queue]);
  const visibleQueue = useMemo(() => (data?.queue ?? []).filter(item => {
    const query = search.trim().toLocaleLowerCase("ru-RU");
    const searchable = `${item.participantName || ""} ${item.activityTitle} ${item.teamName || ""}`.toLocaleLowerCase("ru-RU");
    return (!query || searchable.includes(query)) && (teamFilter === "all" || (item.teamName || "Без команды") === teamFilter);
  }), [data?.queue, search, teamFilter]);
  const selected = visibleQueue.find(item => item.assignmentId === selectedId) ?? visibleQueue[0] ?? null;

  useEffect(() => {
    if (!isMobile && !selectedId && visibleQueue[0]) setSelectedId(visibleQueue[0].assignmentId);
    if (selectedId && !visibleQueue.some(item => item.assignmentId === selectedId)) setSelectedId(visibleQueue[0]?.assignmentId ?? null);
  }, [isMobile, selectedId, visibleQueue]);

  if (!canModerate) {
    return <div className="mx-auto max-w-3xl px-5 py-12"><div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-7"><p className="text-sm font-bold text-amber-900">Доступ для P&amp;C</p><p className="mt-2 text-sm leading-6 text-amber-800">Центр проверки доступен только Chief и P&amp;C Administrator, потому что здесь открываются личные результаты и доказательства участников.</p></div></div>;
  }

  function openDecision(decision: "approved" | "rejected") {
    if (!selected) return;
    telegramImpact(decision === "approved" ? "medium" : "light");
    setPendingDecision(decision);
    setDecisionComment("");
  }
  function decide() {
    if (!selected || !pendingDecision) return;
    if (pendingDecision === "rejected" && !decisionComment.trim()) {
      toast.error("Для доработки нужен понятный комментарий участнику");
      return;
    }
    moderate.mutate({ assignmentId: selected.assignmentId, decision: pendingDecision, comment: decisionComment.trim() || undefined }, { onSuccess: () => { telegramImpact("medium"); setPendingDecision(null); setDecisionComment(""); if (isMobile) setSelectedId(null); } });
  }
  const mobileDetailOpen = isMobile && Boolean(selected);

  return <div className="mx-auto max-w-[1480px] space-y-7 px-1 py-4 sm:px-5 sm:py-7">
    <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
      <div>
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#9A363D]">ЦЕНТР P&amp;C · ЖИВАЯ ОЧЕРЕДЬ</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.055em] text-[#163F2F]">На проверке</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Здесь находятся только отчёты, по которым участник уже отправил материалы. Решение меняет статус и отправляет человеку Telegram-уведомление; баллы начисляются лишь после подтверждения.</p>
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-[#F3C9CE] bg-[#FFF4F4] px-4 py-3 text-sm font-bold text-[#9A363D]"><CircleAlert className="h-4 w-4" /> {data?.summary.awaitingReview ?? 0} ожидают решения</div>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard icon={<Clock3 className="h-4 w-4" />} label="В очереди" value={data?.summary.awaitingReview ?? 0} tone="rose" note="результатов ждут P&amp;C" />
      <SummaryCard icon={<ImageIcon className="h-4 w-4" />} label="Пруфов приложено" value={data?.summary.proofsAttached ?? 0} tone="sky" note="фото, чеки и файлы" />
      <SummaryCard icon={<UsersRound className="h-4 w-4" />} label="Участников в очереди" value={data?.summary.participantsInQueue ?? 0} tone="mint" note="кому нужен ответ" />
      <SummaryCard icon={<Trophy className="h-4 w-4" />} label="Признанный вклад" value={data?.recognition.contributorsWithConfirmedResult ?? 0} tone="mint" note={`${data?.recognition.periodFinishers ?? 0} завершили все задания периода`} />
    </section>

    <section className="grid gap-5 xl:grid-cols-[minmax(330px,0.78fr)_minmax(0,1.55fr)]">
      <aside className={`${mobileDetailOpen ? "hidden xl:block" : "block"} overflow-hidden rounded-[1.75rem] border border-black/[0.055] bg-card shadow-[0_24px_50px_-42px_rgba(32,70,46,0.38)]`}>
        <div className="border-b border-black/[0.055] p-4">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Найти участника или задание" className="h-10 w-full rounded-xl border border-[#D9E7DC] bg-[#FAFCF9] pl-10 pr-3 text-sm outline-none transition focus:border-[#7EA98A]" /></div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5"><button onClick={() => setTeamFilter("all")} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition ${teamFilter === "all" ? "bg-[#163F2F] text-white" : "bg-[#EFF5EE] text-[#55705E]"}`}>Все команды</button>{teamNames.map(name => <button key={name} onClick={() => setTeamFilter(name)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition ${teamFilter === name ? "bg-[#163F2F] text-white" : "bg-[#EFF5EE] text-[#55705E]"}`}>{name}</button>)}</div>
        </div>
        <div className="max-h-[620px] overflow-y-auto p-2">
          {isLoading ? <div className="p-8 text-center text-sm text-muted-foreground">Собираем живую очередь…</div> : visibleQueue.length ? visibleQueue.map(item => <button key={item.assignmentId} onClick={() => { telegramSelectionHaptic(); setSelectedId(item.assignmentId); }} className={`soft-press w-full rounded-2xl p-4 text-left transition ${selected?.assignmentId === item.assignmentId ? "bg-[#FFF4F4] ring-1 ring-[#F3C9CE]" : "hover:bg-[#F6FAF4]"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[#193E2D]">{item.participantName || "Без имени"}</p><p className="mt-1 text-xs text-muted-foreground">{item.teamName || "Без команды"}</p></div><Badge className="border-0 bg-[#FBE0E1] text-[#9A363D] hover:bg-[#FBE0E1]">{item.attachmentCount} пруф.</Badge></div><p className="mt-3 line-clamp-2 text-sm font-semibold text-[#355544]">{item.activityTitle}</p><div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>{compactDate(item.submittedAt)}</span><span>{item.responseCount} шага <ChevronRight className="ml-0.5 inline h-3.5 w-3.5" /></span></div></button>) : <EmptyQueue />}
        </div>
      </aside>

      <section className={`${!selected && isMobile ? "hidden" : "block"} min-h-[580px] overflow-hidden rounded-[1.75rem] border border-black/[0.055] bg-card shadow-[0_24px_50px_-42px_rgba(32,70,46,0.38)]`}>
        {selected ? <div className="flex h-full flex-col"><div className="border-b border-black/[0.055] bg-[linear-gradient(135deg,#F8FCF5,#FFF7F4)] p-5 sm:p-7"><button onClick={() => { telegramImpact("light"); setSelectedId(null); }} className="soft-press mb-5 flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-extrabold text-[#355544] xl:hidden"><ArrowLeft className="h-4 w-4" />К очереди</button><div className="flex flex-col justify-between gap-5 sm:flex-row"><div><p className="text-[10px] font-extrabold tracking-[0.14em] text-[#9A363D]">РЕЗУЛЬТАТ НА ПРОВЕРКЕ</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[#163F2F]">{selected.activityTitle}</h2><div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#55705E]"><span className="rounded-full bg-white px-3 py-1.5 shadow-sm">{selected.participantName || "Без имени"}</span><span className="rounded-full bg-white px-3 py-1.5 shadow-sm">{selected.teamName || "Без команды"}</span><span className="rounded-full bg-[#FFF1D6] px-3 py-1.5 text-[#7A5512]">+{selected.activityPoints} баллов после approve</span></div></div><div className="text-left sm:text-right"><p className="text-xs text-muted-foreground">Отправлено</p><p className="mt-1 text-sm font-bold text-[#355544]">{compactDate(selected.submittedAt)}</p></div></div></div>
          <div className="flex-1 space-y-4 p-5 sm:p-7"><div className="flex items-center justify-between"><div><p className="text-xs font-extrabold tracking-[0.12em] text-[#55705E]">ДОКАЗАТЕЛЬСТВА</p><p className="mt-1 text-sm text-muted-foreground">Проверьте каждый шаг перед решением.</p></div><Badge className="border-0 bg-[#E9F2E7] text-[#355544] hover:bg-[#E9F2E7]">{selected.evidence.length} шагов</Badge></div><div className="space-y-3">{selected.evidence.map((proof, index) => <article key={`${proof.responseId}-${proof.attachmentId ?? index}`} className="rounded-2xl border border-[#E2ECE1] bg-[#FBFDF9] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#55705E]">Шаг {proof.stepOrder}</p><p className="mt-1 text-sm font-bold text-[#193E2D]">{proof.instruction}</p></div><Badge variant="outline" className="border-[#D7E6D6] bg-white text-[10px]">{proof.inputType}</Badge></div>{proof.textResponse ? <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white p-3 text-sm leading-6 text-[#3E5D49]">{proof.textResponse}</p> : null}{proof.attachmentUrl ? <div className="mt-3">{proof.attachmentMimeType?.startsWith("image/") ? <a href={proof.attachmentUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-[#E1EADD]"><img src={proof.attachmentUrl} alt={`Пруф: шаг ${proof.stepOrder}`} className="max-h-72 w-full object-cover transition hover:scale-[1.01]" /></a> : <a href={proof.attachmentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-[#DCE8DA] bg-white p-3 text-sm font-bold text-[#355544] hover:bg-[#F5FAF3]"><FileText className="h-5 w-5" /><span className="min-w-0 flex-1 truncate">{proof.attachmentName || "Открыть приложенный файл"}</span></a>}</div> : <p className="mt-3 text-xs text-muted-foreground">Участник добавил текст без вложения.</p>}</article>)}</div></div>
          <footer className="sticky bottom-0 flex flex-col gap-3 border-t border-black/[0.055] bg-white/95 p-4 pb-[calc(1rem+var(--tg-safe-bottom))] backdrop-blur sm:flex-row sm:justify-end sm:p-5"><Button variant="outline" onClick={() => openDecision("rejected")} disabled={moderate.isPending} className="h-12 rounded-xl border-[#EFC7C9] text-[#A6444B] hover:bg-[#FFF4F4]"><X className="mr-2 h-4 w-4" />Попросить доработать</Button><Button onClick={() => openDecision("approved")} disabled={moderate.isPending} className="h-12 rounded-xl bg-[#1E6B46] hover:bg-[#155336]"><Check className="mr-2 h-4 w-4" />Подтвердить и начислить</Button></footer>
        </div> : <EmptyQueue />}
      </section>
    </section>

    <section className="grid gap-5 2xl:grid-cols-[0.9fr_1.35fr]"><ActivityTable title="Ритм команд" subtitle="Подтверждения и готовность всей команды" rows={data?.teams ?? []} team /><ActivityTable title="Вклад участников" subtitle="Все одобренные участники, включая тех, кто пока не начал" rows={data?.participants ?? []} /></section>
    <Dialog open={Boolean(pendingDecision)} onOpenChange={open => { if (!open && !moderate.isPending) setPendingDecision(null); }}><DialogContent className="max-w-md rounded-[1.7rem]"><DialogHeader><DialogTitle>{pendingDecision === "approved" ? "Подтвердить результат?" : "Вернуть на доработку"}</DialogTitle><DialogDescription>{pendingDecision === "approved" ? `Участник получит +${selected?.activityPoints ?? 0} баллов и Telegram-уведомление.` : "Напишите конкретно, что стоит дополнить. Этот текст увидит участник в Telegram."}</DialogDescription></DialogHeader><Textarea value={decisionComment} onChange={event => setDecisionComment(event.target.value)} placeholder={pendingDecision === "approved" ? "Комментарий (необязательно)" : "Например: добавьте фото чека к шагу 2"} className="min-h-28 rounded-xl" autoFocus={pendingDecision === "rejected"} /><DialogFooter className="flex-col gap-2 sm:flex-row"><Button variant="outline" onClick={() => setPendingDecision(null)} disabled={moderate.isPending} className="h-11 rounded-xl">Отмена</Button><Button onClick={decide} disabled={moderate.isPending || (pendingDecision === "rejected" && !decisionComment.trim())} className={`h-11 rounded-xl ${pendingDecision === "approved" ? "bg-[#1E6B46] hover:bg-[#155336]" : "bg-[#A6444B] hover:bg-[#8E363D]"}`}>{pendingDecision === "approved" ? "Подтвердить" : "Отправить на доработку"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function SummaryCard({ icon, label, value, note, tone }: { icon: React.ReactNode; label: string; value: number; note: string; tone: "rose" | "sky" | "mint" }) {
  const tones = { rose: "border-[#F3CFD2] bg-[#FFF7F7] text-[#A6444B]", sky: "border-[#CEE6F2] bg-[#F4FBFE] text-[#36728E]", mint: "border-[#D7E8D8] bg-[#F7FCF5] text-[#39704C]" };
  return <article className={`rounded-[1.5rem] border p-5 ${tones[tone]}`}><div className="flex items-center justify-between"><p className="text-xs font-extrabold uppercase tracking-[0.12em]">{label}</p><span className="rounded-xl bg-white/80 p-2">{icon}</span></div><p className="mt-5 text-3xl font-extrabold tracking-[-0.05em]">{value}</p><p className="mt-1 text-xs opacity-75">{note}</p></article>;
}

function EmptyQueue() { return <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF4E8]"><Inbox className="h-5 w-5 text-[#477957]" /></span><p className="mt-4 font-bold text-[#193E2D]">Очередь сейчас чистая</p><p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">Когда участник отправит результат, он сразу появится здесь вместе со всеми пруфами.</p></div>; }

function ActivityTable({ title, subtitle, rows, team = false }: { title: string; subtitle: string; rows: Array<{ id: number; name: string | null; teamName?: string | null; memberCount?: number; assignedCount: number; submittedCount: number; approvedCount: number; awardedPoints: number }>; team?: boolean }) {
  return <section className="overflow-hidden rounded-[1.75rem] border border-black/[0.055] bg-card"><div className="flex items-start justify-between gap-4 border-b border-black/[0.055] p-5"><div><h2 className="text-xl font-extrabold tracking-[-0.035em] text-[#163F2F]">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{subtitle}</p></div><Trophy className="h-5 w-5 text-[#E0A02E]" /></div><div className="space-y-2 p-3 md:hidden">{rows.length ? rows.map(row => <article key={row.id} className="rounded-2xl bg-[#F8FBF6] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold text-[#264B37]">{row.name || "Без названия"}</p><p className="mt-1 text-xs text-muted-foreground">{team ? `${row.memberCount ?? 0} участников` : row.teamName || "Без команды"}</p></div><p className="shrink-0 text-sm font-extrabold text-[#A06F15]">{row.awardedPoints} б.</p></div><div className="mt-4 flex items-center justify-between text-xs"><span className="font-bold text-[#55705E]">Готовность</span><span className="text-muted-foreground">{row.submittedCount}/{row.assignedCount} · принято {row.approvedCount}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E8EFE7]"><div className="h-full rounded-full bg-[#6EAA78]" style={{ width: `${percentage(row.submittedCount, row.assignedCount)}%` }} /></div></article>) : <p className="p-6 text-center text-sm text-muted-foreground">Данные появятся после первой активности.</p>}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[650px] text-left"><thead className="bg-[#F7FAF5] text-[10px] font-extrabold tracking-[0.12em] text-[#708275]"><tr><th className="px-5 py-3">{team ? "КОМАНДА" : "УЧАСТНИК"}</th>{team ? <th className="px-5 py-3">СОСТАВ</th> : <th className="px-5 py-3">КОМАНДА</th>}<th className="px-5 py-3">ГОТОВНОСТЬ</th><th className="px-5 py-3">ПОДТВЕРЖДЕНО</th><th className="px-5 py-3 text-right">БАЛЛЫ</th></tr></thead><tbody className="divide-y divide-black/[0.055]">{rows.length ? rows.map(row => <tr key={row.id} className="text-sm"><td className="px-5 py-4 font-bold text-[#264B37]">{row.name || "Без названия"}</td><td className="px-5 py-4 text-muted-foreground">{team ? `${row.memberCount ?? 0} чел.` : row.teamName || "—"}</td><td className="px-5 py-4"><div className="flex items-center gap-2"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#E8EFE7]"><div className="h-full rounded-full bg-[#6EAA78]" style={{ width: `${percentage(row.submittedCount, row.assignedCount)}%` }} /></div><span className="text-xs text-muted-foreground">{row.submittedCount}/{row.assignedCount}</span></div></td><td className="px-5 py-4 font-semibold text-[#3F6F4D]">{row.approvedCount}</td><td className="px-5 py-4 text-right font-extrabold text-[#A06F15]">{row.awardedPoints}</td></tr>) : <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">Данные появятся после первой активности.</td></tr>}</tbody></table></div></section>;
}
