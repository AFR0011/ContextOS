import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, verifyPassword } from "@/lib/auth";
import { databaseUnavailableResponse, isDatabaseUnavailableError } from "@/lib/database-health";
import { logOperationalError } from "@/lib/operational-log";
import { prisma } from "@/lib/prisma";
import { rejectCrossOriginMutation } from "@/lib/request-security";

const SESSION_COOKIE = "contextos_session";

const deleteAccountSchema = z.object({
  password: z.string().min(1).max(256),
  confirmation: z.literal("DELETE")
});

export async function POST(request: Request) {
  const originRejection = rejectCrossOriginMutation(request);
  if (originRejection) return originRejection;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = deleteAccountSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter your current password and type DELETE to confirm account deletion." },
        { status: 400 }
      );
    }

    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, passwordHash: true }
    });

    if (!account || !(await verifyPassword(parsed.data.password, account.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
    }

    // User-owned records and all sessions are removed by the schema's verified
    // onDelete: Cascade relations. A single User deletion keeps that server-side
    // lifecycle boundary atomic instead of manually deleting child tables.
    await prisma.user.delete({ where: { id: user.id } });

    const response = NextResponse.json({ ok: true });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return databaseUnavailableResponse();
    }
    logOperationalError("account_delete_unexpected_error", error);
    return NextResponse.json({ error: "Could not delete the account." }, { status: 500 });
  }
}
