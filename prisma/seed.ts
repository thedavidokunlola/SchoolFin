// prisma/seed.ts
// Fresh School Setup Presentation Seed
// Wipes all transactional data and creates fresh login accounts with zero student/fee records
// for pristine school onboarding presentation.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Resetting SchoolFin to a pristine, brand-new state...");

  // 1. Clean existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.studentNote.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.debtCollectionEvent.deleteMany();
  await prisma.debtCollectionRule.deleteMany();
  await prisma.communicationTemplate.deleteMany();
  await prisma.manualCredit.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.installmentPlan.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.feePosting.deleteMany();
  await prisma.feeLineItem.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.parentStudentLink.deleteMany();
  await prisma.student.deleteMany();
  await prisma.academicTerm.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleaned all records (0 students, 0 fees, 0 postings, 0 receipts).");

  // 2. Create Active Academic Term for the new school year
  const term = await prisma.academicTerm.create({
    data: {
      name: "2026/2027 First Term",
      startDate: new Date("2026-09-07"),
      endDate: new Date("2026-12-18"),
      paymentDueDate: new Date("2026-10-15"),
      isActive: true,
    },
  });
  console.log(`✅ Configured Fresh Active Academic Term: ${term.name}`);

  // 3. Create Clean User Accounts for all 4 Roles
  const passwordHash = await bcrypt.hash("SchoolFin@123", 12);

  const proprietor = await prisma.user.create({
    data: {
      email: "proprietor@princeofpeaceschool.com",
      firstName: "Mrs.",
      lastName: "Oduwoye",
      role: "PROPRIETOR",
      hashedPassword: passwordHash,
      isActive: true,
    },
  });

  const bursar = await prisma.user.create({
    data: {
      email: "bursar@princeofpeaceschool.com",
      firstName: "Mrs.",
      lastName: "Oduwoye",
      role: "BURSAR",
      hashedPassword: passwordHash,
      isActive: true,
    },
  });

  const accountant = await prisma.user.create({
    data: {
      email: "accountant@princeofpeaceschool.com",
      firstName: "Mr. Tunde",
      lastName: "Bakare",
      role: "ACCOUNTANT",
      hashedPassword: passwordHash,
      isActive: true,
    },
  });

  const parent = await prisma.user.create({
    data: {
      email: "parent@example.com",
      firstName: "Dr. Oladipo",
      lastName: "Okonkwo",
      role: "PARENT",
      hashedPassword: passwordHash,
      isActive: true,
    },
  });

  console.log("✅ Created 4 Clean Portal Accounts (Proprietor, Bursar, Accountant, Parent)");
  console.log("   Password: SchoolFin@123");

  // 4. Initial Clean Audit Entry for Term Setup
  await prisma.auditLog.create({
    data: {
      userId: proprietor.id,
      action: "TERM_CREATED",
      entity: "AcademicTerm",
      entityId: term.id,
      metadata: { name: term.name, status: "Active" },
      isSensitive: false,
    },
  });

  console.log("✨ SchoolFin is now fresh as new and ready for school presentation!");
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
