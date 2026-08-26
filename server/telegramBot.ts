import type { Express, Request, Response } from "express";
import { storagePut } from "./storage";
import * as telegramDb from "./telegramDb";
import { createHash } from "node:crypto";

type TelegramUser = { id: number; username?: string; first_name?: string; last_name?: string };
type TelegramPhoto = { file_id: string; file_unique_id: string; file_size?: number; width: number; height: number };
type TelegramDocument = { file_id: string; file_name?: string; mime_type?: string; file_size?: number };
type TelegramContact = { phone_number: string; user_id?: number };
type TelegramMessage = {
  message_id: number;
  chat: { id: number; type: string };
  from?: TelegramUser;
  text?: string;
  contact?: TelegramContact;
  photo?: TelegramPhoto[];
  document?: TelegramDocument;
};
type TelegramCallback = { id: string; from: TelegramUser; message?: TelegramMessage; data?: string };
export type TelegramUpdate = { update_id: number; message?: TelegramMessage; callback_query?: TelegramCallback };

type ButtonStyle = "primary" | "success" | "danger";
type InlineButton = { text: string; callback_data?: string; web_app?: { url: string }; url?: string; icon_custom_emoji_id?: string; style?: ButtonStyle };
type ReplyButton = { text: string; request_contact?: boolean };
type ReplyMarkup = { inline_keyboard?: InlineButton[][]; keyboard?: ReplyButton[][]; resize_keyboard?: boolean; one_time_keyboard?: boolean; remove_keyboard?: boolean };
type TelegramParseMode = "Markdown" | "HTML";

export const PREMIUM_EMOJI = {
  route: { id: "6030687898141987254", fallback: "🧭" },
  action: { id: "6032949275732742941", fallback: "🎯" },
  score: { id: "6028338546736107668", fallback: "⭐️" },
  review: { id: "6039486778597970865", fallback: "🔔" },
  approved: { id: "5774022692642492953", fallback: "✅" },
  submit: { id: "6039573425268201570", fallback: "📤" },
  photo: { id: "5766975922620076409", fallback: "📷" },
  note: { id: "5920046907782074235", fallback: "📝" },
  team: { id: "5879905000972358125", fallback: "👥" },
  applause: { id: "5994417835630137549", fallback: "👏" },
  sparkle: { id: "5778226250149532337", fallback: "✨" },
  hint: { id: "5767288287001580715", fallback: "💡" },
} as const;

type PremiumEmojiKey = keyof typeof PREMIUM_EMOJI;

export function premiumEmoji(key: PremiumEmojiKey) {
  const emoji = PREMIUM_EMOJI[key];
  return `<tg-emoji emoji-id="${emoji.id}">${emoji.fallback}</tg-emoji>`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function stripPremiumEmoji(text: string) {
  return text.replace(/<tg-emoji emoji-id="[0-9]+">(.*?)<\/tg-emoji>/g, "$1");
}

function hasPremiumEmoji(replyMarkup?: ReplyMarkup) {
  return Boolean(replyMarkup?.inline_keyboard?.some(row => row.some(button => button.icon_custom_emoji_id || button.style)));
}

function withoutPremiumButtonDecoration(replyMarkup?: ReplyMarkup): ReplyMarkup | undefined {
  if (!replyMarkup?.inline_keyboard) return replyMarkup;
  return {
    ...replyMarkup,
    inline_keyboard: replyMarkup.inline_keyboard.map(row => row.map(({ icon_custom_emoji_id: _icon, style: _style, ...button }) => button)),
  };
}

function parseModeForRich(text: string): TelegramParseMode {
  return text.includes("<tg-emoji") ? "HTML" : "Markdown";
}

function premiumButton(input: { text: string; callbackData?: string; webAppUrl?: string; icon: PremiumEmojiKey; style?: ButtonStyle }): InlineButton {
  return {
    text: input.text,
    ...(input.callbackData ? { callback_data: input.callbackData } : {}),
    ...(input.webAppUrl ? { web_app: { url: input.webAppUrl } } : {}),
    icon_custom_emoji_id: PREMIUM_EMOJI[input.icon].id,
    ...(input.style ? { style: input.style } : {}),
  };
}

function token() {
  const value = process.env.TELEGRAM_BOT_TOKEN;
  if (!value) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return value;
}

export function getTelegramWebhookSecret(botToken: string, configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET) {
  if (configuredSecret) {
    if (!/^[A-Za-z0-9_-]{1,256}$/.test(configuredSecret)) {
      throw new Error("TELEGRAM_WEBHOOK_SECRET may contain only letters, numbers, underscores, and hyphens");
    }
    return configuredSecret;
  }

  return createHash("sha256").update(botToken).digest("hex");
}

async function telegramApi<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as { ok: boolean; result?: T; description?: string };
  if (!response.ok || !body.ok) throw new Error(body.description || `Telegram ${method} failed`);
  return body.result as T;
}

async function sendMessage(chatId: string | number, text: string, replyMarkup?: ReplyMarkup, parseMode?: TelegramParseMode) {
  const selectedParseMode = parseMode;
  const payload = {
    chat_id: String(chatId),
    text,
    reply_markup: replyMarkup,
    ...(selectedParseMode ? { parse_mode: selectedParseMode } : {}),
    disable_web_page_preview: true,
  };
  try {
    return await telegramApi<{ message_id: number }>("sendMessage", payload);
  } catch (error) {
    if (!text.includes("<tg-emoji") && !hasPremiumEmoji(replyMarkup)) throw error;
    return telegramApi<{ message_id: number }>("sendMessage", {
      ...payload,
      text: stripPremiumEmoji(text),
      reply_markup: withoutPremiumButtonDecoration(replyMarkup),
    });
  }
}

