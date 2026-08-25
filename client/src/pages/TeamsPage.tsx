import { AdminAccessNotice } from "@/components/AdminAccessNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Archive, Layers2, Pencil, Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export default function TeamsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: teams, isLoading } = trpc.admin.teams.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createTeam = trpc.admin.teams.create.useMutation({
    onSuccess: async () => {
      setName("");
      setDescription("");
      await utils.admin.teams.list.invalidate();
      await utils.admin.overview.invalidate();
      toast.success("Команда создана");
    },
    onError: error => toast.error(error.message),
  });
  const refreshTeams = async () => { await Promise.all([utils.admin.teams.list.invalidate(), utils.admin.overview.invalidate()]); };
  const updateTeam = trpc.admin.teams.update.useMutation({ onSuccess: async () => { await refreshTeams(); toast.success("Команда обновлена"); }, onError: error => toast.error(error.message) });
  const archiveTeam = trpc.admin.teams.archive.useMutation({ onSuccess: async () => { await refreshTeams(); toast.success("Команда переведена в архив"); }, onError: error => toast.error(error.message) });

  if (user?.role !== "admin") return <AdminAccessNotice />;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createTeam.mutate({ name, description: description || undefined });
  }
  function editTeam(team: { id: number; name: string; description: string | null }) {
    const nextName = window.prompt("Название команды", team.name);
    if (nextName === null || !nextName.trim()) return;
    const nextDescription = window.prompt("Описание команды", team.description || "");
    if (nextDescription === null) return;
    updateTeam.mutate({ id: team.id, name: nextName, description: nextDescription || undefined });
  }
  function archive(team: { id: number; name: string }) { if (window.confirm(`Перевести команду «${team.name}» в архив? Новые участники не смогут её выбрать.`)) archiveTeam.mutate({ id: team.id }); }

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-1 py-4 sm:px-5 sm:py-7">
      <header><p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground">СТРУКТУРА</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-0.055em]">Команды</h1><p className="mt-3 text-sm text-muted-foreground">Именно эти команды участники выберут при регистрации в боте.</p></header>
      <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
        <form onSubmit={submit} className="rounded-[1.65rem] bg-[#E2F0FA] p-6 sm:p-7">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80"><Plus className="h-4 w-4" /></div>
          <h2 className="mt-5 text-xl font-extrabold tracking-[-0.04em]">Новая команда</h2>
          <p className="mt-2 text-sm leading-6 text-[#49636F]">Короткое, узнаваемое название поможет участникам выбрать нужную команду.</p>
          <label className="mt-6 block text-xs font-bold">Название<Input value={name} onChange={event => setName(event.target.value)} required maxLength={160} className="mt-2 h-11 rounded-xl border-black/10 bg-white" placeholder="Например, Команда Севера" /></label>
          <label className="mt-4 block text-xs font-bold">Описание <span className="font-normal text-muted-foreground">(необязательно)</span><Textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={2000} className="mt-2 min-h-24 rounded-xl border-black/10 bg-white" placeholder="Подразделение, направление или общий контекст" /></label>
          <Button type="submit" disabled={createTeam.isPending} className="mt-5 h-11 w-full rounded-xl bg-black font-bold text-white hover:bg-black/85">Создать команду</Button>
        </form>
        <section className="rounded-[1.65rem] border border-black/[0.055] bg-card p-6 sm:p-7">
          <div className="flex items-center justify-between"><div><p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground">СПИСОК</p><h2 className="mt-2 text-xl font-extrabold tracking-[-0.04em]">Команды</h2></div><Badge variant="secondary" className="rounded-full px-3">{teams?.filter(team => team.isActive).length ?? 0} активных</Badge></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {isLoading ? <p className="text-sm text-muted-foreground">Загрузка команд…</p> : teams?.length ? teams.map(team => <article key={team.id} className="rounded-2xl bg-[#F4F6F7] p-4"><div className="flex items-start justify-between gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBE8EC]"><Layers2 className="h-4 w-4" /></div><Badge className="border-0 bg-white text-black hover:bg-white">{team.isActive ? "Активна" : "В архиве"}</Badge></div><h3 className="mt-5 font-extrabold tracking-[-0.03em]">{team.name}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{team.description || "Описание не добавлено"}</p>{team.isActive && <div className="mt-4 flex gap-2"><Button onClick={() => editTeam(team)} variant="outline" disabled={updateTeam.isPending} className="h-8 rounded-lg border-black/10 px-2.5 text-[11px] font-bold"><Pencil className="mr-1 h-3 w-3" />Изменить</Button><Button onClick={() => archive(team)} variant="ghost" disabled={archiveTeam.isPending} className="h-8 rounded-lg px-2.5 text-[11px] font-bold text-muted-foreground"><Archive className="mr-1 h-3 w-3" />Архив</Button></div>}</article>) : <div className="rounded-2xl border border-dashed border-black/10 px-5 py-12 text-center text-sm text-muted-foreground sm:col-span-2">Пока нет ни одной команды. Создайте первую команду слева.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
