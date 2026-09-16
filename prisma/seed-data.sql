-- =============================================
-- SEED DATA: Demo Accounts for SchoolFin
-- Run this AFTER the schema SQL has been executed
-- =============================================

-- Insert Academic Term
INSERT INTO "AcademicTerm" ("id", "name", "startDate", "endDate", "paymentDueDate", "isActive", "createdAt")
VALUES (gen_random_uuid(), '2026/2027 First Term', '2026-09-07', '2026-12-18', '2026-10-15', true, NOW());

-- Insert Users (password: SchoolFin@123)
-- Hash: $2b$12$D2yyTTevI4tGCizzQpU0ouvMRqIDmiRPsDTydiHMN0KFXWjZ1ehBa
INSERT INTO "User" ("id", "email", "firstName", "lastName", "role", "hashedPassword", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'proprietor@princeofpeaceschool.com', 'Mrs.', 'Oduwoye', 'PROPRIETOR', '$2b$12$D2yyTTevI4tGCizzQpU0ouvMRqIDmiRPsDTydiHMN0KFXWjZ1ehBa', true, NOW(), NOW()),
  (gen_random_uuid(), 'bursar@princeofpeaceschool.com', 'Mrs.', 'Oduwoye', 'BURSAR', '$2b$12$D2yyTTevI4tGCizzQpU0ouvMRqIDmiRPsDTydiHMN0KFXWjZ1ehBa', true, NOW(), NOW()),
  (gen_random_uuid(), 'accountant@princeofpeaceschool.com', 'Mr. Tunde', 'Bakare', 'ACCOUNTANT', '$2b$12$D2yyTTevI4tGCizzQpU0ouvMRqIDmiRPsDTydiHMN0KFXWjZ1ehBa', true, NOW(), NOW()),
  (gen_random_uuid(), 'parent@example.com', 'Dr. Oladipo', 'Okonkwo', 'PARENT', '$2b$12$D2yyTTevI4tGCizzQpU0ouvMRqIDmiRPsDTydiHMN0KFXWjZ1ehBa', true, NOW(), NOW());

-- Insert initial audit log entry
INSERT INTO "AuditLog" ("id", "userId", "action", "entity", "entityId", "metadata", "isSensitive", "createdAt")
SELECT gen_random_uuid(), u."id", 'TERM_CREATED', 'AcademicTerm', t."id", '{"name": "2026/2027 First Term", "status": "Active"}'::jsonb, false, NOW()
FROM "User" u, "AcademicTerm" t
WHERE u."role" = 'PROPRIETOR' LIMIT 1;
