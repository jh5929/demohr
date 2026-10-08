export type RosterPerson = {
  no: string;
  name: string;
  email: string;
  phone: string;
  dept: string;
  title: string;
  manager: string | null;
  role: "admin" | "hr" | "employee";
  status: "active" | "probation" | "resigned";
  hire: string;
  contractEnd: string | null;
  dob: string;
  gender: string;
  basic: number;
  allowance: number;
  annual: number;
  annualLeft: number;
  sickLeft: number;
  address: string;
};

export const DEPARTMENTS = [
  { code: "EXEC", name: "Executive" },
  { code: "ENG", name: "Engineering" },
  { code: "PROD", name: "Product" },
  { code: "PPL", name: "People" },
  { code: "FIN", name: "Finance" },
  { code: "SAL", name: "Sales" },
  { code: "OPS", name: "Operations" },
] as const;

export const ROSTER: RosterPerson[] = [
  { no: "DH-1001", name: "Adrian Teh", email: "adrian.teh@demohr.example", phone: "+60 12-300 1001", dept: "Executive", title: "Chief Executive Officer", manager: null, role: "admin", status: "active", hire: "2018-03-01", contractEnd: null, dob: "1982-04-12", gender: "Male", basic: 18000, allowance: 2000, annual: 18, annualLeft: 11, sickLeft: 12, address: "Damansara Heights, Kuala Lumpur" },
  { no: "DH-1002", name: "Aisha Rahman", email: "aisha.rahman@demohr.example", phone: "+60 12-300 1002", dept: "People", title: "Head of People", manager: "adrian.teh@demohr.example", role: "hr", status: "active", hire: "2019-06-17", contractEnd: null, dob: "1990-11-03", gender: "Female", basic: 9800, allowance: 800, annual: 16, annualLeft: 9, sickLeft: 10, address: "TTDI, Kuala Lumpur" },
  { no: "DH-1003", name: "Priya Nair", email: "priya.nair@demohr.example", phone: "+60 16-220 4410", dept: "Engineering", title: "Engineering Manager", manager: "adrian.teh@demohr.example", role: "employee", status: "active", hire: "2020-01-13", contractEnd: null, dob: "1988-07-22", gender: "Female", basic: 12500, allowance: 1000, annual: 16, annualLeft: 8, sickLeft: 11, address: "Bangsar South, Kuala Lumpur" },
  { no: "DH-1004", name: "Daniel Ong", email: "daniel.ong@demohr.example", phone: "+60 17-555 0188", dept: "Engineering", title: "Software Engineer", manager: "priya.nair@demohr.example", role: "employee", status: "active", hire: "2023-04-03", contractEnd: null, dob: "1996-02-14", gender: "Male", basic: 7200, allowance: 600, annual: 14, annualLeft: 12, sickLeft: 13, address: "Petaling Jaya, Selangor" },
  { no: "DH-1005", name: "Hafiz Abdullah", email: "hafiz.abdullah@demohr.example", phone: "+60 13-441 2290", dept: "Engineering", title: "Software Engineer", manager: "priya.nair@demohr.example", role: "employee", status: "active", hire: "2022-09-01", contractEnd: null, dob: "1994-09-09", gender: "Male", basic: 7600, allowance: 600, annual: 14, annualLeft: 6, sickLeft: 8, address: "Shah Alam, Selangor" },
  { no: "DH-1006", name: "Mei Ling Tan", email: "mei.ling.tan@demohr.example", phone: "+60 12-880 3341", dept: "Engineering", title: "Software Engineer", manager: "priya.nair@demohr.example", role: "employee", status: "active", hire: "2024-02-19", contractEnd: null, dob: "1997-05-28", gender: "Female", basic: 6800, allowance: 500, annual: 14, annualLeft: 10, sickLeft: 14, address: "Subang Jaya, Selangor" },
  { no: "DH-1007", name: "Jason Koh", email: "jason.koh@demohr.example", phone: "+60 16-909 2277", dept: "Engineering", title: "Software Engineer", manager: "priya.nair@demohr.example", role: "employee", status: "active", hire: "2021-11-08", contractEnd: null, dob: "1992-10-28", gender: "Male", basic: 8100, allowance: 700, annual: 16, annualLeft: 7, sickLeft: 9, address: "Mont Kiara, Kuala Lumpur" },
  { no: "DH-1008", name: "Nurul Izzati", email: "nurul.izzati@demohr.example", phone: "+60 11-2344 9081", dept: "Engineering", title: "Software Engineer", manager: "priya.nair@demohr.example", role: "employee", status: "active", hire: "2025-01-06", contractEnd: null, dob: "1999-01-19", gender: "Female", basic: 6200, allowance: 400, annual: 14, annualLeft: 11, sickLeft: 14, address: "Cheras, Kuala Lumpur" },
  { no: "DH-1009", name: "Benjamin Tan", email: "benjamin.tan@demohr.example", phone: "+60 12-677 4412", dept: "Engineering", title: "QA Engineer", manager: "priya.nair@demohr.example", role: "employee", status: "probation", hire: "2026-08-17", contractEnd: "2026-11-20", dob: "1998-12-02", gender: "Male", basic: 4800, allowance: 300, annual: 8, annualLeft: 7, sickLeft: 10, address: "Puchong, Selangor" },
  { no: "DH-1010", name: "Sarah Khoo", email: "sarah.khoo@demohr.example", phone: "+60 19-220 1184", dept: "Product", title: "Product Lead", manager: "adrian.teh@demohr.example", role: "employee", status: "active", hire: "2020-08-24", contractEnd: null, dob: "1991-03-30", gender: "Female", basic: 11000, allowance: 900, annual: 16, annualLeft: 5, sickLeft: 12, address: "KLCC, Kuala Lumpur" },
  { no: "DH-1011", name: "Amirul Hakim", email: "amirul.hakim@demohr.example", phone: "+60 13-555 0192", dept: "Product", title: "Product Designer", manager: "sarah.khoo@demohr.example", role: "employee", status: "active", hire: "2023-07-10", contractEnd: null, dob: "1995-06-11", gender: "Male", basic: 6400, allowance: 400, annual: 14, annualLeft: 9, sickLeft: 13, address: "Ampang, Kuala Lumpur" },
  { no: "DH-1012", name: "Chloe Yap", email: "chloe.yap@demohr.example", phone: "+60 17-441 6620", dept: "Product", title: "Product Analyst", manager: "sarah.khoo@demohr.example", role: "employee", status: "active", hire: "2025-06-02", contractEnd: "2026-12-01", dob: "1998-08-21", gender: "Female", basic: 5600, allowance: 400, annual: 14, annualLeft: 12, sickLeft: 14, address: "Kepong, Kuala Lumpur" },
  { no: "DH-1013", name: "Grace Lim", email: "grace.lim@demohr.example", phone: "+60 12-909 3340", dept: "Finance", title: "Finance Manager", manager: "adrian.teh@demohr.example", role: "employee", status: "active", hire: "2019-02-11", contractEnd: null, dob: "1987-01-07", gender: "Female", basic: 10200, allowance: 800, annual: 16, annualLeft: 10, sickLeft: 11, address: "Sri Hartamas, Kuala Lumpur" },
  { no: "DH-1014", name: "Farah Nadia", email: "farah.nadia@demohr.example", phone: "+60 18-220 7751", dept: "Finance", title: "Accountant", manager: "grace.lim@demohr.example", role: "employee", status: "active", hire: "2022-03-14", contractEnd: null, dob: "1994-10-08", gender: "Female", basic: 5400, allowance: 350, annual: 14, annualLeft: 8, sickLeft: 12, address: "Setiawangsa, Kuala Lumpur" },
  { no: "DH-1015", name: "Rajesh Kumar", email: "rajesh.kumar@demohr.example", phone: "+60 16-338 2201", dept: "Sales", title: "Sales Manager", manager: "adrian.teh@demohr.example", role: "employee", status: "active", hire: "2020-05-04", contractEnd: null, dob: "1986-09-16", gender: "Male", basic: 9000, allowance: 1500, annual: 16, annualLeft: 4, sickLeft: 10, address: "Petaling Jaya, Selangor" },
  { no: "DH-1016", name: "Siti Aminah", email: "siti.aminah@demohr.example", phone: "+60 13-778 4419", dept: "Sales", title: "Account Executive", manager: "rajesh.kumar@demohr.example", role: "employee", status: "active", hire: "2024-01-15", contractEnd: null, dob: "1996-12-05", gender: "Female", basic: 4500, allowance: 800, annual: 14, annualLeft: 9, sickLeft: 13, address: "Klang, Selangor" },
  { no: "DH-1017", name: "Marcus Lee", email: "marcus.lee@demohr.example", phone: "+60 12-441 9088", dept: "Sales", title: "Account Executive", manager: "rajesh.kumar@demohr.example", role: "employee", status: "active", hire: "2023-10-02", contractEnd: null, dob: "1993-04-25", gender: "Male", basic: 4700, allowance: 900, annual: 14, annualLeft: 6, sickLeft: 11, address: "Puchong, Selangor" },
  { no: "DH-1018", name: "Haziq Rahman", email: "haziq.rahman@demohr.example", phone: "+60 19-662 1104", dept: "Operations", title: "Operations Lead", manager: "adrian.teh@demohr.example", role: "employee", status: "active", hire: "2021-04-19", contractEnd: null, dob: "1990-06-02", gender: "Male", basic: 7000, allowance: 500, annual: 16, annualLeft: 11, sickLeft: 12, address: "Gombak, Selangor" },
  { no: "DH-1019", name: "Emily Chong", email: "emily.chong@demohr.example", phone: "+60 17-220 6634", dept: "Operations", title: "Office Coordinator", manager: "haziq.rahman@demohr.example", role: "employee", status: "active", hire: "2024-09-09", contractEnd: null, dob: "1995-10-18", gender: "Female", basic: 3800, allowance: 250, annual: 14, annualLeft: 12, sickLeft: 14, address: "Wangsa Maju, Kuala Lumpur" },
  { no: "DH-1020", name: "Olivia Tan", email: "olivia.tan@demohr.example", phone: "+60 12-118 3345", dept: "Sales", title: "Account Executive", manager: "rajesh.kumar@demohr.example", role: "employee", status: "resigned", hire: "2022-06-01", contractEnd: "2026-08-31", dob: "1994-02-02", gender: "Female", basic: 4500, allowance: 600, annual: 14, annualLeft: 0, sickLeft: 0, address: "Bangsar, Kuala Lumpur" },
];

