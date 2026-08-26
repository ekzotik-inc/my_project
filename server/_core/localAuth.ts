import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";

export type LocalAdminRole = "admin" | "pc_admin";
type LocalAdminAuthMethod = "local-password" | "telegram-mini-app";

function signingKey() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is required for local administrator sessions");
  return new TextEncoder().encode(value);
}

function expectedPassword(role: LocalAdminRole) {
  const value = role === "admin" ? process.env.CHIEF_ADMIN_PASSWORD : process.env.PC_ADMIN_PASSWORD;
  if (!value) throw new Error(`Missing password configuration for ${role}`);
  return value;
}

export function verifyAdminPassword(role: LocalAdminRole, password: string) {
  const expected = Buffer.from(expectedPassword(role));
  const received = Buffer.from(password);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function localAdminUser(role: LocalAdminRole, loginMethod: LocalAdminAuthMethod = "local-password"): User {
  const now = new Date();
  const isChief = role === "admin";
  return {
    id: isChief ? 1 : 2,
    openId: isChief ? "local-chief-admin" : "local-pc-admin",
    name: isChief ? "Chief Administrator" : "P&C Administrator",
    email: null,
    loginMethod,
    role,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

export async function createLocalAdminSession(role: LocalAdminRole) {
  return new SignJWT({ role, auth: "local-password" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(`local:${role}`)
    .setIssuedAt()
    .setExpirationTime(`${Math.floor(ONE_YEAR_MS / 1000)}s`)
    .sign(signingKey());
}

export async function createTelegramAdminSession(role: LocalAdminRole, telegramUserId: string) {
  return new SignJWT({ role, auth: "telegram-mini-app", telegramUserId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(`telegram:${telegramUserId}:${role}`)
    .setIssuedAt()
    .setExpirationTime(`${Math.floor(ONE_YEAR_MS / 1000)}s`)
    .sign(signingKey());
}

export async function authenticateLocalAdmin(req: Request): Promise<User | null> {
  const token = parseCookieHeader(req.headers.cookie ?? "")[COOKIE_NAME];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey());
    if ((payload.auth !== "local-password" && payload.auth !== "telegram-mini-app") || (payload.role !== "admin" && payload.role !== "pc_admin")) return null;
    return localAdminUser(payload.role, payload.auth);
  } catch {
    return null;
  }
}