async function sendRichMessage(chatId: string | number, text: string, replyMarkup?: ReplyMarkup) {
  return sendMessage(chatId, text, replyMarkup, parseModeForRich(text));
}

function escapeMarkdown(value: string) {
  return value.replace(/([_*`\[])/g, "\\$1");
}

async function answerCallback(callbackId: string, text?: string) {
  return telegramApi<boolean>("answerCallbackQuery", { callback_query_id: callbackId, text });
}

async function sendDocument(chatId: string | number, document: string, caption?: string) {
  return telegramApi<{ message_id: number }>("sendDocument", { chat_id: String(chatId), document, caption });
}

async function sendPhoto(chatId: string | number, photo: string, caption?: string, replyMarkup?: ReplyMarkup, parseMode?: TelegramParseMode) {
  const selectedParseMode = parseMode || (caption?.includes("<tg-emoji") ? "HTML" : undefined);
  const payload = {
    chat_id: String(chatId),
    photo,
    caption,
    reply_markup: replyMarkup,
    ...(selectedParseMode ? { parse_mode: selectedParseMode } : {}),
  };
  try {
    return await telegramApi<{ message_id: number }>("sendPhoto", payload);
  } catch (error) {
    if (!caption?.includes("<tg-emoji") && !hasPremiumEmoji(replyMarkup)) throw error;
    return telegramApi<{ message_id: number }>("sendPhoto", {
      ...payload,
      ...(caption ? { caption: stripPremiumEmoji(caption) } : {}),
      reply_markup: withoutPremiumButtonDecoration(replyMarkup),
    });
  }
}

export async function sendBroadcastMessage(input: { chatId: string; message: string; imageUrl: string | null; buttons: { label: string; url: string }[] }) {
  const replyMarkup: ReplyMarkup | undefined = input.buttons.length ? { inline_keyboard: input.buttons.map(button => [{ text: button.label, url: button.url }]) } : undefined;
  if (input.imageUrl) {
    return telegramApi<{ message_id: number }>("sendPhoto", { chat_id: input.chatId, photo: input.imageUrl, caption: input.message, parse_mode: "Markdown", reply_markup: replyMarkup });
  }
  return telegramApi<{ message_id: number }>("sendMessage", { chat_id: input.chatId, text: input.message, parse_mode: "Markdown", reply_markup: replyMarkup, disable_web_page_preview: true });
}

function formatStatus(status: string) {
  return ({ assigned: "доступно", in_progress: "в процессе", submitted: "отправлено", under_review: "на проверке", approved: "подтверждено", rejected: "нужна доработка", expired: "завершено" } as Record<string, string>)[status] || status;
}

function statusMark(status: string) {
  return ({ assigned: "○", in_progress: "◐", submitted: "◐", under_review: "◌", rejected: "↻", approved: "●", expired: "–" } as Record<string, string>)[status] || "○";
}

export function formatParticipantDashboard(dashboard: Awaited<ReturnType<typeof telegramDb.getParticipantActivityDashboard>>) {
  if (!dashboard.period) return `<b>${premiumEmoji("sparkle")} Добрые дела</b>\n\n<b>Сейчас — спокойная пауза</b>\nКоманда P&amp;C готовит следующий период. Когда появится первое дело, я напишу вам здесь.\n\n<i>Пока просто оставайтесь на связи.</i>`;
  const completed = dashboard.assignments.filter(item => item.status === "approved").length;
  const reviewing = dashboard.assignments.filter(item => item.status === "under_review").length;
  const available = dashboard.assignments.filter(item => item.status === "assigned" || item.status === "in_progress" || item.status === "rejected").length;
  const completion = dashboard.assignments.length ? Math.round((completed / dashboard.assignments.length) * 100) : 0;
  const headline = available > 0
    ? "Есть дело, которое ждёт вашего шага"
    : reviewing > 0
      ? "Ваш результат уже у P&C"
      : completed > 0
        ? "Все дела этого периода завершены"
        : "Первое дело появится совсем скоро";
  const detail = available > 0
    ? `Сейчас доступно: *${available}*. Выберите то, которое легко вписать в ваш день.`
    : reviewing > 0
      ? "Материалы проверяются. Я напишу, как только P&C примет решение."
      : completed > 0
        ? "Спасибо за вклад. Он уже стал частью общего результата команды."
        : "Как только P&C откроет задание, оно появится здесь.";
  const statusIcon = available > 0 ? premiumEmoji("action") : reviewing > 0 ? premiumEmoji("review") : completed > 0 ? premiumEmoji("approved") : premiumEmoji("sparkle");
  return `<b>${premiumEmoji("route")} ${escapeHtml(dashboard.period.title)}</b>\n\n<b>${statusIcon} ${headline}</b>\n${detail}\n\nПрогресс периода: <b>${completed} из ${dashboard.assignments.length}</b> · ${completion}%\nВаш результат: <b>${premiumEmoji("score")} ${dashboard.points} баллов</b>`;
}

export function formatReturningParticipantGreeting(input: { fullName?: string | null; dashboard: Awaited<ReturnType<typeof telegramDb.getParticipantActivityDashboard>> }) {
  const firstName = input.fullName?.trim().split(/\s+/)[0];
  const greeting = firstName ? `, ${escapeHtml(firstName)}` : "";
  const reviewing = input.dashboard.assignments.filter(item => item.status === "under_review").length;
  const available = input.dashboard.assignments.filter(item => item.status === "assigned" || item.status === "in_progress" || item.status === "rejected").length;
  const status = reviewing > 0
    ? "Ваш последний результат уже у P&C. Откройте маршрут, чтобы посмотреть статус."
    : available > 0
      ? "В маршруте есть доступное дело. Откройте его, когда будете готовы."
      : "Откройте маршрут, чтобы увидеть актуальный статус периода.";
  return `<b>${premiumEmoji("route")} С возвращением${greeting}</b>\n\n${status}`;
}

export function formatNewActivityNotification(input: { periodTitle: string; title: string; description: string; points: number }) {
  return `<b>${premiumEmoji("sparkle")} Добрые дела</b> · <i>${escapeHtml(input.periodTitle)}</i>\n\n<b>${premiumEmoji("action")} Новое дело для всей команды</b>\n\n<b>${escapeHtml(input.title)}</b>\n${escapeHtml(input.description)}\n\nПосле подтверждения P&amp;C ваш вклад принесёт <b>${premiumEmoji("score")} +${input.points} баллов</b>.\n\n<i>Откройте задание, когда будет удобно: все шаги и материалы уже внутри.</i>`;
}

export function getActivityNotificationPresentation(input: { periodTitle: string; title: string; description: string; points: number; coverImageUrl?: string | null }) {
  return { text: formatNewActivityNotification(input), photo: input.coverImageUrl?.trim() || null };
}

export function formatNewPeriodNotification(input: { title: string; description?: string }) {
  const description = input.description?.trim() ? `\n${escapeHtml(input.description.trim())}` : "";
  return `<b>${premiumEmoji("sparkle")} Добрые дела</b>\n\n<b>Открыт новый период</b>\n\n<b>${escapeHtml(input.title)}</b>${description}\n\n${premiumEmoji("team")} В этом периоде у всех участников будет одинаковый маршрут. Первое задание появится здесь с понятными шагами и условиями проверки.`;
}

export function formatReportApprovalNotification(input: { title: string; points: number }) {
  return `<b>${premiumEmoji("applause")} Ваш вклад подтверждён</b>\n\nP&amp;C приняла результат по заданию <b>${escapeHtml(input.title)}</b>.\n\nНа ваш счёт добавлено <b>${premiumEmoji("score")} +${input.points} баллов</b>. Спасибо, что сделали это дело реальным — оно уже усилило результат команды.\n\n<i>В меню можно посмотреть, какой следующий шаг появился в вашем маршруте.</i>`;
}

export async function notifyReportModerationDecision(input: {
  participantChatId: string;
  activityTitle: string;
  decision: "approved" | "rejected";
  awardedPoints: number;
  comment?: string | null;
}) {
  if (input.decision === "approved") {
    return sendRichMessage(input.participantChatId, formatReportApprovalNotification({ title: input.activityTitle, points: input.awardedPoints }));
  }

  const comment = input.comment?.trim() || "Пожалуйста, дополните результат и отправьте его повторно.";
  return sendRichMessage(input.participantChatId, `<b>${premiumEmoji("note")} P&amp;C просит немного доработать результат</b>\n\n<b>${escapeHtml(input.activityTitle)}</b>\n\n${escapeHtml(comment)}\n\n<i>Откройте задание в меню, дополните материалы и отправьте результат повторно. Всё остальное уже сохранено.</i>`);
}

async function notifyApprovedParticipants(text: string, replyMarkup?: ReplyMarkup) {
  const recipients = await telegramDb.listApprovedParticipantChats();
  const delivery = await Promise.allSettled(recipients.map(recipient => sendRichMessage(recipient.telegramChatId, text, replyMarkup)));
  return delivery.filter(result => result.status === "fulfilled").length;
}

export async function notifyNewActivity(input: { periodTitle: string; title: string; description: string; points: number; coverImageUrl?: string | null }) {
  const recipients = await telegramDb.listApprovedParticipantChats();
  const presentation = getActivityNotificationPresentation(input);
  const replyMarkup: ReplyMarkup = { inline_keyboard: [[premiumButton({ text: "Открыть задание", callbackData: "menu:refresh", icon: "action", style: "primary" })]] };
  const delivery = await Promise.allSettled(recipients.map(recipient => presentation.photo
    ? sendPhoto(recipient.telegramChatId, presentation.photo, presentation.text, replyMarkup, "HTML")
    : sendRichMessage(recipient.telegramChatId, presentation.text, replyMarkup)
  ));
  return delivery.filter(result => result.status === "fulfilled").length;
}

export async function notifyNewPeriod(input: { title: string; description?: string }) {
  return notifyApprovedParticipants(formatNewPeriodNotification(input), { inline_keyboard: [[premiumButton({ text: "Открыть маршрут", callbackData: "menu:refresh", icon: "route", style: "primary" })]] });
}

async function sendParticipantMenu(telegramUserId: string, chatId: string) {
  const participant = await telegramDb.getParticipantByTelegramId(telegramUserId);
  if (!participant) return sendMessage(chatId, "Сначала пройдите регистрацию командой /start.");
  if (participant.status === "pending") return sendMessage(chatId, "Ваша заявка на модерации. Мы сообщим, когда доступ будет открыт.");
  if (participant.status === "rejected") return sendMessage(chatId, "Заявка отклонена. Запустите /start, чтобы отправить обновлённые данные.");
  const dashboard = await telegramDb.getParticipantActivityDashboard(participant.id);
  const settings = await telegramDb.getTelegramSettings();
  const taskButtons: InlineButton[][] = dashboard.assignments
    .filter(item => item.status !== "approved" && item.status !== "under_review")
    .map(item => [premiumButton({ text: `${statusMark(item.status)} ${item.title} · ${formatStatus(item.status)}`, callbackData: `task:${item.id}`, icon: "action" })]);
  const actionButtons: InlineButton[][] = [[premiumButton({ text: "Проверить статус", callbackData: "menu:refresh", icon: "review" })]];
  if (settings?.webAppUrl) actionButtons.unshift([premiumButton({ text: settings.menuButtonText || "Посмотреть вклад", webAppUrl: settings.webAppUrl, icon: "score", style: "primary" })]);
  return sendRichMessage(chatId, formatParticipantDashboard(dashboard), { inline_keyboard: [...taskButtons, ...actionButtons] });
}

async function sendReturningParticipantGreeting(telegramUserId: string, chatId: string) {
  const participant = await telegramDb.getParticipantByTelegramId(telegramUserId);
  if (!participant || participant.status !== "approved") return sendParticipantMenu(telegramUserId, chatId);
  const dashboard = await telegramDb.getParticipantActivityDashboard(participant.id);
  return sendRichMessage(chatId, formatReturningParticipantGreeting({ fullName: participant.fullName, dashboard }), {
    inline_keyboard: [[premiumButton({ text: "Открыть мой маршрут", callbackData: "menu:refresh", icon: "route", style: "primary" })]],
  });
}

export function formatParticipantHelp() {
  return "*Добрые дела*\n────────────\n\n*Как работает ваш маршрут*\n\n• В /menu выберите дело, которое готовы сделать сейчас\n• Пройдите шаги и приложите результат\n• P&C посмотрит материалы и напишет решение\n• После подтверждения баллы и статистика обновятся сами\n\n_В каждом периоде у всех участников одинаковый набор заданий. Если нужен ориентир, обратитесь к команде P&C._";
}

export function formatWelcomeMessage(firstName?: string) {
  const greeting = firstName?.trim() ? `, ${escapeHtml(firstName.trim())}` : "";
  return `<b>${premiumEmoji("sparkle")} Добрые дела</b>\n\n<b>Рады видеть вас${greeting}</b>\n\nЗдесь простые действия команды превращаются в заметный общий вклад. Вы сможете выбрать доброе дело, пройти его в своём темпе и увидеть, как результат растёт вместе с командой.\n\n<i>${premiumEmoji("hint")} Сначала коротко расскажу, как устроен маршрут.</i>`;
}

export function formatWelcomeGuide() {
  return `<b>${premiumEmoji("route")} Ваш маршрут в трёх шагах</b>\n\n<b>1.</b> Оставьте короткий профиль — P&amp;C подтвердит участие.\n<b>2.</b> Выбирайте задания, которые доступны всем в текущем периоде.\n<b>3.</b> Отправляйте результат: баллы появляются только после решения P&amp;C.\n\n<i>${premiumEmoji("hint")} Никакой гонки. Важен настоящий вклад и комфортный для вас темп.</i>`;
}

async function sendWelcome(chatId: string, firstName?: string) {
  return sendRichMessage(chatId, formatWelcomeMessage(firstName), {
    inline_keyboard: [
      [premiumButton({ text: "Как это работает", callbackData: "welcome:guide", icon: "hint" })],
      [premiumButton({ text: "Присоединиться к команде", callbackData: "welcome:register", icon: "team", style: "primary" })],
    ],
  });
}

async function beginRegistration(telegramUserId: string, chatId: string) {
  const existing = await telegramDb.getParticipantByTelegramId(telegramUserId);
  if (existing?.status === "approved") return sendParticipantMenu(telegramUserId, chatId);
  if (existing?.status === "pending") return sendRichMessage(chatId, `<b>${premiumEmoji("review")} Заявка уже у P&amp;C</b>\n\nДанные проверяются. Ничего дополнительно делать не нужно: я напишу сразу, когда откроется доступ к вашему маршруту.`);
  await telegramDb.upsertTelegramConversation({ telegramUserId, telegramChatId: chatId, state: "registration_phone" });
  return sendRichMessage(chatId, `<b>${premiumEmoji("team")} Начнём с контакта</b>\n\nЭто первый из трёх коротких шагов. Номер нужен только для заявки P&amp;C и остаётся внутри команды.\n\n<b>1 из 3</b> · поделитесь номером телефона`, {
    keyboard: [[{ text: "Поделиться номером", request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  });
}

async function startRegistration(message: TelegramMessage) {
  if (!message.from) return;
  const userId = String(message.from.id);
  const existing = await telegramDb.getParticipantByTelegramId(userId);
  if (existing?.status === "approved") return sendReturningParticipantGreeting(userId, String(message.chat.id));
  if (existing?.status === "pending") return beginRegistration(userId, String(message.chat.id));
  return sendWelcome(String(message.chat.id), message.from.first_name);
}

async function sendTeamChoice(telegramUserId: string, chatId: string, phone: string) {
  const teams = await telegramDb.listActiveTeamsForTelegram();
  if (teams.length === 0) return sendRichMessage(chatId, "*Добрые дела*\n────────────\n\n*Регистрация почти готова*\n\nP&C сейчас добавляет команды. Ваш контакт уже сохранён — вернитесь сюда чуть позже, чтобы выбрать команду.");
  await telegramDb.upsertTelegramConversation({ telegramUserId, telegramChatId: chatId, state: "registration_name", draftPhone: phone });
  return sendRichMessage(chatId, "*Контакт сохранён*\n\n*2 из 3* · напишите имя и фамилию одним сообщением. Так коллеги смогут узнать ваш вклад в общей истории добрых дел.", { remove_keyboard: true });
}

async function promptForReportStep(telegramUserId: string, chatId: string, assignmentId: number, stepOrder: number) {
  const participant = await telegramDb.getParticipantByTelegramId(telegramUserId);
  if (!participant) throw new Error("Participant was not found");
  const assignment = await telegramDb.getAssignmentForParticipant(assignmentId, participant.id);
  if (!assignment) throw new Error("Assignment was not found");
  const step = assignment.steps.find(item => item.stepOrder === stepOrder);
  if (!step) {
    await telegramDb.clearTelegramConversation(telegramUserId);
    return sendRichMessage(chatId, `<b>${premiumEmoji("submit")} Материалы собраны</b>\n\nВы прошли все шаги. Посмотрите на результат ещё раз и отправьте его P&amp;C, когда будете готовы.\n\n<i>Баллы появляются только после явного подтверждения результата.</i>`, { inline_keyboard: [[premiumButton({ text: "Отправить P&C", callbackData: `report:submit:${assignmentId}`, icon: "submit", style: "primary" })]] });
  }
  await telegramDb.upsertTelegramConversation({ telegramUserId, telegramChatId: chatId, state: "report_step", assignmentId, stepOrder });
  const inputHint = step.inputType === "text" ? "Отправьте текстовый ответ." : step.inputType === "photo" ? "Отправьте фотографию." : step.inputType === "file" ? "Отправьте файл или фото документа." : "Отправьте текст, фото или файл.";
  return sendRichMessage(chatId, `*Задание в пути* · _шаг ${step.stepOrder} из ${assignment.steps.length}_\n────────────\n\n${escapeMarkdown(step.instruction)}\n\n_${inputHint}_`);
}

async function downloadTelegramFile(fileId: string) {
  const file = await telegramApi<{ file_path: string }>("getFile", { file_id: fileId });
  const response = await fetch(`https://api.telegram.org/file/bot${token()}/${file.file_path}`);
  if (!response.ok) throw new Error("Telegram file download failed");
  return { bytes: Buffer.from(await response.arrayBuffer()), filePath: file.file_path, contentType: response.headers.get("content-type") || "application/octet-stream" };
}

async function storeTelegramAttachment(input: { telegramUserId: string; assignmentId: number; stepId: number; fileId: string; kind: "photo" | "receipt" | "file"; name?: string; mimeType?: string }) {
  const file = await downloadTelegramFile(input.fileId);
  const extension = input.name?.includes(".") ? input.name.slice(input.name.lastIndexOf(".")) : file.filePath.includes(".") ? file.filePath.slice(file.filePath.lastIndexOf(".")) : "";
  const stored = await storagePut(`reports/${input.assignmentId}/${input.telegramUserId}/${crypto.randomUUID()}${extension}`, file.bytes, input.mimeType || file.contentType);
  return { ...stored, originalName: input.name || file.filePath.split("/").pop() || "attachment" };
}

async function sendRegistrationModerationRequest(participantId: number) {
  const settings = await telegramDb.getTelegramSettings();
  const participant = await telegramDb.getParticipantById(participantId);
  if (!settings?.registrationModerationChatId || !participant) return;
  await sendRichMessage(settings.registrationModerationChatId, `*Новая заявка*\n────────────\n\n*${escapeMarkdown(participant.fullName || "Без имени")}*\nКоманда: ${participant.teamId || "не выбрана"}\nТелефон: ${escapeMarkdown(participant.phone || "не указан")}\nTelegram: ${participant.telegramUsername ? `@${escapeMarkdown(participant.telegramUsername)}` : participant.telegramUserId}\n\n_Проверьте данные и выберите решение._`, {
    inline_keyboard: [[{ text: "Принять в команду", callback_data: `reg:approve:${participant.id}` }, { text: "Нужно уточнение", callback_data: `reg:reject:${participant.id}` }]],
  });
}

async function notifyModerators(text: string, excludeTelegramUserId?: string) {
  const moderators = await telegramDb.listTelegramModerators();
  await Promise.allSettled(
    moderators
      .filter(moderator => moderator.telegramUserId !== excludeTelegramUserId)
      .map(moderator => sendRichMessage(moderator.telegramChatId, text))
  );
}

export async function notifyRegistrationDecision(input: {
  participant: { telegramChatId: string; fullName: string | null };
  status: "approved" | "rejected";
  reason?: string;
  moderatorTelegramUserId?: string;
}) {
  if (input.status === "approved") {
    await sendRichMessage(input.participant.telegramChatId, `<b>${premiumEmoji("team")} Вы в команде</b>\n\nP&amp;C подтвердила заявку. Теперь вам доступен личный маршрут, задания и общая статистика команды.\n\n<i>${premiumEmoji("hint")} Откройте меню — там уже видно, с чего начать.</i>`);
    await notifyModerators(`${premiumEmoji("approved")} <b>Заявка ${escapeHtml(input.participant.fullName || "участника")} одобрена.</b>`, input.moderatorTelegramUserId);
    return;
  }
  const reason = input.reason?.trim() || "Пожалуйста, уточните данные и отправьте заявку снова.";
  await sendRichMessage(input.participant.telegramChatId, `<b>${premiumEmoji("note")} Нужно немного уточнить заявку</b>\n\n${escapeHtml(reason)}\n\n<i>Отправьте /start, обновите данные и вернитесь в маршрут. После уточнения вы сможете участвовать как обычно.</i>`);
  await notifyModerators(`${premiumEmoji("note")} <b>Заявка ${escapeHtml(input.participant.fullName || "участника")} возвращена на уточнение.</b>`, input.moderatorTelegramUserId);
}

async function sendReportToModeration(assignmentId: number) {
  const settings = await telegramDb.getTelegramSettings();
  if (!settings?.reportModerationChatId) return;
  const report = await telegramDb.getReportForModeration(assignmentId);
  if (!report) return;
  await sendRichMessage(settings.reportModerationChatId, `<b>${premiumEmoji("review")} Новый результат для P&amp;C</b>\n\n<b>${escapeHtml(report.activityTitle)}</b>\n${escapeHtml(report.participantName || "Без имени")} · ${escapeHtml(report.participantTeam || "команда не выбрана")}\n\nПосле подтверждения участник получит <b>${premiumEmoji("score")} +${report.activityPoints} баллов</b>.\n\n<i>Материалы и шаги — ниже. Выберите решение, когда всё проверите.</i>`);
  const evidence = await telegramDb.getReportEvidence(assignmentId);
  for (const item of evidence) {
    const caption = `Шаг ${item.stepOrder}: ${item.instruction}${item.textResponse ? `\nОтвет: ${item.textResponse}` : ""}`;
    if (item.telegramFileId) {
      if (item.attachmentKind === "photo") await sendPhoto(settings.reportModerationChatId, item.telegramFileId, caption);
      else await sendDocument(settings.reportModerationChatId, item.telegramFileId, caption);
    } else if (item.textResponse) await sendRichMessage(settings.reportModerationChatId, `<b>${premiumEmoji("note")} Шаг ${item.stepOrder}</b>\n${escapeHtml(caption)}`);
  }
  await sendRichMessage(settings.reportModerationChatId, `<b>${premiumEmoji("approved")} Решение P&amp;C</b>\n\nПодтверждение начислит баллы. Если нужны правки, участник получит ваш комментарий и сможет обновить материалы.`, { inline_keyboard: [[premiumButton({ text: "Подтвердить результат", callbackData: `report:approve:${assignmentId}`, icon: "approved", style: "success" }), premiumButton({ text: "Попросить доработать", callbackData: `report:reject:${assignmentId}`, icon: "note" })]] });
  await notifyModerators(`${premiumEmoji("review")} <b>Новый отчёт ожидает проверки:</b> ${escapeHtml(report.activityTitle)} от ${escapeHtml(report.participantName || "участника")}.`);
}

async function handleRegistrationConversation(message: TelegramMessage, conversation: NonNullable<Awaited<ReturnType<typeof telegramDb.getTelegramConversation>>>) {
  if (!message.from) return;
  const userId = String(message.from.id);
  const chatId = String(message.chat.id);
  if (conversation.state === "registration_phone" && message.contact?.phone_number) return sendTeamChoice(userId, chatId, message.contact.phone_number);
  if (conversation.state === "registration_phone") return sendMessage(chatId, "Используйте кнопку «Поделиться номером» ниже.");
  if (conversation.state === "registration_name" && message.text?.trim()) {
    await telegramDb.upsertTelegramConversation({ telegramUserId: userId, telegramChatId: chatId, state: "registration_team", draftPhone: conversation.draftPhone, draftFullName: message.text.trim() });
    const teams = await telegramDb.listActiveTeamsForTelegram();
    return sendRichMessage(chatId, "*Имя сохранено*\n\n*3 из 3* · выберите свою команду. Затем заявка уйдёт на короткую проверку P&C.", { inline_keyboard: teams.map(team => [{ text: team.name, callback_data: `reg:team:${team.id}` }]) });
  }
}

async function handleReportStep(message: TelegramMessage, conversation: NonNullable<Awaited<ReturnType<typeof telegramDb.getTelegramConversation>>>) {
  if (!message.from || !conversation.assignmentId || !conversation.stepOrder) return;
  const userId = String(message.from.id);
  const participant = await telegramDb.getParticipantByTelegramId(userId);
  if (!participant) return;
  const assignment = await telegramDb.getAssignmentForParticipant(conversation.assignmentId, participant.id);
  const step = assignment?.steps.find(item => item.stepOrder === conversation.stepOrder);
  if (!assignment || !step) return;
  if (message.text?.trim() && step.inputType !== "photo" && step.inputType !== "file") {
    await telegramDb.saveReportTextStep({ assignmentId: assignment.id, participantId: participant.id, stepId: step.id, text: message.text.trim() });
    await sendRichMessage(message.chat.id, `<b>${premiumEmoji("approved")} Шаг ${step.stepOrder} сохранён</b>\n<i>Переходим дальше.</i>`);
    return promptForReportStep(userId, String(message.chat.id), assignment.id, step.stepOrder + 1);
  }
  const photo = message.photo?.at(-1);
  const document = message.document;
  if (!photo && !document) return sendMessage(message.chat.id, "Этот шаг ожидает материал указанного типа. Попробуйте ещё раз.");
  const isReceipt = /чек|receipt/i.test(step.instruction);
  const stored = await storeTelegramAttachment({ telegramUserId: userId, assignmentId: assignment.id, stepId: step.id, fileId: photo?.file_id || document!.file_id, kind: photo ? "photo" : isReceipt ? "receipt" : "file", name: document?.file_name, mimeType: document?.mime_type });
  await telegramDb.saveReportAttachment({ assignmentId: assignment.id, participantId: participant.id, stepId: step.id, kind: photo ? "photo" : isReceipt ? "receipt" : "file", storageKey: stored.key, url: stored.url, telegramFileId: photo?.file_id || document!.file_id, originalName: stored.originalName, mimeType: document?.mime_type || "image/jpeg" });
  await sendRichMessage(message.chat.id, `<b>${premiumEmoji("photo")} Шаг ${step.stepOrder} сохранён</b>\n<i>Переходим дальше.</i>`);
  return promptForReportStep(userId, String(message.chat.id), assignment.id, step.stepOrder + 1);
}

async function handleModeratorText(message: TelegramMessage, conversation: NonNullable<Awaited<ReturnType<typeof telegramDb.getTelegramConversation>>>) {
  if (!message.from || !message.text?.trim() || !conversation.assignmentId) return;
  const moderatorId = String(message.from.id);
  if (!(await telegramDb.isTelegramModerator(moderatorId))) return;
  if (conversation.state === "moderation_reject_report") {
    const result = await telegramDb.moderateReport({ assignmentId: conversation.assignmentId, moderatorTelegramId: moderatorId, decision: "rejected", comment: message.text.trim() });
    await telegramDb.clearTelegramConversation(moderatorId);
    await sendRichMessage(result.report.participantChatId, `<b>${premiumEmoji("note")} P&amp;C просит немного доработать результат</b>\n\n<b>${escapeHtml(result.report.activityTitle)}</b>\n\n${escapeHtml(message.text.trim())}\n\n<i>Откройте задание в меню, дополните материалы и отправьте результат повторно. Всё остальное уже сохранено.</i>`);
    await notifyModerators(`${premiumEmoji("note")} <b>Отчёт ${escapeHtml(result.report.activityTitle)} возвращён на доработку.</b>`, moderatorId);
    return sendRichMessage(message.chat.id, "*Комментарий отправлен*\nУчастник может дополнить материалы и вернуться с обновлённым результатом.");
  }
  if (conversation.state === "moderation_reject_registration") {
    const participant = await telegramDb.moderateParticipantFromAdmin({ participantId: conversation.assignmentId, status: "rejected", role: "participant", rejectionReason: message.text.trim() });
    await telegramDb.clearTelegramConversation(moderatorId);
    await notifyRegistrationDecision({ participant, status: "rejected", reason: message.text.trim(), moderatorTelegramUserId: moderatorId });
    return sendMessage(message.chat.id, "Заявка отклонена, комментарий отправлен.");
  }
}

async function handleMessage(message: TelegramMessage) {
  if (!message.from) return;
  const userId = String(message.from.id);
  if (message.text?.trim().startsWith("/start")) return startRegistration(message);
  if (message.text?.trim() === "/menu") return sendParticipantMenu(userId, String(message.chat.id));
  if (message.text?.trim() === "/help") return sendRichMessage(message.chat.id, formatParticipantHelp());
  const conversation = await telegramDb.getTelegramConversation(userId);
  if (!conversation) return;
  if (conversation.state.startsWith("registration_")) return handleRegistrationConversation(message, conversation);
  if (conversation.state === "report_step") return handleReportStep(message, conversation);
  if (conversation.state.startsWith("moderation_")) return handleModeratorText(message, conversation);
}

async function handleCallback(callback: TelegramCallback) {
  const data = callback.data || "";
  const chatId = callback.message ? String(callback.message.chat.id) : String(callback.from.id);
  const userId = String(callback.from.id);
  try {
    if (data === "menu:refresh") return sendParticipantMenu(userId, chatId);
    if (data === "welcome:guide") return sendRichMessage(chatId, formatWelcomeGuide(), { inline_keyboard: [[premiumButton({ text: "Присоединиться к команде", callbackData: "welcome:register", icon: "team", style: "primary" })]] });
    if (data === "welcome:register") return beginRegistration(userId, chatId);
    if (data.startsWith("reg:team:")) {
      const conversation = await telegramDb.getTelegramConversation(userId);
      if (!conversation?.draftPhone || !conversation.draftFullName) throw new Error("Registration session expired");
      const teamId = Number(data.split(":")[2]);
      const registration = await telegramDb.completeTelegramRegistration({ telegramUserId: userId, telegramChatId: chatId, telegramUsername: callback.from.username ?? null, phone: conversation.draftPhone, fullName: conversation.draftFullName, teamId });
      await telegramDb.clearTelegramConversation(userId);
      if (registration.alreadyApproved) return sendParticipantMenu(userId, chatId);
      await sendRegistrationModerationRequest(registration.participant.id);
      await notifyModerators(`Новая заявка на регистрацию: ${registration.participant.fullName || "участник"}.`);
      return sendRichMessage(chatId, "*Заявка отправлена*\n────────────\n\nP&C уже получила данные. Как только доступ откроется, я пришлю приглашение в личный маршрут, задания и статистику.");
    }
    if (data.startsWith("task:")) {
      const participant = await telegramDb.getParticipantByTelegramId(userId);
      if (!participant || participant.status !== "approved") throw new Error("Approval is required");
      const assignmentId = Number(data.split(":")[1]);
      const assignment = await telegramDb.beginActivityReport(assignmentId, participant.id);
      await sendRichMessage(chatId, `<b>${premiumEmoji("action")} ${escapeHtml(assignment.title)}</b>\n\n${escapeHtml(assignment.description)}\n\nПосле подтверждения P&amp;C ваш вклад принесёт <b>${premiumEmoji("score")} +${assignment.points} баллов</b>.\n\n<i>Пройдите шаги в своём темпе: всё сохранится по ходу работы.</i>`);
      return promptForReportStep(userId, chatId, assignment.id, 1);
    }
    if (data.startsWith("report:submit:")) {
      const participant = await telegramDb.getParticipantByTelegramId(userId);
      if (!participant) throw new Error("Participant was not found");
      const assignmentId = Number(data.split(":")[2]);
      await telegramDb.submitActivityReport(assignmentId, participant.id);
      await sendReportToModeration(assignmentId);
      return sendRichMessage(chatId, `<b>${premiumEmoji("review")} Результат у P&amp;C</b>\n\nМатериалы уже переданы на проверку. Когда P&amp;C примет решение, я сразу обновлю ваш маршрут и, при подтверждении, добавлю баллы.`);
    }
    if (data.startsWith("reg:approve:") || data.startsWith("reg:reject:")) {
      if (!(await telegramDb.isTelegramModerator(userId))) throw new Error("Moderator permissions are required");
      const [,,participantIdString] = data.split(":");
      const participantId = Number(participantIdString);
      if (data.startsWith("reg:reject:")) {
        await telegramDb.upsertTelegramConversation({ telegramUserId: userId, telegramChatId: chatId, state: "moderation_reject_registration", assignmentId: participantId });
        return sendRichMessage(chatId, "*Нужен короткий комментарий*\nНапишите участнику, какие данные стоит уточнить.");
      }
      const participant = await telegramDb.moderateParticipantFromAdmin({ participantId, status: "approved", role: "participant" });
      await notifyRegistrationDecision({ participant, status: "approved", moderatorTelegramUserId: userId });
      return sendParticipantMenu(participant.telegramUserId, participant.telegramChatId);
    }
    if (data.startsWith("report:approve:") || data.startsWith("report:reject:")) {
      if (!(await telegramDb.isTelegramModerator(userId))) throw new Error("Moderator permissions are required");
      const assignmentId = Number(data.split(":")[2]);
      if (data.startsWith("report:reject:")) {
        await telegramDb.upsertTelegramConversation({ telegramUserId: userId, telegramChatId: chatId, state: "moderation_reject_report", assignmentId });
        return sendRichMessage(chatId, "*Нужен короткий комментарий*\nНапишите, что стоит дополнить в результате, чтобы участник мог вернуться с обновлёнными материалами.");
      }
      const result = await telegramDb.moderateReport({ assignmentId, moderatorTelegramId: userId, decision: "approved" });
      await sendRichMessage(result.report.participantChatId, formatReportApprovalNotification({ title: result.report.activityTitle, points: result.awardedPoints }));
      await notifyModerators(`*Результат подтверждён*\n${escapeMarkdown(result.report.activityTitle)} · участнику добавлено +${result.awardedPoints} баллов.`, userId);
      return sendRichMessage(chatId, `*Результат подтверждён*\n────────────\n\nУчастнику добавлено *+${result.awardedPoints} баллов*. Уведомление уже отправлено.`);
    }
  } catch (error) {
    await sendMessage(chatId, error instanceof Error ? error.message : "Не удалось выполнить действие.");
  } finally {
    await answerCallback(callback.id).catch(() => undefined);
  }
}

export async function processTelegramUpdate(update: TelegramUpdate) {
  if (update.callback_query) return handleCallback(update.callback_query);
  if (update.message) return handleMessage(update.message);
}

export async function syncTelegramIntegration(input: { webAppUrl: string | null; menuButtonText: string }) {
  if (!input.webAppUrl) return;
  const appUrl = new URL(input.webAppUrl);
  if (appUrl.protocol !== "https:") throw new Error("Telegram requires an HTTPS address for the Mini App");
  const webhookUrl = new URL("/api/telegram/webhook", appUrl).toString();
  const secretToken = getTelegramWebhookSecret(token());
  const statisticsUrl = new URL("/statistics", appUrl).toString();
  await telegramApi<boolean>("setChatMenuButton", {
    menu_button: { type: "web_app", text: input.menuButtonText, web_app: { url: statisticsUrl } },
  });
  await telegramApi<boolean>("setWebhook", {
    url: webhookUrl,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false,
  });
  await Promise.all([
    telegramApi<boolean>("setMyCommands", {
      commands: [
        { command: "start", description: "Начать или продолжить регистрацию" },
        { command: "menu", description: "Открыть мой ритм и задания" },
        { command: "help", description: "Как участвовать и получать баллы" },
      ],
    }),
    telegramApi<boolean>("setMyDescription", {
      description: "Корпоративные добрые дела: общий ритм команды, задания, подтверждённые результаты и видимый вклад каждого.",
    }),
    telegramApi<boolean>("setMyShortDescription", {
      short_description: "Добрые дела команды — с понятным маршрутом и честным признанием вклада.",
    }),
  ]);
}

export async function syncTelegramProfileFromSavedSettings() {
  const settings = await telegramDb.getTelegramSettings();
  if (!settings?.webAppUrl) return false;
  await syncTelegramIntegration({ webAppUrl: settings.webAppUrl, menuButtonText: settings.menuButtonText || "Статистика" });
  return true;
}

export function registerTelegramWebhook(app: Express) {
  app.post("/api/telegram/webhook", async (req: Request, res: Response) => {
    const configuredSecret = getTelegramWebhookSecret(token());
    if (configuredSecret && req.header("x-telegram-bot-api-secret-token") !== configuredSecret) {
      return res.status(401).json({ ok: false });
    }
    try {
      await processTelegramUpdate(req.body as TelegramUpdate);
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[Telegram] webhook processing failed", error);
      return res.status(500).json({ ok: false });
    }
  });
}
