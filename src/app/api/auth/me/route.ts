import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { databaseUnavailableResponse, isDatabaseUnavailableError } from "@/lib/database-health";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return databaseUnavailableResponse();
    }
    console.error("Current user lookup failed", error);
    return NextResponse.json({ error: "Could not load the current user." }, { status: 500 });
  }
}
