import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceData } from "@/lib/data";
import { applySyncMutations } from "@/lib/sync-server";
import type { QueuedMutation } from "@/lib/types";

const mutationSchema = z.object({
  mutationId: z.string().min(1),
  entityType: z.enum(["domains", "projects", "tasks", "captures", "notes", "deadlines", "reviews", "priorities"]),
  entityId: z.string().min(1),
  operation: z.enum(["upsert", "delete"]),
  payload: z.record(z.string(), z.any()).nullable(),
  createdAt: z.string().min(1)
});

const syncSchema = z.object({
  mutations: z.array(mutationSchema).default([])
});

export async function POST(request: Request) {
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
}
