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

type InlineButton = { text: string; callback_data?: string; web_app?: { url: string }; url?: string };
type ReplyButton = { text: string; request_contact?: boolean };
type ReplyMarkup = { inline_keyboard?: InlineButton[][]; keyboard?: ReplyButton[][]; resize_keyboard?: boolean; one_time_keyboard?: boolean; remove_keyboard?: boolean };

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

async function sendMessage(chatId: string | number, text: string, replyMarkup?: ReplyMarkup, parseMode?: "Markdown") {
  return telegramApi<{ message_id: number }>("sendMessage", {
    chat_id: String(chatId),
    text,
    reply_markup: replyMarkup,
    ...(parseMode ? { parse_mode: parseMode } : {}),
    disable_web_page_preview: true,
  });
}

async function sendRichMessage(chatId: string | number, text: string, replyMarkup?: ReplyMarkup) {
  return sendMessage(chatId, text, replyMarkup, "Markdown");
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

async function sendPhoto(chatId: string | number, photo: string, caption?: string) {
  return telegramApi<{ message_id: number }>("sendPhoto", { chat_id: String(chatId), photo, caption });
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

export function formatParticipantDashboard(dashboard: Awaited<ReturnType<typeof telegramDb.getParticipantActivityDashboard>>) {
  if (!dashboard.period) return "🌱 *Сейчас нет активного периода*\n\nКак только команда P&C запустит новый цикл добрых дел, задания появятся здесь. Загляните чуть позже!";
  const completed = dashboard.assignments.filter(item => item.status === "approved").length;
  const reviewing = dashboard.assignments.filter(item => item.status === "under_review").length;
  const available = dashboard.assignments.filter(item => item.status === "assigned" || item.status === "in_progress" || item.status === "rejected").length;
  return `🌿 *${escapeMarkdown(dashboard.period.title)}*\n\n*Ваш личный прогресс*\n🏅 Баллы: *${dashboard.points}*\n✨ Доступно: *${available}*\n🔎 На проверке: *${reviewing}*\n✅ Подтверждено: *${completed} из ${dashboard.assignments.length}*\n\nВыберите задание ниже или обновите показатели, чтобы увидеть свежий статус.`;
}

export function formatNewActivityNotification(input: { periodTitle: string; title: string; description: string; points: number }) {
  return `✨ *Новое доброе дело уже ждёт вас!*\n\n*${escapeMarkdown(input.periodTitle)}*\n\n🎯 *${escapeMarkdown(input.title)}*\n${escapeMarkdown(input.description)}\n\n🏅 *Награда:* +${input.points} баллов\n\nОткройте кнопку «Открыть задания», выберите активность и двигайтесь по шагам. Баллы появятся после проверки результата.`;
}

export function formatNewPeriodNotification(input: { title: string; description?: string }) {
  const description = input.description?.trim() ? `\n${escapeMarkdown(input.description.trim())}` : "";
  return `🌱 *Старт нового периода*\n\n*${escapeMarkdown(input.title)}*${description}\n\nСовсем скоро здесь появятся задания для всей команды. Следите за обновлениями — вместе сделаем больше добра.`;
}

export function formatReportApprovalNotification(input: { title: string; points: number }) {
  return `🎉 *Ваш результат принят!*\n\nЗадание *${escapeMarkdown(input.title)}* подтверждено модератором.\n🏅 *Начислено:* +${input.points} баллов\n\nСпасибо за участие — ваш вклад уже влияет на общий результат команды.`;
}

async function notifyApprovedParticipants(text: string, replyMarkup?: ReplyMarkup) {
  const recipients = await telegramDb.listApprovedParticipantChats();
  const delivery = await Promise.allSettled(recipients.map(recipient => sendRichMessage(recipient.telegramChatId, text, replyMarkup)));
  return delivery.filter(result => result.status === "fulfilled").length;
}

export async function notifyNewActivity(input: { periodTitle: string; title: string; description: string; points: number }) {
  return notifyApprovedParticipants(formatNewActivityNotification(input), { inline_keyboard: [[{ text: "Открыть задания", callback_data: "menu:refresh" }]] });
}

export async function notifyNewPeriod(input: { title: string; description?: string }) {
  return notifyApprovedParticipants(formatNewPeriodNotification(input), { inline_keyboard: [[{ text: "Открыть меню", callback_data: "menu:refresh" }]] });
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
    .map(item => [{ text: `${item.title} · ${formatStatus(item.status)}`, callback_data: `task:${item.id}` }]);
  const actionButtons: InlineButton[][] = [[{ text: "Обновить показатели", callback_data: "menu:refresh" }]];
  if (settings?.webAppUrl) actionButtons.unshift([{ text: settings.menuButtonText || "Статистика", web_app: { url: settings.webAppUrl } }]);
  return sendRichMessage(chatId, formatParticipantDashboard(dashboard), { inline_keyboard: [...taskButtons, ...actionButtons] });
}

async function startRegistration(message: TelegramMessage) {
  if (!message.from) return;
  const userId = String(message.from.id);
  const existing = await telegramDb.getParticipantByTelegramId(userId);
  if (existing?.status === "approved") return sendParticipantMenu(userId, String(message.chat.id));
  if (existing?.status === "pending") return sendRichMessage(message.chat.id, "⏳ *Ваша заявка уже на модерации*\n\nКоманда P&C проверяет данные. Мы обязательно напишем, когда доступ будет открыт.");
  await telegramDb.upsertTelegramConversation({ telegramUserId: userId, telegramChatId: String(message.chat.id), state: "registration_phone" });
  return sendRichMessage(message.chat.id, "🌿 *Добро пожаловать в «Добрые дела»!*\n\nЧтобы мы могли добавить вас в команду, поделитесь номером телефона. Это займёт меньше минуты.", {
    keyboard: [[{ text: "Поделиться номером", request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  });
}

async function sendTeamChoice(telegramUserId: string, chatId: string, phone: string) {
  const teams = await telegramDb.listActiveTeamsForTelegram();
  if (teams.length === 0) return sendRichMessage(chatId, "🌱 *Регистрация почти готова*\n\nСейчас администратор добавляет команды. Мы откроем выбор команды совсем скоро — попробуйте чуть позже.");
  await telegramDb.upsertTelegramConversation({ telegramUserId, telegramChatId: chatId, state: "registration_name", draftPhone: phone });
  return sendRichMessage(chatId, "Спасибо! ✨\n\nТеперь напишите *имя и фамилию* одним сообщением — так коллеги смогут узнать вас в общей истории добрых дел.", { remove_keyboard: true });
}

async function promptForReportStep(telegramUserId: string, chatId: string, assignmentId: number, stepOrder: number) {
  const participant = await telegramDb.getParticipantByTelegramId(telegramUserId);
  if (!participant) throw new Error("Participant was not found");
  const assignment = await telegramDb.getAssignmentForParticipant(assignmentId, participant.id);
  if (!assignment) throw new Error("Assignment was not found");
  const step = assignment.steps.find(item => item.stepOrder === stepOrder);
  if (!step) {
    await telegramDb.clearTelegramConversation(telegramUserId);
    return sendRichMessage(chatId, "🎯 *Все шаги заполнены!*\n\nПроверьте материалы и отправьте результат на модерацию. Баллы будут начислены только после подтверждения.", { inline_keyboard: [[{ text: "Отправить на проверку", callback_data: `report:submit:${assignmentId}` }]] });
  }
  await telegramDb.upsertTelegramConversation({ telegramUserId, telegramChatId: chatId, state: "report_step", assignmentId, stepOrder });
  const inputHint = step.inputType === "text" ? "Отправьте текстовый ответ." : step.inputType === "photo" ? "Отправьте фотографию." : step.inputType === "file" ? "Отправьте файл или фото документа." : "Отправьте текст, фото или файл.";
  return sendRichMessage(chatId, `🧩 *Шаг ${step.stepOrder}*\n${escapeMarkdown(step.instruction)}\n\n_${inputHint}_`);
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
  await sendRichMessage(settings.registrationModerationChatId, `🆕 *Новая заявка на регистрацию*\n\n*Участник:* ${escapeMarkdown(participant.fullName || "Без имени")}\n*Команда:* ${participant.teamId || "не выбрана"}\n*Телефон:* ${escapeMarkdown(participant.phone || "не указан")}\n*Telegram:* ${participant.telegramUsername ? `@${escapeMarkdown(participant.telegramUsername)}` : participant.telegramUserId}\n\nПроверьте данные и примите решение.`, {
    inline_keyboard: [[{ text: "Принять", callback_data: `reg:approve:${participant.id}` }, { text: "Отклонить", callback_data: `reg:reject:${participant.id}` }]],
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
    await sendRichMessage(input.participant.telegramChatId, "🎉 *Ваша заявка одобрена!*\n\nДобро пожаловать в «Добрые дела». Откройте меню — там появятся ваш личный прогресс, задания и командная статистика.");
    await notifyModerators(`✅ *Заявка ${escapeMarkdown(input.participant.fullName || "участника")} одобрена.*`, input.moderatorTelegramUserId);
    return;
  }
  const reason = input.reason?.trim() || "Пожалуйста, уточните данные и отправьте заявку снова.";
  await sendRichMessage(input.participant.telegramChatId, `🛠 *Заявка ждёт уточнения*\n\n*Комментарий P&C:* ${escapeMarkdown(reason)}\n\nИспользуйте /start, чтобы обновить данные и отправить заявку ещё раз.`);
  await notifyModerators(`🛠 *Заявка ${escapeMarkdown(input.participant.fullName || "участника")} возвращена на уточнение.*`, input.moderatorTelegramUserId);
}

async function sendReportToModeration(assignmentId: number) {
  const settings = await telegramDb.getTelegramSettings();
  if (!settings?.reportModerationChatId) return;
  const report = await telegramDb.getReportForModeration(assignmentId);
  if (!report) return;
  await sendRichMessage(settings.reportModerationChatId, `🔎 *Отчёт ждёт проверки*\n\n*Задание:* ${escapeMarkdown(report.activityTitle)}\n*Награда после подтверждения:* +${report.activityPoints} баллов\n*Участник:* ${escapeMarkdown(report.participantName || "Без имени")}\n*Команда:* ${escapeMarkdown(report.participantTeam || "не выбрана")}\n\nПроверьте материалы и примите решение.`);
  const evidence = await telegramDb.getReportEvidence(assignmentId);
  for (const item of evidence) {
    const caption = `Шаг ${item.stepOrder}: ${item.instruction}${item.textResponse ? `\nОтвет: ${item.textResponse}` : ""}`;
    if (item.telegramFileId) {
      if (item.attachmentKind === "photo") await sendPhoto(settings.reportModerationChatId, item.telegramFileId, caption);
      else await sendDocument(settings.reportModerationChatId, item.telegramFileId, caption);
    } else if (item.textResponse) await sendRichMessage(settings.reportModerationChatId, `🧩 *Шаг ${item.stepOrder}*\n${escapeMarkdown(caption)}`);
  }
  await sendRichMessage(settings.reportModerationChatId, "*Решение по отчёту*\nПодтверждение начислит баллы участнику; отклонение попросит его доработать материалы.", { inline_keyboard: [[{ text: "Подтвердить и начислить", callback_data: `report:approve:${assignmentId}` }, { text: "Отклонить", callback_data: `report:reject:${assignmentId}` }]] });
  await notifyModerators(`🔎 *Новый отчёт ожидает проверки:* ${escapeMarkdown(report.activityTitle)} от ${escapeMarkdown(report.participantName || "участника")}.`);
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
    return sendMessage(chatId, "Выберите вашу команду.", { inline_keyboard: teams.map(team => [{ text: team.name, callback_data: `reg:team:${team.id}` }]) });
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
    return promptForReportStep(userId, String(message.chat.id), assignment.id, step.stepOrder + 1);
  }
  const photo = message.photo?.at(-1);
  const document = message.document;
  if (!photo && !document) return sendMessage(message.chat.id, "Этот шаг ожидает материал указанного типа. Попробуйте ещё раз.");
  const isReceipt = /чек|receipt/i.test(step.instruction);
  const stored = await storeTelegramAttachment({ telegramUserId: userId, assignmentId: assignment.id, stepId: step.id, fileId: photo?.file_id || document!.file_id, kind: photo ? "photo" : isReceipt ? "receipt" : "file", name: document?.file_name, mimeType: document?.mime_type });
  await telegramDb.saveReportAttachment({ assignmentId: assignment.id, participantId: participant.id, stepId: step.id, kind: photo ? "photo" : isReceipt ? "receipt" : "file", storageKey: stored.key, url: stored.url, telegramFileId: photo?.file_id || document!.file_id, originalName: stored.originalName, mimeType: document?.mime_type || "image/jpeg" });
  return promptForReportStep(userId, String(message.chat.id), assignment.id, step.stepOrder + 1);
}

async function handleModeratorText(message: TelegramMessage, conversation: NonNullable<Awaited<ReturnType<typeof telegramDb.getTelegramConversation>>>) {
  if (!message.from || !message.text?.trim() || !conversation.assignmentId) return;
  const moderatorId = String(message.from.id);
  if (!(await telegramDb.isTelegramModerator(moderatorId))) return;
  if (conversation.state === "moderation_reject_report") {
    const result = await telegramDb.moderateReport({ assignmentId: conversation.assignmentId, moderatorTelegramId: moderatorId, decision: "rejected", comment: message.text.trim() });
    await telegramDb.clearTelegramConversation(moderatorId);
    await sendRichMessage(result.report.participantChatId, `🛠 *Отчёт ждёт доработки*\n\nЗадание *${escapeMarkdown(result.report.activityTitle)}* ещё не прошло проверку.\n\n*Комментарий P&C:* ${escapeMarkdown(message.text.trim())}\n\nОткройте задание в меню, дополните материалы и отправьте результат повторно.`);
    await notifyModerators(`🛠 *Отчёт ${escapeMarkdown(result.report.activityTitle)} возвращён на доработку.*`, moderatorId);
    return sendRichMessage(message.chat.id, "🛠 Участник получил комментарий и может доработать результат.");
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
  if (message.text?.trim() === "/start") return startRegistration(message);
  if (message.text?.trim() === "/menu") return sendParticipantMenu(userId, String(message.chat.id));
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
    if (data.startsWith("reg:team:")) {
      const conversation = await telegramDb.getTelegramConversation(userId);
      if (!conversation?.draftPhone || !conversation.draftFullName) throw new Error("Registration session expired");
      const teamId = Number(data.split(":")[2]);
      const registration = await telegramDb.completeTelegramRegistration({ telegramUserId: userId, telegramChatId: chatId, telegramUsername: callback.from.username ?? null, phone: conversation.draftPhone, fullName: conversation.draftFullName, teamId });
      await telegramDb.clearTelegramConversation(userId);
      if (registration.alreadyApproved) return sendParticipantMenu(userId, chatId);
      await sendRegistrationModerationRequest(registration.participant.id);
      await notifyModerators(`Новая заявка на регистрацию: ${registration.participant.fullName || "участник"}.`);
      return sendRichMessage(chatId, "✨ *Заявка отправлена!*\n\nСпасибо — P&C уже получила ваши данные. Мы обязательно напишем, когда откроем доступ к заданиям и статистике.");
    }
    if (data.startsWith("task:")) {
      const participant = await telegramDb.getParticipantByTelegramId(userId);
      if (!participant || participant.status !== "approved") throw new Error("Approval is required");
      const assignmentId = Number(data.split(":")[1]);
      const assignment = await telegramDb.beginActivityReport(assignmentId, participant.id);
      await sendRichMessage(chatId, `🎯 *${escapeMarkdown(assignment.title)}*\n\n${escapeMarkdown(assignment.description)}\n\n🏅 *Потенциальная награда:* +${assignment.points} баллов\n_Баллы начисляются только после проверки результата._`);
      return promptForReportStep(userId, chatId, assignment.id, 1);
    }
    if (data.startsWith("report:submit:")) {
      const participant = await telegramDb.getParticipantByTelegramId(userId);
      if (!participant) throw new Error("Participant was not found");
      const assignmentId = Number(data.split(":")[2]);
      await telegramDb.submitActivityReport(assignmentId, participant.id);
      await sendReportToModeration(assignmentId);
      return sendRichMessage(chatId, "📨 *Отчёт отправлен на проверку!*\n\nP&C уже получила материалы. Как только результат подтвердят, мы напишем вам и начислим баллы.");
    }
    if (data.startsWith("reg:approve:") || data.startsWith("reg:reject:")) {
      if (!(await telegramDb.isTelegramModerator(userId))) throw new Error("Moderator permissions are required");
      const [,,participantIdString] = data.split(":");
      const participantId = Number(participantIdString);
      if (data.startsWith("reg:reject:")) {
        await telegramDb.upsertTelegramConversation({ telegramUserId: userId, telegramChatId: chatId, state: "moderation_reject_registration", assignmentId: participantId });
        return sendMessage(chatId, "Введите причину отклонения заявки следующим сообщением.");
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
        return sendMessage(chatId, "Введите комментарий для участника следующим сообщением.");
      }
      const result = await telegramDb.moderateReport({ assignmentId, moderatorTelegramId: userId, decision: "approved" });
      await sendRichMessage(result.report.participantChatId, formatReportApprovalNotification({ title: result.report.activityTitle, points: result.awardedPoints }));
      await notifyModerators(`🎉 *Отчёт ${escapeMarkdown(result.report.activityTitle)} подтверждён.* Начислено +${result.awardedPoints} баллов.`, userId);
      return sendRichMessage(chatId, `🎉 *Результат подтверждён!*\nУчастнику начислено: *+${result.awardedPoints} баллов*.`);
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
