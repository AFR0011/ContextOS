import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceData } from "@/lib/data";
import { createStarterWorkspace } from "@/lib/starter";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await createStarterWorkspace(prisma, user.id, false);
  const data = await getWorkspaceData(user.id);
  return NextResponse.json({ user, data });
}
