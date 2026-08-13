import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";
import {
  checkDatabaseAvailability,
  DATABASE_UNAVAILABLE_CODE,
  getNeonDatabaseBranchId,
  isDatabaseUnavailableError
} from "@/lib/database-health";

const noStoreHeaders = { "Cache-Control": "no-store" };

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const databaseAvailable = await checkDatabaseAvailability();
    if (!databaseAvailable) {
      return NextResponse.json(
        {
          status: "unavailable",
          service: "contextos",
          database: "unavailable",
          code: DATABASE_UNAVAILABLE_CODE
        },
        { status: 503, headers: noStoreHeaders }
      );
    }

    if (process.env.VERCEL_ENV === "preview") {
      const branchId = await getNeonDatabaseBranchId();
      console.info(`[stage8-preview-db] branch=${branchId ?? "unknown"}`);
    }

    return NextResponse.json(
      {
        status: "ok",
        service: "contextos",
        database: "ok",
        version: packageJson.version
      },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        {
          status: "unavailable",
          service: "contextos",
          database: "unavailable",
          code: DATABASE_UNAVAILABLE_CODE
        },
        { status: 503, headers: noStoreHeaders }
      );
    }

    console.error("Health check failed", error);
    return NextResponse.json(
      {
        status: "error",
        service: "contextos",
        database: "unknown",
        error: "Health check failed."
      },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
