// prisma/seed.ts
// SchoolFin Seed Script
// Configures initial accounts including Bursary with clear credentials.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SchoolFin database...");

  // 1. Ensure an active Academic Term exists
  const currentYear = new Date().getFullYear();
  let activeTerm = await prisma.academicTerm.findFirst({ where: { isActive: true } });
  if (!activeTerm) {
    activeTerm = await prisma.academicTerm.create({
      data: {
        name: `${currentYear}/${currentYear + 1} First Term`,
        startDate: new Date(`${currentYear}-09-01`),
        endDate: new Date(`${currentYear}-12-18`),
        paymentDueDate: new Date(`${currentYear}-10-15`),
        isActive: true,
      },
    });
    console.log("✅ Active academic term:", activeTerm.name);
  }

  // 2. Seed Bursary Account
  const bursarEmail = "bursar@schoolfin.ng";
  const bursarPassword = "Bursar@School2026!";
  const bursarHash = await bcrypt.hash(bursarPassword, 12);

  const bursar = await prisma.user.upsert({
    where: { email: bursarEmail },
    update: {
      hashedPassword: bursarHash,
      role: "BURSAR",
      firstName: "School",
      lastName: "Bursar",
      isActive: true,
    },
    create: {
      email: bursarEmail,
      hashedPassword: bursarHash,
      role: "BURSAR",
      firstName: "School",
      lastName: "Bursar",
      isActive: true,
    },
  });

  // 3. Seed Proprietor Account
  const propEmail = "proprietor@schoolfin.ng";
  const propPassword = "SchoolFin@123";
  const propHash = await bcrypt.hash(propPassword, 12);

  await prisma.user.upsert({
    where: { email: propEmail },
    update: {
      hashedPassword: propHash,
      role: "PROPRIETOR",
      firstName: "School",
      lastName: "Proprietor",
      isActive: true,
    },
    create: {
      email: propEmail,
      hashedPassword: propHash,
      role: "PROPRIETOR",
      firstName: "School",
      lastName: "Proprietor",
      isActive: true,
    },
  });

  console.log("=========================================");
  console.log("✨ Seed completed successfully!");
  console.log("💼 Bursary Login Details:");
  console.log(`   Email:    ${bursar.email}`);
  console.log(`   Password: ${bursarPassword}`);
  console.log(`   Role:     ${bursar.role}`);
  console.log("=========================================");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
