import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, publicUser, verifyPassword } from "@/lib/auth";
import { databaseUnavailableResponse, isDatabaseUnavailableError } from "@/lib/database-health";
import { authRateLimitResponse, checkAuthRateLimit, recordAuthRateLimitAttempt, resetAuthRateLimit } from "@/lib/rate-limit";
import { rejectCrossOriginMutation } from "@/lib/request-security";

const loginSchema = z.object({
  email: z.string().max(254).email().transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(256)
});

export async function POST(request: Request) {
  const originRejection = rejectCrossOriginMutation(request);
  if (originRejection) return originRejection;

  try {
    const parsed = loginSchema.safeParse(await request.json().catch(() => null));
    const identity = parsed.success ? parsed.data.email : undefined;
    const rateLimit = checkAuthRateLimit(request, "login", identity);
    if (rateLimit.limited) {
      return authRateLimitResponse(rateLimit);
    }

    if (!parsed.success) {
      recordAuthRateLimitAttempt(request, "login");
      return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      recordAuthRateLimitAttempt(request, "login", parsed.data.email);
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    resetAuthRateLimit(request, "login", parsed.data.email);
    await createSession(user.id);
    return NextResponse.json({ user: publicUser(user) });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return databaseUnavailableResponse();
    }
    console.error("Login failed", error);
    return NextResponse.json(
      { error: "Login server error. Check the deployment database connection and migrations." },
      { status: 500 }
    );
  }
}
