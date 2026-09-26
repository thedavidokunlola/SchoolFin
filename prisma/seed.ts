// prisma/seed.ts
// Clean database reset for SchoolFin
// Ensures the database starts completely fresh with 0 accounts so the school can onboard via /setup.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Resetting SchoolFin database to a 100% clean, fresh state...");

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
  console.log(`✨ Database reset complete (Total Users: ${userCount}).`);
  console.log("🚀 Start the dev server and visit http://localhost:3000 to set up your school portal via /setup.");
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

