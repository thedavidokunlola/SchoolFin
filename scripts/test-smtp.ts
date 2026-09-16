import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("1. Checking Database User Count...");
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, firstName: true, lastName: true },
  });
  console.log(`Current DB Users count: ${users.length}`);
  console.log("Existing Users in DB:", users);

  console.log("\n2. Testing Gmail SMTP Connection...");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "jedsprinceofpeaceschool@gmail.com",
      pass: "acxopceqtothzfcm",
    },
  });

  try {
    await transporter.verify();
    console.log("✅ SUCCESS: Gmail SMTP connection verified! Emails will send in real time.");
  } catch (err) {
    console.error("❌ Gmail SMTP verification failed:", err);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
