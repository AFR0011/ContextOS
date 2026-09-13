import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSessionContext, hashPassword, verifyPassword } from "@/lib/auth";
import { databaseUnavailableResponse, isDatabaseUnavailableError } from "@/lib/database-health";
import { logOperationalError } from "@/lib/operational-log";
import { prisma } from "@/lib/prisma";
import { authRateLimitResponse, checkAuthRateLimit, recordAuthRateLimitAttempt, resetAuthRateLimit } from "@/lib/rate-limit";
import { rejectCrossOriginMutation } from "@/lib/request-security";

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(8).max(128)
});

export async function POST(request: Request) {
  const originRejection = rejectCrossOriginMutation(request);
  if (originRejection) return originRejection;

  try {
    const session = await getCurrentSessionContext();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = passwordChangeSchema.safeParse(await request.json().catch(() => null));
    const rateLimit = checkAuthRateLimit(request, "password-change", session.user.email);
    if (rateLimit.limited) {
      return authRateLimitResponse(rateLimit);
    }

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter your current password and a new password between 8 and 128 characters." },
        { status: 400 }
      );
    }

    const account = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true }
    });

    if (!account || !(await verifyPassword(parsed.data.currentPassword, account.passwordHash))) {
      recordAuthRateLimitAttempt(request, "password-change", session.user.email);
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
    }

    if (await verifyPassword(parsed.data.newPassword, account.passwordHash)) {
      return NextResponse.json({ error: "New password must be different from the current password." }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    const [, revoked] = await prisma.$transaction([
      prisma.user.update({
        where: { id: account.id },
        data: { passwordHash }
      }),
      prisma.session.deleteMany({
        where: {
          userId: account.id,
          id: { not: session.sessionId }
        }
      })
    ]);

    resetAuthRateLimit(request, "password-change", session.user.email);
    return NextResponse.json({ ok: true, revokedSessions: revoked.count });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return databaseUnavailableResponse();
    }
    logOperationalError("password_change_unexpected_error", error);
    return NextResponse.json({ error: "Could not change the password." }, { status: 500 });
  }
}
