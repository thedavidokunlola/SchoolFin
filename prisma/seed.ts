// prisma/seed.ts
// Database seeding script for Phase 0 demonstration and testing

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting SchoolFin Phase 0 Database Seed...");

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

  console.log("🧹 Cleaned existing tables.");

  // 2. Create Academic Term
  const term = await prisma.academicTerm.create({
    data: {
      name: "2025/2026 First Term",
      startDate: new Date("2025-09-08"),
      endDate: new Date("2025-12-15"),
      paymentDueDate: new Date("2025-10-15"),
      isActive: true,
    },
  });
  console.log(`✅ Created Active Term: ${term.name}`);

  // 3. Create Users for all 4 Roles
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

  console.log("✅ Created 4 Users (Proprietor, Bursar, Accountant, Parent) with password: SchoolFin@123");

  // 4. Create Students
  const student1 = await prisma.student.create({
    data: {
      admissionNumber: "PPS/2025/001",
      firstName: "Chinedu",
      lastName: "Okonkwo",
      class: "JSS 1",
      creditBalance: new Decimal("0.00"),
    },
  });

  const student2 = await prisma.student.create({
    data: {
      admissionNumber: "PPS/2025/002",
      firstName: "Amina",
      lastName: "Bello",
      class: "JSS 1",
      creditBalance: new Decimal("0.00"),
    },
  });

  const student3 = await prisma.student.create({
    data: {
      admissionNumber: "PPS/2025/003",
      firstName: "Emeka",
      lastName: "Adeleke",
      class: "SSS 1",
      creditBalance: new Decimal("0.00"),
    },
  });

  console.log("✅ Created 3 Students in JSS 1 and SSS 1");

  // 5. Link Parent to Students
  await prisma.parentStudentLink.createMany({
    data: [
      {
        parentId: parent.id,
        studentId: student1.id,
        relationship: "Father",
        isActive: true,
      },
      {
        parentId: parent.id,
        studentId: student2.id,
        relationship: "Guardian",
        isActive: true,
      },
      {
        parentId: parent.id,
        studentId: student3.id,
        relationship: "Father",
        isActive: true,
      },
    ],
  });
  console.log("✅ Linked Parent to Chinedu Okonkwo (Partial Due), Amina Bello (Settled), and Emeka Adeleke (100% Unpaid)");

  // 6. Create Fee Structures
  const feeStructureJSS = await prisma.feeStructure.create({
    data: {
      name: "JSS 1 First Term Standard",
      class: "JSS 1",
      termId: term.id,
      totalAmount: new Decimal("150000.00"),
      lineItems: {
        create: [
          { label: "Tuition Fee", amount: new Decimal("120000.00") },
          { label: "ICT & Digital Learning", amount: new Decimal("15000.00") },
          { label: "Development Levy", amount: new Decimal("15000.00") },
        ],
      },
    },
  });

  const feeStructureSSS = await prisma.feeStructure.create({
    data: {
      name: "SSS 1 First Term Science & Arts",
      class: "SSS 1",
      termId: term.id,
      totalAmount: new Decimal("185000.00"),
      lineItems: {
        create: [
          { label: "Tuition Fee", amount: new Decimal("150000.00") },
          { label: "Science & Computer Lab", amount: new Decimal("20000.00") },
          { label: "Development Levy", amount: new Decimal("15000.00") },
        ],
      },
    },
  });

  console.log("✅ Created Fee Structures for JSS 1 and SSS 1");

  // 7. Post Fees
  const posting1 = await prisma.feePosting.create({
    data: {
      studentId: student1.id,
      termId: term.id,
      feeStructureId: feeStructureJSS.id,
      description: "First Term Fees 2025/2026",
      amount: feeStructureJSS.totalAmount,
      type: "CHARGE",
      postedById: bursar.id,
    },
  });

  const posting2 = await prisma.feePosting.create({
    data: {
      studentId: student2.id,
      termId: term.id,
      feeStructureId: feeStructureJSS.id,
      description: "First Term Fees 2025/2026",
      amount: feeStructureJSS.totalAmount,
      type: "CHARGE",
      postedById: bursar.id,
    },
  });

  const posting3 = await prisma.feePosting.create({
    data: {
      studentId: student3.id,
      termId: term.id,
      feeStructureId: feeStructureSSS.id,
      description: "First Term Fees 2025/2026",
      amount: feeStructureSSS.totalAmount,
      type: "CHARGE",
      postedById: bursar.id,
    },
  });

  console.log("✅ Posted Fees to all 3 students");

  // 8. Record Sample Cash Payments & Generate Official Receipts (Sequential RCP-2026-NNNNNN)
  const currentYear = new Date().getFullYear();

  // Receipt 1 for Student 1 (Partial Payment of ₦50,000)
  const receipt1 = await prisma.receipt.create({
    data: {
      receiptNumber: `RCP-${currentYear}-000001`,
      studentId: student1.id,
      amount: new Decimal("50000.00"),
      method: "CASH",
    },
  });

  await prisma.manualCredit.create({
    data: {
      studentId: student1.id,
      amount: new Decimal("50000.00"),
      description: "Partial School Fees Cash Payment",
      referenceNote: "Cash at Bursary",
      recordedById: bursar.id,
      receiptId: receipt1.id,
    },
  });

  // Receipt 2 for Student 2 (Full Payment of ₦150,000)
  const receipt2 = await prisma.receipt.create({
    data: {
      receiptNumber: `RCP-${currentYear}-000002`,
      studentId: student2.id,
      amount: new Decimal("150000.00"),
      method: "CASH",
    },
  });

  await prisma.manualCredit.create({
    data: {
      studentId: student2.id,
      amount: new Decimal("150000.00"),
      description: "Full Term School Fees Payment",
      referenceNote: "Direct Cash Payment",
      recordedById: bursar.id,
      receiptId: receipt2.id,
    },
  });

  console.log("✅ Recorded Cash Credits and generated Receipts RCP-YYYY-000001 & RCP-YYYY-000002");

  // 9. Add AuditLog entries
  await prisma.auditLog.createMany({
    data: [
      {
        userId: proprietor.id,
        action: "TERM_CREATED",
        entity: "AcademicTerm",
        entityId: term.id,
        metadata: { name: term.name },
        isSensitive: false,
      },
      {
        userId: bursar.id,
        action: "FEE_POSTED_BULK",
        entity: "FeePosting",
        entityId: feeStructureJSS.id,
        metadata: { class: "JSS 1", count: 2 },
        isSensitive: false,
      },
      {
        userId: bursar.id,
        action: "MANUAL_CREDIT_CREATED",
        entity: "ManualCredit",
        entityId: receipt1.id,
        metadata: { receiptNumber: receipt1.receiptNumber, amount: "50000.00" },
        isSensitive: true,
      },
      {
        userId: bursar.id,
        action: "MANUAL_CREDIT_CREATED",
        entity: "ManualCredit",
        entityId: receipt2.id,
        metadata: { receiptNumber: receipt2.receiptNumber, amount: "150000.00" },
        isSensitive: true,
      },
    ],
  });

  console.log("✅ Seeded AuditLog records.");
  console.log("🎉 Seeding complete successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
