import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceData } from "@/lib/data";
import { createWorkspaceExportBundle, workspaceExportToMarkdown } from "@/lib/portability";
import { databaseUnavailableResponse, isDatabaseUnavailableError } from "@/lib/database-health";
import { logOperationalError } from "@/lib/operational-log";

function exportStamp(value: string) {
  return value.replace(/[:.]/g, "-");
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await getWorkspaceData(user.id);
    const bundle = createWorkspaceExportBundle(data);
    const format = new URL(request.url).searchParams.get("format") === "markdown" ? "markdown" : "json";
    const stamp = exportStamp(bundle.exportedAt);

    if (format === "markdown") {
      return new NextResponse(workspaceExportToMarkdown(bundle), {
        status: 200,
        headers: {
          "content-type": "text/markdown; charset=utf-8",
          "content-disposition": `attachment; filename="contextos-workspace-${stamp}.md"`,
          "cache-control": "no-store"
        }
      });
    }

    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="contextos-workspace-${stamp}.json"`,
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) return databaseUnavailableResponse();
    logOperationalError("portability_export_unexpected_error", error);
    return NextResponse.json({ error: "Could not export workspace." }, { status: 500 });
  }
}
