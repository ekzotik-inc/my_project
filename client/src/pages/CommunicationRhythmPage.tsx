import { Button } from "@/components/ui/button";
import { ClipboardCheck, Copy, MessageCircleHeart, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

const templates = [
  {
    title: "Старт недели",
    tag: "пн · запуск энергии",
    body: "*Новая неделя добрых дел началась*\n\nВыберите одно задание, которое хочется сделать уже сегодня. Не нужен идеальный план — достаточно первого шага.\n\n_Ваше участие делает сильнее всю команду._",
  },
  {
    title: "Тёплое напоминание",
    tag: "ср · без давления",
    body: "*Небольшое напоминание от «Добрых дел»*\n\nЕсли ваше задание ещё ждёт момента — он может начаться с маленького действия. Откройте активность в боте, посмотрите шаги и выберите комфортный темп.\n\n_Каждый подтверждённый вклад важен._",
  },
  {
    title: "Финиш периода",
    tag: "за 2–3 дня до конца",
    body: "*Период добрых дел подходит к завершению*\n\nПроверьте, все ли материалы по вашим заданиям отправлены на модерацию. Если отчёт уже на проверке — всё в порядке: P&C сообщит решение в боте.\n\nСпасибо, что делаете добро заметным.",
  },
] as const;

export default function CommunicationRhythmPage() {
  async function copy(text: string, label: string) {
    try { await navigator.clipboard.writeText(text); toast.success(`Шаблон «${label}» скопирован`); }
    catch { toast.error("Не удалось скопировать текст. Выделите его вручную."); }
  }

  return <div className="mx-auto max-w-6xl space-y-7 px-1 py-4 sm:px-5 sm:py-7"><header className="relative overflow-hidden rounded-[2rem] bg-[#163F2F] px-6 py-8 text-white sm:px-8"><div className="float-slow absolute -right-12 -top-14 h-48 w-48 rounded-full bg-[#C8E8A5]" /><div className="absolute -bottom-16 right-32 h-36 w-36 rotate-12 rounded-[2.3rem] bg-[#F4B6A8]" /><div className="relative max-w-2xl"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12"><MessageCircleHeart className="h-5 w-5" /></div><p className="mt-6 text-[11px] font-extrabold tracking-[0.16em] text-white/65">ТЕМП КОММУНИКАЦИЙ</p><h1 className="mt-2 text-4xl font-extrabold tracking-[-0.06em]">Когда бот поддерживает, а не отвлекает</h1><p className="mt-4 text-sm leading-6 text-white/75">Готовые сообщения и операционный ритм для Chief и P&amp;C. Сначала создайте черновик в «Рассылках», затем проверьте предпросмотр и только после этого отправляйте.</p></div></header>

    <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]"><article className="rounded-[1.65rem] bg-[#EAF2FA] p-6"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-[#396C89]"><ClipboardCheck className="h-5 w-5" /></div><h2 className="mt-5 text-2xl font-extrabold tracking-[-0.045em]">Ежедневный фокус P&amp;C</h2><p className="mt-3 text-sm leading-6 text-[#527487]">Не обязательно писать участникам каждый день. Важнее быстро завершать действия, которые уже ждут решения.</p><ol className="mt-5 space-y-3 text-sm"><li className="flex gap-3"><span className="font-extrabold text-[#396C89]">01</span><span>Проверить новые заявки и дать участнику ясный ответ.</span></li><li className="flex gap-3"><span className="font-extrabold text-[#396C89]">02</span><span>Разобрать отчёты на модерации: принять, отклонить с комментарием или вернуть на доработку.</span></li><li className="flex gap-3"><span className="font-extrabold text-[#396C89]">03</span><span>Посмотреть «Команду в действии» и заметить тех, кому может понадобиться поддержка.</span></li></ol></article>
      <article className="rounded-[1.65rem] border border-black/[0.055] bg-white p-6"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F3EE] text-[#2B7047]"><Sparkles className="h-5 w-5" /></div><h2 className="mt-5 text-2xl font-extrabold tracking-[-0.045em]">Здоровая частота</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Автоматические статусы по заданиям, заявкам и отчётам уже приходят сами. Для мотивационных рассылок ориентируйтесь на 2–3 сообщения в неделю: этого достаточно, чтобы поддержать темп и не превратить бот в шум.</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#F2F8EE] p-4"><p className="text-2xl font-extrabold text-[#2B7047]">Пн</p><p className="mt-2 text-xs leading-5 text-[#47715A]">мягкий запуск или новая активность</p></div><div className="rounded-2xl bg-[#FFF4DB] p-4"><p className="text-2xl font-extrabold text-[#956B1B]">Ср</p><p className="mt-2 text-xs leading-5 text-[#7C682D]">одно поддерживающее напоминание</p></div><div className="rounded-2xl bg-[#FCECE8] p-4"><p className="text-2xl font-extrabold text-[#A35243]">Финиш</p><p className="mt-2 text-xs leading-5 text-[#865B51]">проверка отчётов и благодарность</p></div></div></article></section>

    <section><div className="flex items-end justify-between gap-4"><div><p className="text-[11px] font-extrabold tracking-[0.14em] text-muted-foreground">ГОТОВЫЕ ТЕКСТЫ</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.055em]">От тёплого тона — к действию</h2></div><Send className="mb-1 h-5 w-5 text-[#3D8758]" /></div><div className="mt-5 grid gap-4 lg:grid-cols-3">{templates.map(template => <article key={template.title} className="flex min-h-80 flex-col rounded-[1.65rem] border border-black/[0.055] bg-white p-5 shadow-[0_12px_30px_-25px_rgba(22,63,47,0.27)]"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold tracking-[0.14em] text-[#55705E]">{template.tag}</p><h3 className="mt-1.5 text-xl font-extrabold tracking-[-0.04em]">{template.title}</h3></div><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF7EA] text-[#3D8758]"><MessageCircleHeart className="h-4 w-4" /></div></div><pre className="mt-5 flex-1 whitespace-pre-wrap rounded-2xl bg-[#F6F8F5] p-4 font-sans text-sm leading-6 text-[#355144]">{template.body}</pre><Button variant="outline" onClick={() => copy(template.body, template.title)} className="soft-press mt-4 h-10 rounded-xl border-[#C9DDCB] text-xs font-bold"><Copy className="mr-2 h-3.5 w-3.5" />Скопировать в рассылку</Button></article>)}</div></section>

    <aside className="rounded-[1.65rem] border border-dashed border-[#B8D3BD] bg-[#F4FAF2] p-5 text-sm leading-6 text-[#3B5C47]">Совет: не дублируйте автоматические уведомления вручную. Если P&amp;C уже приняла отчёт, бот сам сообщит результат, начисленные баллы и следующий шаг. Ручная рассылка нужна только для общего ритма, новых активностей или важных организационных новостей.</aside>
  </div>;
}
