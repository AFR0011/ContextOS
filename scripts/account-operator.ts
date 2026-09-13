import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../src/lib/prisma";
import { createWorkspaceScaffold } from "../src/lib/starter";

const emailSchema = z.string().trim().max(254).email().transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(8).max(128);

type Command = "create" | "reset-password";

type PasswordSource =
  | { kind: "generated"; password: string }
  | { kind: "stdin"; password: string };

class OperatorInputError extends Error {}
class OperatorExpectedError extends Error {}

function usage() {
  return [
    "Usage:",
    "  npm run account:create -- <email> --generate-password",
    "  npm run account:create -- <email> --password-stdin",
    "  npm run account:reset-password -- <email> --generate-password",
    "  npm run account:reset-password -- <email> --password-stdin",
    "",
    "Passwords are never accepted as command-line arguments."
  ].join("\n");
}

function parseCommand(value: string | undefined): Command {
  if (value === "create" || value === "reset-password") return value;
  throw new OperatorInputError(usage());
}

function parseEmail(value: string | undefined) {
  const parsed = emailSchema.safeParse(value ?? "");
  if (!parsed.success) {
    throw new OperatorInputError("Use a valid email address up to 254 characters.\n\n" + usage());
  }
  return parsed.data;
}

async function readPasswordFromStdin() {
  if (process.stdin.isTTY) {
    throw new OperatorInputError(
      "--password-stdin requires password data to be piped on stdin so it is not echoed by this tool."
    );
  }

  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;

  input = input.replace(/\r?\n$/, "");
  if (/[\r\n]/.test(input)) {
    throw new OperatorInputError("--password-stdin accepts exactly one password value, not multiple lines.");
  }
  return input;
}

async function resolvePasswordSource(flags: string[]): Promise<PasswordSource> {
  const knownFlags = new Set(["--generate-password", "--password-stdin"]);
  const unknown = flags.filter((flag) => !knownFlags.has(flag));
  if (unknown.length > 0) {
    throw new OperatorInputError(`Unknown option: ${unknown[0]}\n\n${usage()}`);
  }

  const generateCount = flags.filter((flag) => flag === "--generate-password").length;
  const stdinCount = flags.filter((flag) => flag === "--password-stdin").length;
  if (generateCount + stdinCount !== 1 || generateCount > 1 || stdinCount > 1) {
    throw new OperatorInputError("Choose exactly one password source: --generate-password or --password-stdin.\n\n" + usage());
  }

  const source: PasswordSource = generateCount === 1
    ? { kind: "generated", password: randomBytes(24).toString("base64url") }
    : { kind: "stdin", password: await readPasswordFromStdin() };

  const parsed = passwordSchema.safeParse(source.password);
  if (!parsed.success) {
    throw new OperatorInputError("Password must be between 8 and 128 characters.");
  }
  return { ...source, password: parsed.data };
}

async function createAccount(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new OperatorExpectedError(`Account already exists for ${email}. Use account:reset-password for recovery.`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { email, passwordHash } });
      await createWorkspaceScaffold(tx, created.id);
      return created;
    });
    return user.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new OperatorExpectedError(`Account already exists for ${email}. Use account:reset-password for recovery.`);
    }
    throw error;
  }
}

async function resetPassword(email: string, password: string) {
  const account = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!account) {
    throw new OperatorExpectedError(`No ContextOS account exists for ${email}.`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [, revoked] = await prisma.$transaction([
    prisma.user.update({ where: { id: account.id }, data: { passwordHash } }),
    prisma.session.deleteMany({ where: { userId: account.id } })
  ]);
  return revoked.count;
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new OperatorInputError("DATABASE_URL must point to the intended ContextOS PostgreSQL database.");
  }

  const command = parseCommand(process.argv[2]);
  const email = parseEmail(process.argv[3]);
  const passwordSource = await resolvePasswordSource(process.argv.slice(4));

  if (command === "create") {
    await createAccount(email, passwordSource.password);
    console.log(`Created ContextOS account: ${email}`);
    console.log("Workspace: empty production scaffold (no demo records)." );
  } else {
    const revokedSessions = await resetPassword(email, passwordSource.password);
    console.log(`Reset password for ContextOS account: ${email}`);
    console.log(`Revoked server sessions: ${revokedSessions}`);
    console.log("Workspace data: unchanged.");
  }

  if (passwordSource.kind === "generated") {
    console.log(`Temporary password: ${passwordSource.password}`);
    console.log("Store it securely and change it after the next successful sign-in.");
  }
}

main()
  .catch((error) => {
    if (error instanceof OperatorInputError || error instanceof OperatorExpectedError) {
      console.error(error.message);
    } else {
      console.error("Account operation failed. Verify DATABASE_URL, applied migrations, and database access.");
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
