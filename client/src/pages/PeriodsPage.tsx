import { AdminAccessNotice } from "@/components/AdminAccessNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { CalendarDays, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

const statuses = { draft: "Черновик", active: "Активен", completed: "Завершён", archived: "Архив" } as const;

export default function PeriodsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: periods, isLoading } = trpc.admin.periods.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const create = trpc.admin.periods.create.useMutation({
    onSuccess: async () => { setTitle(""); setDescription(""); setStartsAt(""); setEndsAt(""); setStatus("draft"); await utils.admin.periods.list.invalidate(); await utils.admin.overview.invalidate(); toast.success("Период создан"); },
    onError: error => toast.error(error.message),
  });
  if (user?.role !== "admin") return <AdminAccessNotice />;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate({ title, description: description || undefined, startsAt: new Date(`${startsAt}T00:00:00`), endsAt: new Date(`${endsAt}T23:59:59`), status });
  }

  return <div className="mx-auto max-w-7xl space-y-7 px-1 py-4 sm:px-5 sm:py-7">
    <header><p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground">КАЛЕНДАРЬ АКТИВНОСТЕЙ</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-0.055em]">Периоды</h1><p className="mt-3 text-sm text-muted-foreground">Один активный период объединяет всех участников единым сроком и одинаковым количеством заданий.</p></header>
    <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
      <form onSubmit={submit} className="rounded-[1.65rem] bg-[#FBE8EC] p-6 sm:p-7"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80"><CalendarDays className="h-4 w-4" /></div><h2 className="mt-5 text-xl font-extrabold tracking-[-0.04em]">Новый период</h2><p className="mt-2 text-sm leading-6 text-[#76505A]">Активировать можно только один период за раз. Задания добавляются следующим шагом.</p><label className="mt-6 block text-xs font-bold">Название<Input value={title} onChange={event => setTitle(event.target.value)} required maxLength={180} className="mt-2 h-11 rounded-xl border-black/10 bg-white" placeholder="Добрые дела · Неделя 1" /></label><label className="mt-4 block text-xs font-bold">Описание <span className="font-normal text-muted-foreground">(необязательно)</span><Textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={4000} className="mt-2 min-h-20 rounded-xl border-black/10 bg-white" placeholder="Короткое описание активности" /></label><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-bold">Начало<Input type="date" value={startsAt} onChange={event => setStartsAt(event.target.value)} required className="mt-2 h-11 rounded-xl border-black/10 bg-white" /></label><label className="text-xs font-bold">Окончание<Input type="date" value={endsAt} onChange={event => setEndsAt(event.target.value)} required className="mt-2 h-11 rounded-xl border-black/10 bg-white" /></label></div><label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl bg-white/70 px-4 py-3 text-sm"><input type="checkbox" checked={status === "active"} onChange={event => setStatus(event.target.checked ? "active" : "draft")} className="h-4 w-4 rounded border-black/20" /><span><b>Сделать активным</b><small className="mt-0.5 block text-xs text-muted-foreground">Период сразу станет единственным текущим.</small></span></label><Button type="submit" disabled={create.isPending} className="mt-5 h-11 w-full rounded-xl bg-black font-bold text-white hover:bg-black/85">Сохранить период</Button></form>
      <section className="rounded-[1.65rem] border border-black/[0.055] bg-card p-6 sm:p-7"><div className="flex items-center justify-between"><div><p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground">ИСТОРИЯ</p><h2 className="mt-2 text-xl font-extrabold tracking-[-0.04em]">Периоды активности</h2></div><Badge variant="secondary" className="rounded-full px-3">{periods?.length ?? 0}</Badge></div><div className="mt-6 space-y-3">{isLoading ? <p className="text-sm text-muted-foreground">Загрузка периодов…</p> : periods?.length ? periods.map(period => <article key={period.id} className="flex flex-col gap-4 rounded-2xl bg-[#F4F6F7] p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><h3 className="font-extrabold tracking-[-0.03em]">{period.title}</h3><Badge className="border-0 bg-white text-black hover:bg-white">{statuses[period.status]}</Badge></div><p className="mt-1.5 text-xs text-muted-foreground">{new Date(period.startsAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} — {new Date(period.endsAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</p>{period.description && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{period.description}</p>}</div><div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" /> {period.taskCount} заданий</div></article>) : <div className="rounded-2xl border border-dashed border-black/10 px-5 py-12 text-center text-sm text-muted-foreground">Периоды ещё не создавались.</div>}</div></section>
    </div>
  </div>;
}
