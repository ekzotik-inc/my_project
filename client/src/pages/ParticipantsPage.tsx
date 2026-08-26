import { AdminAccessNotice } from "@/components/AdminAccessNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { telegramImpact, telegramSelectionHaptic } from "@/lib/telegramNative";
import { trpc } from "@/lib/trpc";
import { Check, UserRoundCheck, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusLabels = { pending: "Ожидает", approved: "Принят", rejected: "Отклонён" } as const;
const roleLabels = { participant: "Участник", pc_admin: "P&C Admin", chief_admin: "Chief Admin" } as const;
type ParticipantRole = keyof typeof roleLabels;

function statusTone(status: keyof typeof statusLabels) {
  return status === "approved" ? "bg-[#E8F3EE] text-[#355544] hover:bg-[#E8F3EE]" : status === "pending" ? "bg-[#F5EDE0] text-black hover:bg-[#F5EDE0]" : "bg-[#FBE8EC] text-[#814452] hover:bg-[#FBE8EC]";
}

export default function ParticipantsPage() {
  const { user } = useAuth();
  const canModerate = user?.role === "admin" || user?.role === "pc_admin";
  const canManageRoles = user?.role === "admin";
  const utils = trpc.useUtils();
  const { data: people, isLoading } = trpc.admin.participants.useQuery(undefined, { enabled: canModerate });
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const moderate = trpc.admin.moderateParticipant.useMutation({
    onSuccess: async () => {
      telegramImpact("medium");
      setRejectingId(null);
      setReason("");
      await Promise.all([utils.admin.participants.invalidate(), utils.admin.overview.invalidate()]);
      toast.success("Данные участника обновлены");
    },
    onError: error => toast.error(error.message),
  });

  if (!canModerate) return <AdminAccessNotice />;

  function approve(id: number, role: ParticipantRole = "participant") {
    if (!canManageRoles && role !== "participant") return;
    telegramImpact("light");
    moderate.mutate({ participantId: id, status: "approved", role });
  }

  function reject() {
    if (!rejectingId) return;
    if (!reason.trim()) return toast.error("Добавьте понятный комментарий для участника");
    telegramImpact("light");
    moderate.mutate({ participantId: rejectingId, status: "rejected", role: "participant", rejectionReason: reason.trim() });
  }

  return <div className="mx-auto max-w-7xl space-y-6 px-1 py-4 sm:px-5 sm:py-7">
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground">РЕГИСТРАЦИЯ И РОЛИ</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-0.055em]">Участники</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">P&amp;C принимает и отклоняет заявки. Роли и доступ к управлению задаёт только Chief.</p></div><div className="flex items-center gap-2 rounded-2xl bg-[#E8F3EE] px-4 py-3 text-sm font-bold"><UsersRound className="h-4 w-4" /> {people?.length ?? 0} в базе</div></header>

    <section className="overflow-hidden rounded-[1.65rem] border border-black/[0.055] bg-card">
      <div className="space-y-3 p-3 md:hidden">{isLoading ? <p className="p-8 text-center text-sm text-muted-foreground">Загрузка участников…</p> : people?.length ? people.map(person => <article key={person.id} className="rounded-2xl bg-[#F8FBF6] p-4"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E2F0FA] text-xs font-extrabold">{person.fullName?.slice(0, 1)?.toUpperCase() || "?"}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-bold">{person.fullName || "Без имени"}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{person.telegramUsername ? `@${person.telegramUsername}` : "Telegram"} · {person.teamName || "Команда не выбрана"}</p></div><Badge className={`shrink-0 border-0 ${statusTone(person.status)}`}>{statusLabels[person.status]}</Badge></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><span className="rounded-xl bg-white px-3 py-2 text-muted-foreground">{person.phone || "Телефон не указан"}</span><span className="rounded-xl bg-white px-3 py-2 text-muted-foreground">{new Date(person.createdAt).toLocaleDateString("ru-RU")}</span></div>{canManageRoles && person.status === "approved" ? <Select value={person.role} onValueChange={role => approve(person.id, role as ParticipantRole)} disabled={moderate.isPending}><SelectTrigger className="mt-3 h-11 w-full rounded-xl border-black/10 bg-white text-xs"><SelectValue>{roleLabels[person.role]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="participant">Участник</SelectItem><SelectItem value="pc_admin">P&amp;C Admin</SelectItem><SelectItem value="chief_admin">Chief Admin</SelectItem></SelectContent></Select> : null}{person.status === "pending" ? <div className="mt-3 grid grid-cols-2 gap-2"><Button onClick={() => approve(person.id)} disabled={moderate.isPending} className="h-11 rounded-xl bg-black text-xs font-bold text-white hover:bg-black/85"><Check className="mr-1.5 h-4 w-4" />Принять</Button><Button onClick={() => { telegramSelectionHaptic(); setRejectingId(person.id); setReason(""); }} disabled={moderate.isPending} variant="outline" className="h-11 rounded-xl border-[#EFC7C9] text-xs font-bold text-[#A6444B] hover:bg-[#FFF4F4]"><X className="mr-1.5 h-4 w-4" />Отклонить</Button></div> : <p className="mt-3 text-xs text-muted-foreground">{person.status === "rejected" ? "Заявку можно принять повторно." : canManageRoles ? "Роль можно изменить выше." : "Роль назначает Chief."}</p>}</div></div></article>) : <EmptyParticipants />}</div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1040px] text-left"><thead className="bg-[#F4F6F7] text-[10px] font-bold tracking-[0.13em] text-muted-foreground"><tr><th className="px-6 py-4">УЧАСТНИК</th><th className="px-6 py-4">КОМАНДА</th><th className="px-6 py-4">СТАТУС</th><th className="px-6 py-4">РОЛЬ</th><th className="px-6 py-4">ТЕЛЕФОН</th><th className="px-6 py-4">РЕГИСТРАЦИЯ</th><th className="px-6 py-4 text-right">ДЕЙСТВИЯ</th></tr></thead><tbody className="divide-y divide-black/[0.055]">{isLoading ? <tr><td colSpan={7} className="px-6 py-14 text-center text-sm text-muted-foreground">Загрузка участников…</td></tr> : people?.length ? people.map(person => <tr key={person.id} className="text-sm"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E2F0FA] text-xs font-extrabold">{person.fullName?.slice(0, 1)?.toUpperCase() || "?"}</span><div><p className="font-bold">{person.fullName || "Без имени"}</p><p className="mt-0.5 text-xs text-muted-foreground">{person.telegramUsername ? `@${person.telegramUsername}` : "Telegram"}</p></div></div></td><td className="px-6 py-4 text-muted-foreground">{person.teamName || "Не выбрана"}</td><td className="px-6 py-4"><Badge className={`border-0 ${statusTone(person.status)}`}>{statusLabels[person.status]}</Badge></td><td className="px-6 py-4">{canManageRoles ? <Select value={person.role} onValueChange={role => approve(person.id, role as ParticipantRole)} disabled={person.status !== "approved" || moderate.isPending}><SelectTrigger className="h-9 w-36 rounded-xl border-black/10 bg-transparent text-xs"><SelectValue>{roleLabels[person.role]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="participant">Участник</SelectItem><SelectItem value="pc_admin">P&amp;C Admin</SelectItem><SelectItem value="chief_admin">Chief Admin</SelectItem></SelectContent></Select> : <span className="text-xs text-muted-foreground">{roleLabels[person.role]}</span>}</td><td className="px-6 py-4 text-muted-foreground">{person.phone || "—"}</td><td className="px-6 py-4 text-muted-foreground">{new Date(person.createdAt).toLocaleDateString("ru-RU")}</td><td className="px-6 py-4 text-right">{person.status === "pending" ? <div className="flex justify-end gap-2"><Button onClick={() => approve(person.id)} disabled={moderate.isPending} className="h-9 rounded-xl bg-black px-3 text-xs font-bold text-white hover:bg-black/85"><Check className="mr-1 h-3.5 w-3.5" />Принять</Button><Button onClick={() => { telegramSelectionHaptic(); setRejectingId(person.id); setReason(""); }} disabled={moderate.isPending} variant="outline" className="h-9 rounded-xl border-black/10 px-3 text-xs font-bold"><X className="mr-1 h-3.5 w-3.5" />Отклонить</Button></div> : <span className="text-xs text-muted-foreground">{person.status === "rejected" ? "Можно принять повторно" : canManageRoles ? "Управляйте ролью" : "Роль назначает Chief"}</span>}</td></tr>) : <tr><td colSpan={7}><EmptyParticipants /></td></tr>}</tbody></table></div>
    </section>

    <Dialog open={Boolean(rejectingId)} onOpenChange={open => { if (!open && !moderate.isPending) setRejectingId(null); }}><DialogContent className="max-w-md rounded-[1.7rem]"><DialogHeader><DialogTitle>Отклонить заявку?</DialogTitle><DialogDescription>Участник получит этот комментарий в Telegram и поймёт, что необходимо исправить или уточнить.</DialogDescription></DialogHeader><Textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="Например: уточните, пожалуйста, вашу команду" className="min-h-28 rounded-xl" autoFocus /><DialogFooter className="flex-col gap-2 sm:flex-row"><Button variant="outline" className="h-11 rounded-xl" onClick={() => setRejectingId(null)} disabled={moderate.isPending}>Отмена</Button><Button className="h-11 rounded-xl bg-[#A6444B] hover:bg-[#8E363D]" onClick={reject} disabled={moderate.isPending || !reason.trim()}>Отклонить заявку</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function EmptyParticipants() {
  return <div className="px-6 py-16 text-center"><UserRoundCheck className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-3 text-sm font-bold">Участников пока нет</p><p className="mt-1 text-xs text-muted-foreground">После подключения бота здесь появятся заявки на регистрацию.</p></div>;
}
