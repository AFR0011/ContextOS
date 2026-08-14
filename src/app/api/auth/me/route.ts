import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { databaseUnavailableResponse, isDatabaseUnavailableError } from "@/lib/database-health";
import { logOperationalError } from "@/lib/operational-log";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return databaseUnavailableResponse();
    }
    logOperationalError("current_user_unexpected_error", error);
    return NextResponse.json({ error: "Could not load the current user." }, { status: 500 });
  }
}
