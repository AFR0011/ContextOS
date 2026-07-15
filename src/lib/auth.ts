import "server-only";

import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkDatabaseAvailability, isDatabaseUnavailableError } from "./database-health";
import { prisma } from "./prisma";

const SESSION_COOKIE = "contextos_session";
const SESSION_DAYS = 30;

export interface PublicUser {
  id: string;
  email: string;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  return expiresAt;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function publicUser(user: { id: string; email: string }): PublicUser {
  return { id: user.id, email: user.email };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = sessionExpiry();

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/"
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  try {
    if (token) {
      await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    }
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) throw error;
  } finally {
    cookieStore.delete(SESSION_COOKIE);
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  return publicUser(session.user);
}

export async function getAuthPageStatus() {
  try {
    const user = await getCurrentUser();
    if (user) return { user, databaseUnavailable: false };

    const databaseAvailable = await checkDatabaseAvailability();
    return { user: null, databaseUnavailable: !databaseAvailable };
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return { user: null, databaseUnavailable: true };
    }
    throw error;
  }
}

export async function requireUser() {
  try {
    const user = await getCurrentUser();
    if (!user) redirect("/login");
    return user;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) redirect("/login");
    throw error;
  }
}
