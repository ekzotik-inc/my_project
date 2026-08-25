import * as XLSX from "xlsx";
import { asc, desc, eq } from "drizzle-orm";
import {
  activityAssignments,
  activityPeriods,
  activities,
  broadcasts,
  pointLedger,
  participants,
  reportAttachments,
  reportStepResponses,
  teams,
} from "../drizzle/schema";
import { getDb } from "./db";
import { storagePut } from "./storage";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

function asDate(value: Date | null | undefined) {
  return value ? new Date(value).toLocaleString("ru-RU") : "";
}

function addSheet(workbook: XLSX.WorkBook, name: string, rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const widths = Object.keys(rows[0] || {}).map(key => ({ wch: Math.min(Math.max(key.length + 2, 14), 42) }));
  sheet["!cols"] = widths;
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

export async function createCurrentDataExport() {
  const db = await requireDb();
  const [people, tasks, assignments, points, reportFiles, sentBroadcasts] = await Promise.all([
    db.select({ id: participants.id, telegramUserId: participants.telegramUserId, telegramUsername: participants.telegramUsername, fullName: participants.fullName, phone: participants.phone, status: participants.status, role: participants.role, team: teams.name, registeredAt: participants.createdAt, moderatedAt: participants.moderatedAt }).from(participants).leftJoin(teams, eq(participants.teamId, teams.id)).orderBy(asc(participants.fullName)),
    db.select({ id: activities.id, title: activities.title, description: activities.description, points: activities.points, status: activities.status, period: activityPeriods.title, periodStart: activityPeriods.startsAt, periodEnd: activityPeriods.endsAt, createdAt: activities.createdAt }).from(activities).innerJoin(activityPeriods, eq(activities.periodId, activityPeriods.id)).orderBy(desc(activities.createdAt)),
    db.select({ id: activityAssignments.id, task: activities.title, period: activityPeriods.title, participant: participants.fullName, team: teams.name, status: activityAssignments.status, awardedPoints: activityAssignments.awardedPoints, assignedAt: activityAssignments.assignedAt, submittedAt: activityAssignments.submittedAt, reviewedAt: activityAssignments.reviewedAt, moderationComment: activityAssignments.moderationComment }).from(activityAssignments).innerJoin(activities, eq(activityAssignments.activityId, activities.id)).innerJoin(activityPeriods, eq(activities.periodId, activityPeriods.id)).innerJoin(participants, eq(activityAssignments.participantId, participants.id)).leftJoin(teams, eq(participants.teamId, teams.id)).orderBy(desc(activityAssignments.updatedAt)),
    db.select({ participant: participants.fullName, team: teams.name, period: activityPeriods.title, points: pointLedger.points, event: pointLedger.eventType, note: pointLedger.note, createdAt: pointLedger.createdAt }).from(pointLedger).innerJoin(participants, eq(pointLedger.participantId, participants.id)).leftJoin(teams, eq(participants.teamId, teams.id)).innerJoin(activityPeriods, eq(pointLedger.periodId, activityPeriods.id)).orderBy(desc(pointLedger.createdAt)),
    db.select({ assignmentId: reportStepResponses.assignmentId, participant: participants.fullName, task: activities.title, step: reportStepResponses.activityStepId, text: reportStepResponses.textResponse, fileType: reportAttachments.kind, fileUrl: reportAttachments.url, fileName: reportAttachments.originalName, submittedAt: reportStepResponses.submittedAt }).from(reportStepResponses).innerJoin(activityAssignments, eq(reportStepResponses.assignmentId, activityAssignments.id)).innerJoin(activities, eq(activityAssignments.activityId, activities.id)).innerJoin(participants, eq(activityAssignments.participantId, participants.id)).leftJoin(reportAttachments, eq(reportAttachments.responseId, reportStepResponses.id)).orderBy(desc(reportStepResponses.submittedAt)),
    db.select({ title: broadcasts.title, audience: broadcasts.audience, status: broadcasts.status, sentAt: broadcasts.sentAt, createdAt: broadcasts.createdAt }).from(broadcasts).orderBy(desc(broadcasts.createdAt)),
  ]);
  const workbook = XLSX.utils.book_new();
  addSheet(workbook, "Участники", people.map(row => ({ "ID": row.id, "ФИО": row.fullName || "", "Телефон": row.phone || "", "Telegram": row.telegramUsername ? `@${row.telegramUsername}` : row.telegramUserId, "Команда": row.team || "", "Статус": row.status, "Роль": row.role, "Регистрация": asDate(row.registeredAt), "Модерация": asDate(row.moderatedAt) })));
  addSheet(workbook, "Задания", tasks.map(row => ({ "ID": row.id, "Период": row.period, "Начало периода": asDate(row.periodStart), "Окончание периода": asDate(row.periodEnd), "Задание": row.title, "Описание": row.description, "Баллы": row.points, "Статус": row.status, "Создано": asDate(row.createdAt) })));
  addSheet(workbook, "Отчёты", assignments.map(row => ({ "ID отчёта": row.id, "Период": row.period, "Задание": row.task, "Участник": row.participant || "", "Команда": row.team || "", "Статус": row.status, "Баллы": row.awardedPoints, "Назначено": asDate(row.assignedAt), "Отправлено": asDate(row.submittedAt), "Проверено": asDate(row.reviewedAt), "Комментарий модератора": row.moderationComment || "" })));
  addSheet(workbook, "Материалы отчётов", reportFiles.map(row => ({ "ID отчёта": row.assignmentId, "Участник": row.participant || "", "Задание": row.task, "ID шага": row.step, "Текст": row.text || "", "Тип файла": row.fileType || "", "Имя файла": row.fileName || "", "Ссылка": row.fileUrl || "", "Время": asDate(row.submittedAt) })));
  addSheet(workbook, "Баллы", points.map(row => ({ "Участник": row.participant || "", "Команда": row.team || "", "Период": row.period, "Баллы": row.points, "Основание": row.event, "Комментарий": row.note || "", "Время": asDate(row.createdAt) })));
  addSheet(workbook, "Рассылки", sentBroadcasts.map(row => ({ "Название": row.title, "Аудитория": row.audience, "Статус": row.status, "Создано": asDate(row.createdAt), "Отправлено": asDate(row.sentAt) })));

  const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `good-deeds-export-${stamp}.xlsx`;
  const stored = await storagePut(`exports/${fileName}`, bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  return { fileName, url: stored.url, generatedAt: new Date() };
}
