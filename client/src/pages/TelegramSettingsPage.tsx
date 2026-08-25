import { AdminAccessNotice } from "@/components/AdminAccessNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, MessageSquareMore, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

export default function TelegramSettingsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.admin.telegramSettings.get.useQuery(undefined, { enabled: user?.role === "admin" });
  const [registrationChat, setRegistrationChat] = useState("");
  const [reportChat, setReportChat] = useState("");
  const [webAppUrl, setWebAppUrl] = useState("");
  const [menuText, setMenuText] = useState("Статистика");
  useEffect(() => { if (settings) { setRegistrationChat(settings.registrationModerationChatId || ""); setReportChat(settings.reportModerationChatId || ""); setWebAppUrl(settings.webAppUrl || ""); setMenuText(settings.menuButtonText || "Статистика"); } }, [settings]);
  const save = trpc.admin.telegramSettings.update.useMutation({
    onSuccess: async () => { await utils.admin.telegramSettings.get.invalidate(); toast.success("Настройки Telegram сохранены и синхронизированы"); },
    onError: error => toast.error(error.message),
  });
  if (user?.role !== "admin") return <AdminAccessNotice />;
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); save.mutate({ registrationModerationChatId: registrationChat || null, reportModerationChatId: reportChat || null, webAppUrl: webAppUrl || null, menuButtonText: menuText }); }

  return <div className="mx-auto max-w-5xl space-y-7 px-1 py-4 sm:px-5 sm:py-7"><header><p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground">ПОДКЛЮЧЕНИЕ БОТА</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-0.055em]">Telegram</h1><p className="mt-3 text-sm text-muted-foreground">Задайте каналы модерации и публичный HTTPS-адрес приложения. После сохранения бот автоматически получит webhook и кнопку Mini App.</p></header><div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><form onSubmit={submit} className="rounded-[1.65rem] border border-black/[0.055] bg-card p-6 sm:p-7"><h2 className="text-xl font-extrabold tracking-[-0.04em]">Точки коммуникации</h2><label className="mt-6 block text-xs font-bold">ID канала заявок<Input value={registrationChat} onChange={event => setRegistrationChat(event.target.value)} className="mt-2 h-11 rounded-xl" placeholder="Например, -1001234567890" /></label><p className="mt-1.5 text-xs leading-5 text-muted-foreground">Сюда придут новые регистрации с кнопками «Принять» и «Отклонить».</p><label className="mt-5 block text-xs font-bold">ID канала отчётов<Input value={reportChat} onChange={event => setReportChat(event.target.value)} className="mt-2 h-11 rounded-xl" placeholder="Например, -1001234567891" /></label><p className="mt-1.5 text-xs leading-5 text-muted-foreground">Сюда отправляются шаги, фото, чеки и кнопки решения по отчёту.</p><label className="mt-5 block text-xs font-bold">Публичный URL Web App<Input type="url" value={webAppUrl} onChange={event => setWebAppUrl(event.target.value)} className="mt-2 h-11 rounded-xl" placeholder="https://your-app.example.com" /></label><label className="mt-5 block text-xs font-bold">Название кнопки меню<Input value={menuText} onChange={event => setMenuText(event.target.value)} required maxLength={64} className="mt-2 h-11 rounded-xl" /></label><Button type="submit" disabled={save.isPending || isLoading} className="mt-7 h-11 w-full rounded-xl bg-black font-bold text-white hover:bg-black/85">Сохранить и синхронизировать</Button></form><aside className="rounded-[1.65rem] bg-[#E2F0FA] p-6 sm:p-7"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/75"><MessageSquareMore className="h-5 w-5" /></div><h2 className="mt-5 text-xl font-extrabold tracking-[-0.04em]">Как получить ID канала</h2><p className="mt-3 text-sm leading-6 text-[#49636F]">Добавьте бота администратором в закрытый канал и перешлите любое сообщение из него в служебного бота, который показывает chat ID. Затем вставьте значение в это поле.</p><div className="mt-7 rounded-2xl bg-white/65 p-4"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p className="text-xs leading-5">Токен бота остаётся только на сервере. В интерфейсе он не показывается и не сохраняется.</p></div></div><div className="mt-3 rounded-2xl bg-white/65 p-4"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><p className="text-xs leading-5">Сохранение URL создаёт кнопку «{menuText || "Статистика"}» в Telegram и переключает доставку обновлений на этот адрес.</p></div></div></aside></div></div>;
}
