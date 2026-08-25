import { z } from "zod";
import { COOKIE_NAME } from "../shared/const";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import * as telegramDb from "./telegramDb";
import * as activityAdminDb from "./activityAdminDb";
import * as broadcastDb from "./broadcastDb";
import { notifyRegistrationDecision, syncTelegramIntegration } from "./telegramBot";
import { storagePut } from "./storage";
import { createCurrentDataExport } from "./excelExport";
import { verifyTelegramMiniAppInitData } from "./telegramMiniApp";
import { getMiniAppStatistics } from "./statisticsDb";
import { getSessionCookieOptions } from "./_core/cookies";
import { createLocalAdminSession, localAdminUser, verifyAdminPassword } from "./_core/localAuth";
import { systemRouter } from "./_core/systemRouter";
import { chiefProcedure, moderationProcedure, publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(z.object({ role: z.enum(["admin", "pc_admin"]), password: z.string().min(1).max(1024) }))
      .mutation(async ({ input, ctx }) => {
        if (!verifyAdminPassword(input.role, input.password)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Неверный пароль" });
        }
        const session = await createLocalAdminSession(input.role);
        ctx.res.cookie(COOKIE_NAME, session, { ...getSessionCookieOptions(ctx.req), maxAge: 365 * 24 * 60 * 60 * 1000 });
        return localAdminUser(input.role);
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  statistics: router({
    dashboard: publicProcedure.input(z.object({ initData: z.string().min(1) })).query(({ input }) => {
      const user = verifyTelegramMiniAppInitData(input.initData);
      return getMiniAppStatistics(String(user.id));
    }),
  }),

  admin: router({
    overview: chiefProcedure.query(() => db.getAdminOverview()),
    teams: router({
      list: chiefProcedure.query(() => db.listTeams()),
      create: chiefProcedure
        .input(z.object({ name: z.string().min(1).max(160), description: z.string().max(2000).optional() }))
        .mutation(async ({ input }) => {
          await db.createTeam(input);
          return { success: true } as const;
        }),
      update: chiefProcedure
        .input(z.object({ id: z.number().int().positive(), name: z.string().min(1).max(160), description: z.string().max(2000).optional() }))
        .mutation(async ({ input }) => {
          await db.updateTeam(input);
          return { success: true } as const;
        }),
      archive: chiefProcedure
        .input(z.object({ id: z.number().int().positive() }))
        .mutation(async ({ input }) => {
          await db.archiveTeam(input.id);
          return { success: true } as const;
        }),
    }),
    periods: router({
      list: chiefProcedure.query(() => db.listActivityPeriods()),
      create: chiefProcedure
        .input(
          z.object({
            title: z.string().min(1).max(180),
            description: z.string().max(4000).optional(),
            startsAt: z.coerce.date(),
            endsAt: z.coerce.date(),
            status: z.enum(["draft", "active"]),
          })
        )
        .mutation(async ({ input }) => {
          await db.createActivityPeriod(input);
          return { success: true } as const;
        }),
    }),
    participants: moderationProcedure.query(() => db.listParticipantsForAdmin()),
    activities: router({
      list: chiefProcedure.input(z.object({ periodId: z.number().int().positive().optional() }).optional()).query(({ input }) => activityAdminDb.listActivitiesForAdmin(input?.periodId)),
      create: chiefProcedure
        .input(z.object({ periodId: z.number().int().positive(), title: z.string().min(1).max(200), description: z.string().min(1).max(8000), points: z.number().int().min(0), coverImageKey: z.string().max(512).nullable().optional(), coverImageUrl: z.string().max(1024).nullable().optional(), steps: z.array(z.object({ instruction: z.string().min(1).max(4000), inputType: z.enum(["photo", "file", "text", "mixed"]), isRequired: z.boolean() })).min(1) }))
        .mutation(async ({ input }) => activityAdminDb.createActivityAndAssignAll(input)),
    }),
    media: router({
      upload: chiefProcedure
        .input(z.object({ name: z.string().min(1).max(255), mimeType: z.string().min(1).max(128), base64: z.string().min(1).max(7_000_000) }))
        .mutation(async ({ input }) => {
          const raw = input.base64.includes(",") ? input.base64.split(",").at(-1)! : input.base64;
          const bytes = Buffer.from(raw, "base64");
          if (bytes.length > 5 * 1024 * 1024) throw new Error("Image must not exceed 5 MB");
          const safeName = input.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          return storagePut(`admin-media/${crypto.randomUUID()}-${safeName}`, bytes, input.mimeType);
        }),
    }),
    broadcasts: router({
      list: chiefProcedure.query(() => broadcastDb.listBroadcasts()),
      recipientCount: chiefProcedure.input(z.object({ audience: z.enum(["all_approved", "teams"]), teamIds: z.array(z.number().int().positive()) })).query(({ input }) => broadcastDb.getBroadcastRecipientCount(input.audience, input.teamIds)),
      createDraft: chiefProcedure.input(z.object({ title: z.string().min(1).max(180), message: z.string().min(1).max(4000), imageKey: z.string().max(512).nullable().optional(), imageUrl: z.string().max(1024).nullable().optional(), audience: z.enum(["all_approved", "teams"]), teamIds: z.array(z.number().int().positive()), buttons: z.array(z.object({ label: z.string().min(1).max(64), url: z.string().url().max(1024) })).max(8) })).mutation(({ input }) => broadcastDb.createBroadcastDraft(input)),
      send: chiefProcedure.input(z.object({ broadcastId: z.number().int().positive() })).mutation(({ input }) => broadcastDb.deliverBroadcast(input.broadcastId)),
    }),
    exports: router({
      current: chiefProcedure.mutation(() => createCurrentDataExport()),
    }),
    moderateParticipant: moderationProcedure
      .input(z.object({ participantId: z.number().int().positive(), status: z.enum(["approved", "rejected"]), role: z.enum(["participant", "pc_admin", "chief_admin"]), rejectionReason: z.string().max(1000).optional() }))
      .mutation(async ({ input }) => {
        const participant = await telegramDb.moderateParticipantFromAdmin(input);
        await notifyRegistrationDecision({ participant, status: input.status, reason: input.rejectionReason });
        return { success: true } as const;
      }),
    telegramSettings: router({
      get: chiefProcedure.query(() => telegramDb.getTelegramSettings()),
      update: chiefProcedure
        .input(z.object({ registrationModerationChatId: z.string().max(32).nullable().optional(), reportModerationChatId: z.string().max(32).nullable().optional(), webAppUrl: z.string().url().max(1024).nullable().optional(), menuButtonText: z.string().min(1).max(64).optional() }))
        .mutation(async ({ input }) => {
          await telegramDb.updateTelegramSettings(input);
          const settings = await telegramDb.getTelegramSettings();
          if (settings) await syncTelegramIntegration({ webAppUrl: settings.webAppUrl, menuButtonText: settings.menuButtonText });
          return { success: true } as const;
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
