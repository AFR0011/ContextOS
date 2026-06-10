import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceData } from "@/lib/data";
import { applySyncMutations } from "@/lib/sync-server";
import type { QueuedMutation } from "@/lib/types";
import { databaseUnavailableResponse, isDatabaseUnavailableError } from "@/lib/database-health";

const mutationSchema = z.object({
  mutationId: z.string().min(1),
  entityType: z.enum(["domains", "projects", "tasks", "captures", "notes", "deadlines", "reviews", "priorities", "dashboardScratchpads", "dashboardPreferences"]),
  entityId: z.string().min(1),
  operation: z.enum(["upsert", "delete"]),
  payload: z.record(z.string(), z.any()).nullable(),
  createdAt: z.string().min(1)
});

const syncSchema = z.object({
  mutations: z.array(mutationSchema).default([])
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = syncSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid sync payload." }, { status: 400 });
    }

    const syncResult = await applySyncMutations(user.id, parsed.data.mutations as QueuedMutation[]);
    const data = await getWorkspaceData(user.id);

    return NextResponse.json({ data, ...syncResult });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return databaseUnavailableResponse();
    }
    console.error("Workspace sync failed", error);
    return NextResponse.json({ error: "Could not sync workspace data." }, { status: 500 });
  }
}
