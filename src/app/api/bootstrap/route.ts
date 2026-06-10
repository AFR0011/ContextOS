import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceData } from "@/lib/data";
import { createStarterWorkspace } from "@/lib/starter";
import { prisma } from "@/lib/prisma";
import { databaseUnavailableResponse, isDatabaseUnavailableError } from "@/lib/database-health";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await createStarterWorkspace(prisma, user.id, false);
    const data = await getWorkspaceData(user.id);
    return NextResponse.json({ user, data });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return databaseUnavailableResponse();
    }
    console.error("Workspace bootstrap failed", error);
    return NextResponse.json({ error: "Could not load workspace data." }, { status: 500 });
  }
}