/** Kuala Lumpur 2026, including replacement days. Islamic dates follow published sighting calendars and can be edited. */
export const HOLIDAYS_2026: { date: string; name: string }[] = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-02-01", name: "Federal Territory Day / Thaipusam" },
  { date: "2026-02-02", name: "Thaipusam (replacement)" },
  { date: "2026-02-03", name: "Federal Territory Day (replacement)" },
  { date: "2026-02-17", name: "Chinese New Year" },
  { date: "2026-02-18", name: "Chinese New Year (day 2)" },
  { date: "2026-03-07", name: "Nuzul Al-Quran" },
  { date: "2026-03-21", name: "Hari Raya Aidilfitri" },
  { date: "2026-03-22", name: "Hari Raya Aidilfitri (day 2)" },
  { date: "2026-03-23", name: "Hari Raya Aidilfitri (replacement)" },
  { date: "2026-05-01", name: "Labour Day" },
  { date: "2026-05-27", name: "Hari Raya Haji" },
  { date: "2026-05-31", name: "Wesak Day" },
  { date: "2026-06-01", name: "Agong's Birthday / Wesak replacement" },
  { date: "2026-06-17", name: "Awal Muharram" },
  { date: "2026-08-25", name: "Prophet Muhammad's Birthday" },
  { date: "2026-08-31", name: "National Day" },
  { date: "2026-09-16", name: "Malaysia Day" },
  { date: "2026-11-08", name: "Deepavali" },
  { date: "2026-11-09", name: "Deepavali (replacement)" },
  { date: "2026-12-25", name: "Christmas Day" },
];
