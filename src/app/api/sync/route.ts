import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceData } from "@/lib/data";
import { applySyncMutations, SyncOwnershipError, SyncPayloadError } from "@/lib/sync-server";
import type { QueuedMutation } from "@/lib/types";
import { databaseUnavailableResponse, isDatabaseUnavailableError } from "@/lib/database-health";

const MAX_SYNC_BYTES = 256_000;
const MAX_MUTATIONS = 100;
const MAX_PAYLOAD_BYTES = 20_000;

const mutationSchema = z.object({
  mutationId: z.string().min(1).max(160),
  entityType: z.enum(["domains", "projects", "tasks", "captures", "notes", "deadlines", "reviews", "priorities", "dashboardScratchpads", "dashboardPreferences"]),
  entityId: z.string().min(1).max(160),
  operation: z.enum(["upsert", "delete"]),
  payload: z.record(z.string().max(80), z.unknown()).nullable(),
  createdAt: z.string().min(1).max(80)
}).superRefine((mutation, ctx) => {
  const payloadBytes = JSON.stringify(mutation.payload ?? {}).length;
  if (payloadBytes > MAX_PAYLOAD_BYTES) {
    ctx.addIssue({
      code: "custom",
      message: "Sync mutation payload is too large.",
      path: ["payload"]
    });
  }
});

const syncSchema = z.object({
  mutations: z.array(mutationSchema).max(MAX_MUTATIONS).default([])
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_SYNC_BYTES) {
      return NextResponse.json({ error: "Sync payload is too large." }, { status: 413 });
    }

    const parsed = syncSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid sync payload." }, { status: 400 });
    }

    const syncResult = await applySyncMutations(user.id, parsed.data.mutations as QueuedMutation[]);
    const data = await getWorkspaceData(user.id);

    return NextResponse.json({ data, ...syncResult });
  } catch (error) {
    if (error instanceof SyncPayloadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SyncOwnershipError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (isDatabaseUnavailableError(error)) {
      return databaseUnavailableResponse();
    }
    console.error("Workspace sync failed", error);
    return NextResponse.json({ error: "Could not sync workspace data." }, { status: 500 });
  }
}
