import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceData } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { createStarterWorkspace } from "@/lib/starter";

export async function POST() {
  const resetEnabled = process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_RESET === "true";
  if (!resetEnabled) {
    return NextResponse.json({ error: "Demo reset is disabled in production." }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await createStarterWorkspace(prisma, user.id, true);
  const data = await getWorkspaceData(user.id);
  return NextResponse.json({ data });
}
