import { AdminAccessNotice } from "@/components/AdminAccessNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Eye, ImagePlus, Link2, Send, UsersRound, X } from "lucide-react";
import { ChangeEvent, FormEvent, ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";

type ActionButton = { label: string; url: string };
const blankButton = (): ActionButton => ({ label: "", url: "" });

function telegramMarkdownPreview(value: string) {
  const tokenPattern = /(\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`|\[[^\]]+\]\([^\s)]+\))/g;
  return value.split("\n").map((line, lineIndex) => {
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    for (const match of Array.from(line.matchAll(tokenPattern))) {
      const token = match[0];
      const start = match.index ?? 0;
      if (start > lastIndex) nodes.push(line.slice(lastIndex, start));
      if (token.startsWith("*")) nodes.push(<strong key={`${lineIndex}-${start}`}>{token.slice(1, -1)}</strong>);
      else if (token.startsWith("_")) nodes.push(<em key={`${lineIndex}-${start}`}>{token.slice(1, -1)}</em>);
      else if (token.startsWith("`")) nodes.push(<code key={`${lineIndex}-${start}`} className="rounded bg-black/5 px-1">{token.slice(1, -1)}</code>);
      else {
        const link = /^\[([^\]]+)\]\(([^\s)]+)\)$/.exec(token);
        nodes.push(link ? <a key={`${lineIndex}-${start}`} href={link[2]} target="_blank" rel="noreferrer" className="underline underline-offset-2">{link[1]}</a> : token);
      }
      lastIndex = start + token.length;
    }
    if (lastIndex < line.length) nodes.push(line.slice(lastIndex));
    return <p key={lineIndex} className={lineIndex ? "mt-2" : ""}>{nodes.length ? nodes : " "}</p>;
  });
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Не удалось прочитать файл")); reader.readAsDataURL(file); });
}

