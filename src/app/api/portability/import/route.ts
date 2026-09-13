import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSessionContext } from "@/lib/auth";
import { workspaceExportBundleSchema } from "@/lib/portability";
import { previewWorkspaceImport, restoreWorkspaceFromBundle } from "@/lib/portability-server";
import { databaseUnavailableResponse, isDatabaseUnavailableError } from "@/lib/database-health";
import { logOperationalError } from "@/lib/operational-log";
import { rejectCrossOriginMutation } from "@/lib/request-security";

const MAX_IMPORT_BYTES = 10_000_000;
const utf8Bytes = (value: string) => new TextEncoder().encode(value).byteLength;

const requestSchema = z.object({
  action: z.enum(["preview", "restore"]),
  mode: z.enum(["replace", "merge"]),
  bundle: z.unknown(),
  confirmedNoPendingChanges: z.boolean().optional(),
  confirmation: z.string().optional()
}).strict();

export async function POST(request: Request) {
  const originRejection = rejectCrossOriginMutation(request);
  if (originRejection) return originRejection;

  try {
    const session = await getCurrentSessionContext();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_IMPORT_BYTES) {
      return NextResponse.json({ error: "Workspace import is too large." }, { status: 413 });
    }

    const rawBody = await request.text();
    if (utf8Bytes(rawBody) > MAX_IMPORT_BYTES) {
      return NextResponse.json({ error: "Workspace import is too large." }, { status: 413 });
    }

    let raw: unknown;
    try {
      raw = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Import file is not valid JSON." }, { status: 400 });
    }

    const requestResult = requestSchema.safeParse(raw);
    if (!requestResult.success) {
      return NextResponse.json({ error: "Invalid import request." }, { status: 400 });
    }

    const bundleResult = workspaceExportBundleSchema.safeParse(requestResult.data.bundle);
    if (!bundleResult.success) {
      return NextResponse.json({
        error: "Workspace export is invalid or unsupported.",
        issues: bundleResult.error.issues.slice(0, 20).map((issue) => ({ path: issue.path.join("."), message: issue.message }))
      }, { status: 400 });
    }

    const { action, mode } = requestResult.data;
    if (action === "preview") {
      return NextResponse.json(previewWorkspaceImport(bundleResult.data, mode), { headers: { "cache-control": "no-store" } });
    }

    if (!requestResult.data.confirmedNoPendingChanges) {
      return NextResponse.json({ error: "Sync pending local changes before restoring a workspace." }, { status: 409 });
    }

    const expectedConfirmation = mode === "replace" ? "REPLACE" : "MERGE";
    if (requestResult.data.confirmation !== expectedConfirmation) {
      return NextResponse.json({ error: `Type ${expectedConfirmation} to confirm this import.` }, { status: 400 });
    }

    const restored = await restoreWorkspaceFromBundle({
      userId: session.user.id,
      currentSessionId: session.sessionId,
      bundle: bundleResult.data,
      mode
    });

    return NextResponse.json(restored, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) return databaseUnavailableResponse();
    logOperationalError("portability_import_unexpected_error", error);
    return NextResponse.json({ error: "Could not import workspace." }, { status: 500 });
  }
}
