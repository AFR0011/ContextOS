import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { rejectCrossOriginMutation } from "@/lib/request-security";

export async function POST(request: Request) {
  const originRejection = rejectCrossOriginMutation(request);
  if (originRejection) return originRejection;

  await destroySession();
  return NextResponse.json({ ok: true });
}
