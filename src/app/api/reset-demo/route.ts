import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceData } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { createStarterWorkspace } from "@/lib/starter";
import { databaseUnavailableResponse, isDatabaseUnavailableError } from "@/lib/database-health";
import { logOperationalError } from "@/lib/operational-log";
import { rejectCrossOriginMutation } from "@/lib/request-security";

export async function POST(request: Request) {
  const originRejection = rejectCrossOriginMutation(request);
  if (originRejection) return originRejection;

  const resetEnabled = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_RESET === "true";
  if (!resetEnabled) {
    return NextResponse.json({ error: "Demo reset is disabled in production." }, { status: 403 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const demoEmail = (process.env.SEED_DEMO_EMAIL ?? "demo@contextos.local").trim().toLowerCase();
    if (user.email.toLowerCase() !== demoEmail) {
      return NextResponse.json({ error: "Demo reset is available only for the configured demo account." }, { status: 403 });
    }

    await prisma.$transaction((tx) => createStarterWorkspace(tx, user.id, true));
    const data = await getWorkspaceData(user.id);
    return NextResponse.json({ data });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return databaseUnavailableResponse();
    }
    logOperationalError("demo_reset_unexpected_error", error);
    return NextResponse.json({ error: "Could not reset demo data." }, { status: 500 });
  }
}
