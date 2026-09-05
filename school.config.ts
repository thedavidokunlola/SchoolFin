// school.config.ts
// School-specific non-secret configuration
// Locked per configuration-and-deployment.md and PRD §6.6

export interface AcademicTermStructureItem {
  termNumber: number;
  name: string;
  startMonth: number;
  endMonth: number;
}

export interface SchoolConfig {
  name: string;
  logoUrl: string;
  address: string;
  phone: string;
  timezone: string;
  currency: string;
  academicTermStructure: AcademicTermStructureItem[];
  smsMonthlyCapSmsUnits: number;
  domain: string;
  privacyPolicyUrl: string;
}

export const schoolConfig: SchoolConfig = {
  name: "Prince of Peace School",
  logoUrl: "/images/school-logo.png",
  address: "12 Peace Avenue, Victoria Island, Lagos, Nigeria",
  phone: "+234 803 000 0000",
  timezone: "Africa/Lagos",
  currency: "NGN",
  academicTermStructure: [
    { termNumber: 1, name: "First Term", startMonth: 9, endMonth: 12 },
    { termNumber: 2, name: "Second Term", startMonth: 1, endMonth: 4 },
    { termNumber: 3, name: "Third Term", startMonth: 5, endMonth: 7 },
  ],
  smsMonthlyCapSmsUnits: 1500,
  domain: "princeofpeaceschool.com",
  privacyPolicyUrl: "/privacy",
};
