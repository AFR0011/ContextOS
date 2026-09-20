import bcrypt from "bcryptjs";
import { spawnSync } from "node:child_process";
import { prisma } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function runNpm(script: string, args: string[], input?: string) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  return spawnSync(npm, ["run", script, "--", ...args], {
    cwd: process.cwd(),
    env: process.env,
    input,
    encoding: "utf8"
  });
}

function assertSuccess(result: ReturnType<typeof runNpm>, context: string) {
  assert(result.status === 0, `${context} failed:\n${result.stderr}\n${result.stdout}`);
}

function assertFailure(result: ReturnType<typeof runNpm>, context: string) {
  assert(result.status !== 0, `${context} unexpectedly succeeded:\n${result.stdout}`);
}

async function countWorkspaceRows(userId: string) {
  const [domains, projects, tasks, captures, notes, deadlines, reviews, dailyNotes, scratchpads, preferences] = await Promise.all([
    prisma.domain.count({ where: { userId } }),
    prisma.project.count({ where: { userId } }),
    prisma.task.count({ where: { userId } }),
    prisma.capture.count({ where: { userId } }),
    prisma.note.count({ where: { userId } }),
    prisma.deadline.count({ where: { userId } }),
    prisma.review.count({ where: { userId } }),
    prisma.dailyNote.count({ where: { userId } }),
    prisma.dashboardScratchpad.count({ where: { userId } }),
    prisma.dashboardPreference.count({ where: { userId } })
  ]);
  return { domains, projects, tasks, captures, notes, deadlines, reviews, dailyNotes, scratchpads, preferences };
}

async function main() {
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `batch16-${seed}@example.test`;
  const generatedEmail = `batch16-generated-${seed}@example.test`;
  const invalidEmail = `batch16-invalid-${seed}@example.test`;
  const initialPassword = `B16-initial-${seed}-Aa1!`;
  const resetPassword = `B16-reset-${seed}-Bb2!`;
  const duplicatePassword = `B16-duplicate-${seed}-Cc3!`;

  try {
    const create = runNpm("account:create", [email, "--password-stdin"], `${initialPassword}\n`);
    assertSuccess(create, "operator account create");

    const created = await prisma.user.findUnique({ where: { email } });
    assert(created, "operator create did not persist the user");
    assert(await bcrypt.compare(initialPassword, created.passwordHash), "created password hash does not match stdin password");

    const initialCounts = await countWorkspaceRows(created.id);
    assert(initialCounts.domains === 0, "operator create must not seed domains");
    assert(initialCounts.projects === 0, "operator create must not seed projects");
    assert(initialCounts.tasks === 0, "operator create must not seed tasks");
    assert(initialCounts.captures === 0, "operator create must not seed captures");
    assert(initialCounts.notes === 0, "operator create must not seed notes");
    assert(initialCounts.deadlines === 0, "operator create must not seed deadlines");
    assert(initialCounts.reviews === 0, "operator create must not seed reviews");
    assert(initialCounts.dailyNotes === 0, "operator create must not seed daily notes");
    assert(initialCounts.scratchpads === 1, "operator create should add the empty dashboard scratchpad scaffold");
    assert(initialCounts.preferences === 1, "operator create should add dashboard preferences scaffold");

    await prisma.session.create({
      data: {
        userId: created.id,
        tokenHash: `batch16-${seed}`,
        expiresAt: new Date(Date.now() + 60_000)
      }
    });

    const reset = runNpm("account:reset-password", [email, "--password-stdin"], resetPassword);
    assertSuccess(reset, "operator password reset");

    const afterReset = await prisma.user.findUnique({ where: { email } });
    assert(afterReset, "user disappeared after password reset");
    assert(await bcrypt.compare(resetPassword, afterReset.passwordHash), "reset password hash does not match new password");
    assert(!(await bcrypt.compare(initialPassword, afterReset.passwordHash)), "old password still matches after operator reset");
    assert(await prisma.session.count({ where: { userId: created.id } }) === 0, "operator reset must revoke all sessions");

    const afterResetCounts = await countWorkspaceRows(created.id);
    assert(JSON.stringify(afterResetCounts) === JSON.stringify(initialCounts), "operator reset changed workspace data");

    const duplicate = runNpm("account:create", [email, "--password-stdin"], duplicatePassword);
    assertFailure(duplicate, "duplicate operator create");
    const afterDuplicate = await prisma.user.findUnique({ where: { email } });
    assert(afterDuplicate && await bcrypt.compare(resetPassword, afterDuplicate.passwordHash), "duplicate create changed the existing password");

    const generated = runNpm("account:create", [generatedEmail, "--generate-password"]);
    assertSuccess(generated, "generated-password account create");
    const generatedMatch = generated.stdout.match(/Temporary password: ([A-Za-z0-9_-]{32})/);
    assert(generatedMatch, "generated-password create did not print the expected temporary password");
    const generatedUser = await prisma.user.findUnique({ where: { email: generatedEmail } });
    assert(generatedUser, "generated-password create did not persist the user");
    assert(await bcrypt.compare(generatedMatch[1], generatedUser.passwordHash), "generated temporary password does not match stored hash");

    const invalid = runNpm("account:create", [invalidEmail, "--password-stdin"], "short");
    assertFailure(invalid, "short-password account create");
    assert(await prisma.user.count({ where: { email: invalidEmail } }) === 0, "invalid password created an account");

    console.log("Operator account provisioning/recovery checks passed.");
  } finally {
    await prisma.user.deleteMany({ where: { email: { in: [email, generatedEmail, invalidEmail] } } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
