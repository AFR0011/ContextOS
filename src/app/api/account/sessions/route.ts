import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSessionContext } from "@/lib/auth";
import { databaseUnavailableResponse, isDatabaseUnavailableError } from "@/lib/database-health";
import { logOperationalError } from "@/lib/operational-log";
import { prisma } from "@/lib/prisma";
import { rejectCrossOriginMutation } from "@/lib/request-security";

const sessionActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("revoke"),
    sessionId: z.string().min(1).max(64)
  }),
  z.object({
    action: z.literal("revoke-others")
  })
]);

export async function GET() {
  try {
    const current = await getCurrentSessionContext();
    if (!current) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await prisma.session.findMany({
      where: {
        userId: current.user.id,
        expiresAt: { gt: new Date() }
      },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      sessions: sessions.map((session) => ({
        id: session.id,
        current: session.id === current.sessionId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt
      }))
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return databaseUnavailableResponse();
    }
    logOperationalError("session_list_unexpected_error", error);
    return NextResponse.json({ error: "Could not load active sessions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const originRejection = rejectCrossOriginMutation(request);
  if (originRejection) return originRejection;

  try {
    const current = await getCurrentSessionContext();
    if (!current) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = sessionActionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Choose a valid session action." }, { status: 400 });
    }

    if (parsed.data.action === "revoke") {
      if (parsed.data.sessionId === current.sessionId) {
        return NextResponse.json(
          { error: "Use the normal logout flow to end this browser session." },
          { status: 400 }
        );
      }

      const revoked = await prisma.session.deleteMany({
        where: {
          id: parsed.data.sessionId,
          userId: current.user.id
        }
      });

      return NextResponse.json({ ok: true, revokedSessions: revoked.count });
    }

    const revoked = await prisma.session.deleteMany({
      where: {
        userId: current.user.id,
        id: { not: current.sessionId }
      }
    });

    return NextResponse.json({ ok: true, revokedSessions: revoked.count });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return databaseUnavailableResponse();
    }
    logOperationalError("session_revoke_unexpected_error", error);
    return NextResponse.json({ error: "Could not update active sessions." }, { status: 500 });
  }
}
