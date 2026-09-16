// scripts/clean-database.ts
// Wipes all data to give a 100% fresh, empty database for real school onboarding

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clean() {
  console.log("🧹 Wiping all old data from database...");

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

  const userCount = await prisma.user.count();
  console.log(`✅ Database is now 100% fresh and clean (Total Users: ${userCount}).`);
  console.log("🚀 Visiting http://localhost:3000 will now start directly on Create Portal (/setup).");
}

clean()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
