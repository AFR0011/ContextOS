import "server-only";

import { NextResponse } from "next/server";
import {
  DATABASE_UNAVAILABLE_CODE,
  DATABASE_UNAVAILABLE_MESSAGE,
  isDatabaseUnavailableError
} from "./database-errors";
import { prisma } from "./prisma";

export { DATABASE_UNAVAILABLE_CODE, DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnavailableError };

export async function checkDatabaseAvailability() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) return false;
    throw error;
  }
}

export async function getNeonDatabaseBranchId() {
  const rows = await prisma.$queryRaw<Array<{ branchId: string | null }>>`
    SELECT current_setting('neon.branch_id', true) AS "branchId"
  `;
  return rows[0]?.branchId ?? null;
}

export function databaseUnavailableResponse() {
  return NextResponse.json(
    {
      error: DATABASE_UNAVAILABLE_MESSAGE,
      code: DATABASE_UNAVAILABLE_CODE
    },
    { status: 503 }
  );
}
