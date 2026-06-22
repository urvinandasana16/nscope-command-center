import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
  if (!seedPassword) {
    throw new Error("Set SEED_DEFAULT_PASSWORD before seeding the required admin user.");
  }

  const passwordHash = await bcrypt.hash(seedPassword, 12);

  await prisma.user.upsert({
    where: { email: "admin@nscope.local" },
    update: { passwordHash, role: "SUPER_ADMIN", status: "ACTIVE" },
    create: {
      name: "N-SCOPE Admin",
      email: "admin@nscope.local",
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("Seeded required admin user only. Demo clients/devices/tickets are no longer created.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