export default function BroadcastsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: teams } = trpc.admin.teams.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const { data: broadcasts, isLoading } = trpc.admin.broadcasts.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"all_approved" | "teams">("all_approved");
  const [teamIds, setTeamIds] = useState<number[]>([]);
  const [buttons, setButtons] = useState<ActionButton[]>([]);
  const [image, setImage] = useState<{ key: string; url: string; preview: string } | null>(null);
  const upload = trpc.admin.media.upload.useMutation({ onError: error => toast.error(error.message) });
  const recipientCount = trpc.admin.broadcasts.recipientCount.useQuery({ audience, teamIds }, { enabled: user?.role === "admin" });
  const createDraft = trpc.admin.broadcasts.createDraft.useMutation({
    onSuccess: async () => { await utils.admin.broadcasts.list.invalidate(); toast.success("Черновик рассылки сохранён"); },
    onError: error => toast.error(error.message),
  });
  const send = trpc.admin.broadcasts.send.useMutation({
    onSuccess: async result => { await utils.admin.broadcasts.list.invalidate(); toast.success(`Рассылка завершена: ${result.sent} отправлено, ${result.failed} ошибок`); },
    onError: error => toast.error(error.message),
  });
  const activeTeams = useMemo(() => teams?.filter(team => team.isActive) ?? [], [teams]);
  if (user?.role !== "admin") return <AdminAccessNotice />;
  function toggleTeam(id: number) { setTeamIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]); }
  async function uploadImage(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/")) return toast.error("Выберите файл изображения"); try { const base64 = await readAsDataUrl(file); const stored = await upload.mutateAsync({ name: file.name, mimeType: file.type, base64 }); setImage({ ...stored, preview: base64 }); } catch (error) { if (error instanceof Error) toast.error(error.message); } }
  function saveDraft(event: FormEvent<HTMLFormElement>) { event.preventDefault(); createDraft.mutate({ title, message, audience, teamIds, buttons: buttons.filter(button => button.label || button.url), imageKey: image?.key || null, imageUrl: image?.url || null }); }
  function sendNow(broadcastId: number, recipientTotal?: number) { if (window.confirm(`Отправить рассылку ${recipientTotal ?? 0} получателям сейчас? Действие нельзя отменить.`)) send.mutate({ broadcastId }); }

  return <div className="mx-auto max-w-7xl space-y-7 px-1 py-4 sm:px-5 sm:py-7"><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground">КОММУНИКАЦИЯ</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-0.055em]">Рассылки</h1><p className="mt-3 max-w-2xl text-sm text-muted-foreground">Соберите сообщение, выберите аудиторию, проверьте карточку справа и только затем подтвердите отправку.</p></div><div className="flex items-center gap-2 rounded-2xl bg-[#E2F0FA] px-4 py-3 text-sm font-bold"><UsersRound className="h-4 w-4" /> {recipientCount.data ?? 0} получателей</div></header><div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]"><form onSubmit={saveDraft} className="rounded-[1.65rem] border border-black/[0.055] bg-card p-6 sm:p-7"><h2 className="text-xl font-extrabold tracking-[-0.04em]">Новая рассылка</h2><label className="mt-6 block text-xs font-bold">Внутреннее название<Input value={title} onChange={event => setTitle(event.target.value)} required maxLength={180} className="mt-2 h-11 rounded-xl" placeholder="Например, старт новой недели" /></label><label className="mt-4 block text-xs font-bold">Сообщение <span className="font-normal text-muted-foreground">(Telegram Markdown: *жирный*, _курсив_, [ссылка](https://…))</span><Textarea value={message} onChange={event => setMessage(event.target.value)} required maxLength={4000} className="mt-2 min-h-36 rounded-xl" placeholder="*Новая неделя добрых дел*\n\nСегодня открылись задания…" /></label><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-xs font-bold">Аудитория</p><Select value={audience} onValueChange={value => setAudience(value as "all_approved" | "teams")}><SelectTrigger className="mt-2 h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all_approved">Все одобренные участники</SelectItem><SelectItem value="teams">Выбранные команды</SelectItem></SelectContent></Select></div><div><p className="text-xs font-bold">Изображение <span className="font-normal text-muted-foreground">(до 5 МБ)</span></p><label className="mt-2 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 bg-[#F4F6F7] text-xs font-bold hover:bg-[#EAF2F7]"><ImagePlus className="h-4 w-4" />{upload.isPending ? "Загрузка…" : image ? "Заменить изображение" : "Добавить изображение"}<input onChange={uploadImage} type="file" accept="image/*" className="hidden" /></label></div></div>{audience === "teams" && <div className="mt-5 rounded-2xl bg-[#F4F6F7] p-4"><p className="text-xs font-bold">Команды получателей</p><div className="mt-3 flex flex-wrap gap-2">{activeTeams.length ? activeTeams.map(team => <label key={team.id} className={`cursor-pointer rounded-full px-3 py-2 text-xs font-bold transition-colors ${teamIds.includes(team.id) ? "bg-black text-white" : "bg-white text-black"}`}><input type="checkbox" checked={teamIds.includes(team.id)} onChange={() => toggleTeam(team.id)} className="sr-only" />{team.name}</label>) : <p className="text-xs text-muted-foreground">Сначала создайте команды.</p>}</div></div>}<div className="mt-5 border-t border-black/[0.06] pt-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold">Кнопки</p><p className="mt-1 text-xs text-muted-foreground">До 8 внешних ссылок в сообщении.</p></div><Button type="button" variant="ghost" onClick={() => setButtons(current => [...current, blankButton()])} className="h-9 rounded-xl px-3 text-xs font-bold"><Link2 className="mr-1.5 h-3.5 w-3.5" />Добавить</Button></div><div className="mt-3 space-y-2">{buttons.map((button, index) => <div key={index} className="flex gap-2"><Input value={button.label} onChange={event => setButtons(current => current.map((item, position) => position === index ? { ...item, label: event.target.value } : item))} className="h-10 rounded-xl" placeholder="Текст кнопки" /><Input type="url" value={button.url} onChange={event => setButtons(current => current.map((item, position) => position === index ? { ...item, url: event.target.value } : item))} className="h-10 rounded-xl" placeholder="https://" /><button type="button" onClick={() => setButtons(current => current.filter((_, position) => position !== index))} className="rounded-xl px-2 text-muted-foreground hover:bg-[#F4F6F7]"><X className="h-4 w-4" /></button></div>)}</div></div><Button type="submit" disabled={createDraft.isPending || upload.isPending} className="mt-6 h-11 w-full rounded-xl bg-black font-bold text-white hover:bg-black/85">Сохранить черновик</Button></form><aside className="relative overflow-hidden rounded-[1.65rem] bg-[#111111] p-6 text-white sm:p-7"><div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#BFDDF1]" /><div className="relative"><div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-white/55"><Eye className="h-3.5 w-3.5" />ПРЕДПРОСМОТР В TELEGRAM</div><div className="mt-5 rounded-[1.35rem] bg-white p-4 text-[#141414] shadow-2xl"><div className="flex items-center gap-2 border-b border-black/5 pb-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E2F0FA] text-xs font-black">ДД</span><div><p className="text-xs font-extrabold">Добрые дела</p><p className="text-[10px] text-muted-foreground">бот</p></div></div>{image && <img src={image.preview} alt="Предпросмотр" className="mt-3 aspect-[16/8] w-full rounded-xl object-cover" />}<div className="mt-4 text-sm leading-6">{telegramMarkdownPreview(message || "Текст будущей рассылки появится здесь.")}</div>{buttons.filter(button => button.label).map((button, index) => <div key={index} className="mt-2 rounded-lg bg-[#E2F0FA] px-3 py-2 text-center text-xs font-bold text-[#2F5368]">{button.label}</div>)}</div><p className="mt-5 text-sm leading-6 text-white/65">Получатели: <b className="text-white">{recipientCount.data ?? 0}</b>. Отправка доступна только для сохранённого черновика.</p></div></aside></div><section className="rounded-[1.65rem] border border-black/[0.055] bg-card p-6 sm:p-7"><div className="flex items-center justify-between"><div><p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground">ЖУРНАЛ</p><h2 className="mt-2 text-xl font-extrabold tracking-[-0.04em]">Черновики и отправленные сообщения</h2></div><Badge variant="secondary" className="rounded-full px-3">{broadcasts?.length ?? 0}</Badge></div><div className="mt-6 grid gap-3 lg:grid-cols-2">{isLoading ? <p className="text-sm text-muted-foreground">Загрузка рассылок…</p> : broadcasts?.length ? broadcasts.map(broadcast => <article key={broadcast.id} className="rounded-2xl bg-[#F4F6F7] p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-extrabold tracking-[-0.03em]">{broadcast.title}</h3><p className="mt-1 text-xs text-muted-foreground">{broadcast.audience === "teams" ? "Выбранные команды" : "Все одобренные участники"}</p></div><Badge className={`border-0 ${broadcast.status === "sent" ? "bg-[#E8F3EE] text-[#356044] hover:bg-[#E8F3EE]" : "bg-[#F5EDE0] text-black hover:bg-[#F5EDE0]"}`}>{broadcast.status === "sent" ? "Отправлена" : "Черновик"}</Badge></div><div className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{telegramMarkdownPreview(broadcast.message)}</div>{broadcast.status === "draft" && <Button onClick={() => sendNow(broadcast.id, recipientCount.data)} disabled={send.isPending} className="mt-5 h-10 rounded-xl bg-black px-4 text-xs font-bold text-white hover:bg-black/85"><Send className="mr-2 h-3.5 w-3.5" />Отправить сейчас</Button>} {broadcast.sentAt && <p className="mt-4 text-xs text-muted-foreground">Отправлено: {new Date(broadcast.sentAt).toLocaleString("ru-RU")}</p>}</article>) : <div className="rounded-2xl border border-dashed border-black/10 px-5 py-14 text-center text-sm text-muted-foreground lg:col-span-2">Черновиков и отправленных рассылок пока нет.</div>}</div></section></div>;
}
