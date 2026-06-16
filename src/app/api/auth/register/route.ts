import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword, publicUser } from "@/lib/auth";
import { createStarterWorkspace } from "@/lib/starter";
import { databaseUnavailableResponse, isDatabaseUnavailableError } from "@/lib/database-health";
import { isPublicRegistrationEnabled } from "@/lib/registration";

const registerSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(8)
});

export async function POST(request: Request) {
  try {
    if (!isPublicRegistrationEnabled()) {
      return NextResponse.json({ error: "Registration is closed for this deployment." }, { status: 403 });
    }

    const parsed = registerSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Use a valid email and a password of at least 8 characters." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash
      }
    });
    await createStarterWorkspace(prisma, user.id, false);
    await createSession(user.id);

    return NextResponse.json({ user: publicUser(user) });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return databaseUnavailableResponse();
    }
    console.error("Registration failed", error);
    return NextResponse.json(
      { error: "Registration server error. Check the deployment database connection and migrations." },
      { status: 500 }
    );
  }
}
