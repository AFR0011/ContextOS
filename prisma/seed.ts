import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { createStarterWorkspace } from "../src/lib/starter";

async function main() {
  const email = process.env.SEED_DEMO_EMAIL || "demo@contextos.local";
  const password = process.env.SEED_DEMO_PASSWORD || "contextos-demo-v011";
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash }
  });

  await prisma.session.deleteMany({ where: { userId: user.id } });
  await createStarterWorkspace(prisma, user.id, true);

  console.log(`Seeded ContextOS demo user: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
