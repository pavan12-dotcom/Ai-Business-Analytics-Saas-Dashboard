/**
 * sampleDatasets.ts
 * Sample datasets for instant universal demo — no upload required.
 * Each matches the format SpreadsheetContext expects.
 */

export interface SampleDataset {
  id: string
  name: string
  description: string
  icon: string
  tag: string
  tagColor: string
  filename: string
  headers: string[]
  columns_metadata: Record<string, string>
  rows: Record<string, any>[]
}

// ── 1. Retail Sales Dataset ────────────────────────────────────
const retailRows = [
  { OrderID: 'ORD-001', Customer: 'Emma Johnson',    Category: 'Electronics', Product: 'Laptop Pro',      Revenue: 1299, Quantity: 1, Date: '2024-01-05', Region: 'North', Status: 'Completed' },
  { OrderID: 'ORD-002', Customer: 'James Smith',     Category: 'Clothing',    Product: 'Winter Jacket',   Revenue: 189,  Quantity: 2, Date: '2024-01-08', Region: 'South', Status: 'Completed' },
  { OrderID: 'ORD-003', Customer: 'Sarah Lee',       Category: 'Electronics', Product: 'Wireless Earbuds',Revenue: 249,  Quantity: 3, Date: '2024-01-12', Region: 'East',  Status: 'Completed' },
  { OrderID: 'ORD-004', Customer: 'Mike Davis',      Category: 'Home',        Product: 'Smart Thermostat',Revenue: 179,  Quantity: 1, Date: '2024-01-15', Region: 'West',  Status: 'Pending'   },
  { OrderID: 'ORD-005', Customer: 'Anna White',      Category: 'Sports',      Product: 'Yoga Mat',        Revenue: 59,   Quantity: 4, Date: '2024-01-20', Region: 'North', Status: 'Completed' },
  { OrderID: 'ORD-006', Customer: 'Chris Brown',     Category: 'Electronics', Product: 'Tablet X',        Revenue: 799,  Quantity: 1, Date: '2024-01-22', Region: 'South', Status: 'Completed' },
  { OrderID: 'ORD-007', Customer: 'Olivia Taylor',   Category: 'Home',        Product: 'Robot Vacuum',    Revenue: 349,  Quantity: 1, Date: '2024-02-02', Region: 'East',  Status: 'Completed' },
  { OrderID: 'ORD-008', Customer: 'Noah Martinez',   Category: 'Clothing',    Product: 'Running Shoes',   Revenue: 129,  Quantity: 2, Date: '2024-02-05', Region: 'West',  Status: 'Completed' },
  { OrderID: 'ORD-009', Customer: 'Sophia Anderson', Category: 'Sports',      Product: 'Dumbbell Set',    Revenue: 299,  Quantity: 1, Date: '2024-02-10', Region: 'North', Status: 'Completed' },
  { OrderID: 'ORD-010', Customer: 'Liam Jackson',    Category: 'Electronics', Product: 'Smart Watch',     Revenue: 449,  Quantity: 2, Date: '2024-02-14', Region: 'South', Status: 'Refunded'  },
  { OrderID: 'ORD-011', Customer: 'Ava Thomas',      Category: 'Home',        Product: 'Air Purifier',    Revenue: 229,  Quantity: 1, Date: '2024-02-18', Region: 'East',  Status: 'Completed' },
  { OrderID: 'ORD-012', Customer: 'Mason Harris',    Category: 'Clothing',    Product: 'Denim Jeans',     Revenue: 89,   Quantity: 3, Date: '2024-02-22', Region: 'West',  Status: 'Completed' },
  { OrderID: 'ORD-013', Customer: 'Isabella Clark',  Category: 'Sports',      Product: 'Cycling Helmet',  Revenue: 119,  Quantity: 1, Date: '2024-03-01', Region: 'North', Status: 'Completed' },
  { OrderID: 'ORD-014', Customer: 'Ethan Lewis',     Category: 'Electronics', Product: 'Gaming Keyboard', Revenue: 189,  Quantity: 1, Date: '2024-03-05', Region: 'South', Status: 'Completed' },
  { OrderID: 'ORD-015', Customer: 'Mia Robinson',    Category: 'Home',        Product: 'Coffee Machine',  Revenue: 269,  Quantity: 1, Date: '2024-03-08', Region: 'East',  Status: 'Completed' },
  { OrderID: 'ORD-016', Customer: 'Lucas Walker',    Category: 'Clothing',    Product: 'Formal Shirt',    Revenue: 79,   Quantity: 5, Date: '2024-03-12', Region: 'West',  Status: 'Completed' },
  { OrderID: 'ORD-017', Customer: 'Charlotte Hall',  Category: 'Sports',      Product: 'Protein Powder',  Revenue: 69,   Quantity: 4, Date: '2024-03-15', Region: 'North', Status: 'Completed' },
  { OrderID: 'ORD-018', Customer: 'Henry Allen',     Category: 'Electronics', Product: 'Dash Camera',     Revenue: 159,  Quantity: 2, Date: '2024-03-20', Region: 'South', Status: 'Pending'   },
  { OrderID: 'ORD-019', Customer: 'Amelia Young',    Category: 'Home',        Product: 'LED Desk Lamp',   Revenue: 79,   Quantity: 3, Date: '2024-04-02', Region: 'East',  Status: 'Completed' },
  { OrderID: 'ORD-020', Customer: 'Jack King',       Category: 'Clothing',    Product: 'Hoodie Classic',  Revenue: 99,   Quantity: 2, Date: '2024-04-05', Region: 'West',  Status: 'Completed' },
  { OrderID: 'ORD-021', Customer: 'Harper Scott',    Category: 'Electronics', Product: 'Bluetooth Speaker',Revenue: 219, Quantity: 1, Date: '2024-04-10', Region: 'North', Status: 'Completed' },
  { OrderID: 'ORD-022', Customer: 'Benjamin Green',  Category: 'Sports',      Product: 'Tennis Racket',   Revenue: 149,  Quantity: 1, Date: '2024-04-14', Region: 'South', Status: 'Completed' },
  { OrderID: 'ORD-023', Customer: 'Evelyn Baker',    Category: 'Home',        Product: 'Smart Doorbell',  Revenue: 189,  Quantity: 1, Date: '2024-04-18', Region: 'East',  Status: 'Completed' },
  { OrderID: 'ORD-024', Customer: 'Alexander Adams', Category: 'Electronics', Product: 'VR Headset',      Revenue: 599,  Quantity: 1, Date: '2024-05-01', Region: 'West',  Status: 'Completed' },
  { OrderID: 'ORD-025', Customer: 'Abigail Nelson',  Category: 'Clothing',    Product: 'Leather Bag',     Revenue: 219,  Quantity: 1, Date: '2024-05-05', Region: 'North', Status: 'Completed' },
  { OrderID: 'ORD-026', Customer: 'Daniel Carter',   Category: 'Sports',      Product: 'Jump Rope',       Revenue: 29,   Quantity: 6, Date: '2024-05-08', Region: 'South', Status: 'Completed' },
  { OrderID: 'ORD-027', Customer: 'Ella Mitchell',   Category: 'Home',        Product: 'Blender Pro',     Revenue: 149,  Quantity: 2, Date: '2024-05-12', Region: 'East',  Status: 'Completed' },
  { OrderID: 'ORD-028', Customer: 'Matthew Perez',   Category: 'Electronics', Product: 'Monitor 27"',     Revenue: 429,  Quantity: 1, Date: '2024-05-15', Region: 'West',  Status: 'Pending'   },
  { OrderID: 'ORD-029', Customer: 'Scarlett Roberts',Category: 'Clothing',    Product: 'Sports Leggings', Revenue: 89,   Quantity: 3, Date: '2024-06-01', Region: 'North', Status: 'Completed' },
  { OrderID: 'ORD-030', Customer: 'Joseph Turner',   Category: 'Home',        Product: 'Plant Pot Set',   Revenue: 59,   Quantity: 4, Date: '2024-06-05', Region: 'South', Status: 'Completed' },
]

// ── 2. SaaS Sales Pipeline Dataset ────────────────────────────
const salesRows = [
  { DealID: 'D-001', Company: 'TechNova Inc',     Plan: 'Enterprise', Stage: 'Closed Won',  MRR: 4800, ACV: 57600, Rep: 'Alex Kim',    Region: 'APAC',  CloseDate: '2024-01-10' },
  { DealID: 'D-002', Company: 'PixelCraft',       Plan: 'Team',       Stage: 'Closed Won',  MRR: 1200, ACV: 14400, Rep: 'Sara Liu',    Region: 'EMEA',  CloseDate: '2024-01-18' },
  { DealID: 'D-003', Company: 'Datastream AI',    Plan: 'Pro',        Stage: 'Negotiation', MRR: 890,  ACV: 10680, Rep: 'Tom Hayes',   Region: 'NA',    CloseDate: '2024-01-25' },
  { DealID: 'D-004', Company: 'CloudBridge',      Plan: 'Enterprise', Stage: 'Closed Won',  MRR: 3600, ACV: 43200, Rep: 'Alex Kim',    Region: 'NA',    CloseDate: '2024-02-05' },
  { DealID: 'D-005', Company: 'VortexMetrics',    Plan: 'Pro',        Stage: 'Closed Won',  MRR: 790,  ACV: 9480,  Rep: 'Emma Rose',   Region: 'LATAM', CloseDate: '2024-02-12' },
  { DealID: 'D-006', Company: 'ScaleUp Labs',     Plan: 'Team',       Stage: 'Prospecting', MRR: 1100, ACV: 13200, Rep: 'Sara Liu',    Region: 'EMEA',  CloseDate: '2024-02-20' },
  { DealID: 'D-007', Company: 'QuantumFlow',      Plan: 'Enterprise', Stage: 'Closed Won',  MRR: 5200, ACV: 62400, Rep: 'Tom Hayes',   Region: 'APAC',  CloseDate: '2024-03-03' },
  { DealID: 'D-008', Company: 'NexGen Analytics', Plan: 'Pro',        Stage: 'Closed Won',  MRR: 950,  ACV: 11400, Rep: 'Emma Rose',   Region: 'NA',    CloseDate: '2024-03-10' },
  { DealID: 'D-009', Company: 'SkyDash Corp',     Plan: 'Team',       Stage: 'Closed Won',  MRR: 1350, ACV: 16200, Rep: 'Alex Kim',    Region: 'LATAM', CloseDate: '2024-03-18' },
  { DealID: 'D-010', Company: 'PulseTrack',       Plan: 'Enterprise', Stage: 'Negotiation', MRR: 4100, ACV: 49200, Rep: 'Sara Liu',    Region: 'NA',    CloseDate: '2024-03-25' },
  { DealID: 'D-011', Company: 'InnovateSphere',   Plan: 'Pro',        Stage: 'Closed Won',  MRR: 880,  ACV: 10560, Rep: 'Tom Hayes',   Region: 'EMEA',  CloseDate: '2024-04-04' },
  { DealID: 'D-012', Company: 'BrightEdge AI',    Plan: 'Team',       Stage: 'Closed Won',  MRR: 1250, ACV: 15000, Rep: 'Emma Rose',   Region: 'APAC',  CloseDate: '2024-04-11' },
  { DealID: 'D-013', Company: 'CoreStack',        Plan: 'Enterprise', Stage: 'Closed Won',  MRR: 6200, ACV: 74400, Rep: 'Alex Kim',    Region: 'NA',    CloseDate: '2024-04-20' },
  { DealID: 'D-014', Company: 'DataMesh',         Plan: 'Pro',        Stage: 'Prospecting', MRR: 720,  ACV: 8640,  Rep: 'Sara Liu',    Region: 'LATAM', CloseDate: '2024-04-28' },
  { DealID: 'D-015', Company: 'OmniCloud',        Plan: 'Team',       Stage: 'Closed Won',  MRR: 1500, ACV: 18000, Rep: 'Tom Hayes',   Region: 'EMEA',  CloseDate: '2024-05-06' },
  { DealID: 'D-016', Company: 'Hyperion AI',      Plan: 'Enterprise', Stage: 'Closed Won',  MRR: 3900, ACV: 46800, Rep: 'Emma Rose',   Region: 'APAC',  CloseDate: '2024-05-14' },
  { DealID: 'D-017', Company: 'ZenithData',       Plan: 'Pro',        Stage: 'Closed Won',  MRR: 860,  ACV: 10320, Rep: 'Alex Kim',    Region: 'NA',    CloseDate: '2024-05-22' },
  { DealID: 'D-018', Company: 'FusionTech',       Plan: 'Team',       Stage: 'Negotiation', MRR: 1400, ACV: 16800, Rep: 'Sara Liu',    Region: 'LATAM', CloseDate: '2024-05-30' },
  { DealID: 'D-019', Company: 'ApexSystems',      Plan: 'Enterprise', Stage: 'Closed Won',  MRR: 5500, ACV: 66000, Rep: 'Tom Hayes',   Region: 'EMEA',  CloseDate: '2024-06-05' },
  { DealID: 'D-020', Company: 'GlobalInsights',   Plan: 'Pro',        Stage: 'Closed Won',  MRR: 990,  ACV: 11880, Rep: 'Emma Rose',   Region: 'NA',    CloseDate: '2024-06-12' },
]

// ── 3. Finance / P&L Dataset ───────────────────────────────────
const financeRows = [
  { Period: '2024-01-01', Department: 'Engineering',  Category: 'Salaries',     Amount: 185000, Type: 'Expense', Budget: 190000 },
  { Period: '2024-01-01', Department: 'Sales',         Category: 'Revenue',      Amount: 310000, Type: 'Income',  Budget: 280000 },
  { Period: '2024-01-01', Department: 'Marketing',     Category: 'Ads',          Amount: 42000,  Type: 'Expense', Budget: 45000  },
  { Period: '2024-01-01', Department: 'Operations',    Category: 'Cloud Infra',  Amount: 28000,  Type: 'Expense', Budget: 30000  },
  { Period: '2024-02-01', Department: 'Engineering',   Category: 'Salaries',     Amount: 185000, Type: 'Expense', Budget: 190000 },
  { Period: '2024-02-01', Department: 'Sales',         Category: 'Revenue',      Amount: 340000, Type: 'Income',  Budget: 310000 },
  { Period: '2024-02-01', Department: 'Marketing',     Category: 'Ads',          Amount: 38000,  Type: 'Expense', Budget: 45000  },
  { Period: '2024-02-01', Department: 'Operations',    Category: 'Cloud Infra',  Amount: 31000,  Type: 'Expense', Budget: 30000  },
  { Period: '2024-03-01', Department: 'Engineering',   Category: 'Salaries',     Amount: 192000, Type: 'Expense', Budget: 190000 },
  { Period: '2024-03-01', Department: 'Sales',         Category: 'Revenue',      Amount: 390000, Type: 'Income',  Budget: 350000 },
  { Period: '2024-03-01', Department: 'Marketing',     Category: 'Ads',          Amount: 55000,  Type: 'Expense', Budget: 50000  },
  { Period: '2024-03-01', Department: 'Operations',    Category: 'Cloud Infra',  Amount: 29500,  Type: 'Expense', Budget: 30000  },
  { Period: '2024-04-01', Department: 'Engineering',   Category: 'Salaries',     Amount: 192000, Type: 'Expense', Budget: 200000 },
  { Period: '2024-04-01', Department: 'Sales',         Category: 'Revenue',      Amount: 425000, Type: 'Income',  Budget: 400000 },
  { Period: '2024-04-01', Department: 'Marketing',     Category: 'Ads',          Amount: 61000,  Type: 'Expense', Budget: 55000  },
  { Period: '2024-04-01', Department: 'HR',            Category: 'Recruiting',   Amount: 22000,  Type: 'Expense', Budget: 20000  },
  { Period: '2024-05-01', Department: 'Engineering',   Category: 'Salaries',     Amount: 198000, Type: 'Expense', Budget: 200000 },
  { Period: '2024-05-01', Department: 'Sales',         Category: 'Revenue',      Amount: 480000, Type: 'Income',  Budget: 450000 },
  { Period: '2024-05-01', Department: 'Marketing',     Category: 'Ads',          Amount: 72000,  Type: 'Expense', Budget: 70000  },
  { Period: '2024-05-01', Department: 'Operations',    Category: 'Cloud Infra',  Amount: 35000,  Type: 'Expense', Budget: 32000  },
  { Period: '2024-06-01', Department: 'Engineering',   Category: 'Salaries',     Amount: 205000, Type: 'Expense', Budget: 200000 },
  { Period: '2024-06-01', Department: 'Sales',         Category: 'Revenue',      Amount: 530000, Type: 'Income',  Budget: 500000 },
  { Period: '2024-06-01', Department: 'Marketing',     Category: 'Ads',          Amount: 80000,  Type: 'Expense', Budget: 75000  },
  { Period: '2024-06-01', Department: 'HR',            Category: 'Salaries',     Amount: 65000,  Type: 'Expense', Budget: 60000  },
]

// ── 4. HR Employees Dataset ────────────────────────────────────
const hrRows = [
  { EmployeeID: 'EMP-001', Name: 'Alice Johnson', Department: 'Engineering', Role: 'Software Engineer', Salary: 95000, Status: 'Active', JoinDate: '2022-03-15', Performance: 4.5 },
  { EmployeeID: 'EMP-002', Name: 'Bob Smith', Department: 'Sales', Role: 'Account Executive', Salary: 65000, Status: 'Active', JoinDate: '2023-01-10', Performance: 3.8 },
  { EmployeeID: 'EMP-003', Name: 'Charlie Brown', Department: 'Marketing', Role: 'SEO Specialist', Salary: 58000, Status: 'Active', JoinDate: '2023-06-01', Performance: 4.2 },
  { EmployeeID: 'EMP-004', Name: 'Diana Prince', Department: 'HR', Role: 'Talent Acquisition', Salary: 62000, Status: 'Active', JoinDate: '2021-08-20', Performance: 4.8 },
  { EmployeeID: 'EMP-005', Name: 'Evan Wright', Department: 'Engineering', Role: 'DevOps Lead', Salary: 115000, Status: 'Active', JoinDate: '2020-11-05', Performance: 4.7 },
  { EmployeeID: 'EMP-006', Name: 'Fiona Gallagher', Department: 'Finance', Role: 'Accountant', Salary: 70000, Status: 'Inactive', JoinDate: '2022-05-12', Performance: 3.5 },
  { EmployeeID: 'EMP-007', Name: 'George Costanza', Department: 'Operations', Role: 'Logistics Coord', Salary: 52000, Status: 'Active', JoinDate: '2023-09-01', Performance: 3.1 },
  { EmployeeID: 'EMP-008', Name: 'Hannah Abbott', Department: 'Engineering', Role: 'QA Engineer', Salary: 72000, Status: 'Active', JoinDate: '2023-02-15', Performance: 4.0 },
  { EmployeeID: 'EMP-009', Name: 'Ian Malcolm', Department: 'Science', Role: 'Data Analyst', Salary: 88000, Status: 'Active', JoinDate: '2022-07-22', Performance: 4.6 },
  { EmployeeID: 'EMP-010', Name: 'Julia Roberts', Department: 'Marketing', Role: 'PR Manager', Salary: 78000, Status: 'Active', JoinDate: '2021-04-18', Performance: 4.3 }
]

// ── 5. Education Student Performance Dataset ───────────────────
const educationRows = [
  { StudentID: 'STU-001', Name: 'Harry Potter', Subject: 'Defense Against Dark Arts', ExamScore: 92, AttendanceRate: 98, Status: 'Passed', Term: 'Fall 2024' },
  { StudentID: 'STU-002', Name: 'Hermione Granger', Subject: 'Arithmancy', ExamScore: 100, AttendanceRate: 100, Status: 'Passed', Term: 'Fall 2024' },
  { StudentID: 'STU-003', Name: 'Ron Weasley', Subject: 'Potions', ExamScore: 68, AttendanceRate: 91, Status: 'Passed', Term: 'Fall 2024' },
  { StudentID: 'STU-004', Name: 'Draco Malfoy', Subject: 'Transfiguration', ExamScore: 85, AttendanceRate: 94, Status: 'Passed', Term: 'Fall 2024' },
  { StudentID: 'STU-005', Name: 'Neville Longbottom', Subject: 'Herbology', ExamScore: 89, AttendanceRate: 97, Status: 'Passed', Term: 'Fall 2024' },
  { StudentID: 'STU-006', Name: 'Luna Lovegood', Subject: 'Care of Magical Creatures', ExamScore: 78, AttendanceRate: 88, Status: 'Passed', Term: 'Fall 2024' },
  { StudentID: 'STU-007', Name: 'Gregory Goyle', Subject: 'History of Magic', ExamScore: 45, AttendanceRate: 82, Status: 'Failed', Term: 'Fall 2024' },
  { StudentID: 'STU-008', Name: 'Cho Chang', Subject: 'Charms', ExamScore: 91, AttendanceRate: 96, Status: 'Passed', Term: 'Fall 2024' },
  { StudentID: 'STU-009', Name: 'Cedric Diggory', Subject: 'Defense Against Dark Arts', ExamScore: 95, AttendanceRate: 99, Status: 'Passed', Term: 'Fall 2024' },
  { StudentID: 'STU-010', Name: 'Vincent Crabbe', Subject: 'Divination', ExamScore: 48, AttendanceRate: 80, Status: 'Failed', Term: 'Fall 2024' }
]

// ── 6. Healthcare Patients Dataset ────────────────────────────
const healthcareRows = [
  { PatientID: 'PT-001', Name: 'John Doe', Age: 45, Diagnosis: 'Hypertension', AdmissionDate: '2024-03-01', TreatmentCost: 2500, Doctor: 'Dr. House', Readmitted: 'No' },
  { PatientID: 'PT-002', Name: 'Jane Smith', Age: 62, Diagnosis: 'Diabetes', AdmissionDate: '2024-03-04', TreatmentCost: 4200, Doctor: 'Dr. Grey', Readmitted: 'Yes' },
  { PatientID: 'PT-003', Name: 'Bruce Wayne', Age: 38, Diagnosis: 'Trauma', AdmissionDate: '2024-03-10', TreatmentCost: 15000, Doctor: 'Dr. Strange', Readmitted: 'No' },
  { PatientID: 'PT-004', Name: 'Clark Kent', Age: 29, Diagnosis: 'Exhaustion', AdmissionDate: '2024-03-15', TreatmentCost: 1200, Doctor: 'Dr. Grey', Readmitted: 'No' },
  { PatientID: 'PT-005', Name: 'Diana Prince', Age: 30, Diagnosis: 'Influenza', AdmissionDate: '2024-03-20', TreatmentCost: 800, Doctor: 'Dr. House', Readmitted: 'No' },
  { PatientID: 'PT-006', Name: 'Peter Parker', Age: 20, Diagnosis: 'Allergy', AdmissionDate: '2024-03-22', TreatmentCost: 1500, Doctor: 'Dr. Strange', Readmitted: 'Yes' },
  { PatientID: 'PT-007', Name: 'Tony Stark', Age: 50, Diagnosis: 'Cardiac', AdmissionDate: '2024-03-28', TreatmentCost: 28000, Doctor: 'Dr. Grey', Readmitted: 'No' }
]

// ── 7. Product Inventory Dataset ──────────────────────────────
const inventoryRows = [
  { SKUID: 'SKU-101', ProductName: 'Wireless Mouse', Category: 'Accessories', StockQuantity: 150, UnitCost: 12, RetailPrice: 25, Supplier: 'TechSupply Ltd' },
  { SKUID: 'SKU-102', ProductName: 'Mechanical Keyboard', Category: 'Accessories', StockQuantity: 45, UnitCost: 45, RetailPrice: 89, Supplier: 'KeyTron Inc' },
  { SKUID: 'SKU-103', ProductName: 'USB-C Cable 2m', Category: 'Cables', StockQuantity: 300, UnitCost: 3, RetailPrice: 12, Supplier: 'TechSupply Ltd' },
  { SKUID: 'SKU-104', ProductName: '4K Monitor 27"', Category: 'Monitors', StockQuantity: 12, UnitCost: 180, RetailPrice: 299, Supplier: 'ScreenGlow' },
  { SKUID: 'SKU-105', ProductName: 'Noise Cancelling Headset', Category: 'Audio', StockQuantity: 8, UnitCost: 75, RetailPrice: 149, Supplier: 'SoundAudio' }
]

// ── 8. Marketing Campaigns Dataset ────────────────────────────
const marketingRows = [
  { CampaignID: 'MKT-01', CampaignName: 'Summer Launch', Channel: 'Social Ads', AdSpend: 5000, Clicks: 25000, Conversions: 480, RevenueGenerated: 12500 },
  { CampaignID: 'MKT-02', CampaignName: 'Black Friday Prep', Channel: 'Email Newsletter', AdSpend: 800, Clicks: 12000, Conversions: 620, RevenueGenerated: 18400 },
  { CampaignID: 'MKT-03', CampaignName: 'Holiday Clearance', Channel: 'Google Search', AdSpend: 3500, Clicks: 18000, Conversions: 310, RevenueGenerated: 9200 },
  { CampaignID: 'MKT-04', CampaignName: 'Influencer Collab', Channel: 'Influencer', AdSpend: 6000, Clicks: 35000, Conversions: 890, RevenueGenerated: 22000 }
]

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: 'retail',
    name: 'Retail Sales',
    description: '30 orders across categories, regions & products',
    icon: '🛒',
    tag: 'Sales',
    tagColor: '#6366f1',
    filename: 'sample_retail_sales.xlsx',
    headers: ['OrderID', 'Customer', 'Category', 'Product', 'Revenue', 'Quantity', 'Date', 'Region', 'Status'],
    columns_metadata: {
      OrderID:  'identifier',
      Customer: 'identifier',
      Category: 'category',
      Product:  'identifier',
      Revenue:  'metric',
      Quantity: 'metric',
      Date:     'time',
      Region:   'category',
      Status:   'category',
    },
    rows: retailRows,
  },
  {
    id: 'sales',
    name: 'SaaS Pipeline',
    description: '20 deals with MRR, ACV, rep & stage data',
    icon: '📈',
    tag: 'Sales Pipeline',
    tagColor: '#14b8a6',
    filename: 'sample_saas_pipeline.xlsx',
    headers: ['DealID', 'Company', 'Plan', 'Stage', 'MRR', 'ACV', 'Rep', 'Region', 'CloseDate'],
    columns_metadata: {
      DealID:    'identifier',
      Company:   'identifier',
      Plan:      'category',
      Stage:     'category',
      MRR:       'metric',
      ACV:       'metric',
      Rep:       'category',
      Region:    'category',
      CloseDate: 'time',
    },
    rows: salesRows,
  },
  {
    id: 'finance',
    name: 'P&L Finance',
    description: '24 monthly entries across departments & cost types',
    icon: '',
    tag: 'Finance',
    tagColor: '#f59e0b',
    filename: 'sample_finance_pl.xlsx',
    headers: ['Period', 'Department', 'Category', 'Amount', 'Type', 'Budget'],
    columns_metadata: {
      Period:     'time',
      Department: 'category',
      Category:   'category',
      Amount:     'metric',
      Type:       'category',
      Budget:     'metric',
    },
    rows: financeRows,
  },
  {
    id: 'hr',
    name: 'HR Employees',
    description: '10 employee rosters with salaries, departments & reviews',
    icon: '',
    tag: 'HR / Operations',
    tagColor: '#ec4899',
    filename: 'sample_hr_employees.xlsx',
    headers: ['EmployeeID', 'Name', 'Department', 'Role', 'Salary', 'Status', 'JoinDate', 'Performance'],
    columns_metadata: {
      EmployeeID:  'identifier',
      Name:        'identifier',
      Department:  'category',
      Role:        'category',
      Salary:      'metric',
      Status:      'category',
      JoinDate:    'time',
      Performance: 'metric',
    },
    rows: hrRows,
  },
  {
    id: 'education',
    name: 'Education Academics',
    description: '10 student grades and attendance data by term',
    icon: '',
    tag: 'Education',
    tagColor: '#8b5cf6',
    filename: 'sample_student_performance.xlsx',
    headers: ['StudentID', 'Name', 'Subject', 'ExamScore', 'AttendanceRate', 'Status', 'Term'],
    columns_metadata: {
      StudentID:      'identifier',
      Name:           'identifier',
      Subject:        'category',
      ExamScore:      'metric',
      AttendanceRate: 'metric',
      Status:         'category',
      Term:           'category',
    },
    rows: educationRows,
  },
  {
    id: 'healthcare',
    name: 'Healthcare Clinic',
    description: '7 patient records, treatment costs, and diagnoses',
    icon: '',
    tag: 'Healthcare',
    tagColor: '#ef4444',
    filename: 'sample_patient_admissions.xlsx',
    headers: ['PatientID', 'Name', 'Age', 'Diagnosis', 'AdmissionDate', 'TreatmentCost', 'Doctor', 'Readmitted'],
    columns_metadata: {
      PatientID:     'identifier',
      Name:          'identifier',
      Age:           'metric',
      Diagnosis:     'category',
      AdmissionDate: 'time',
      TreatmentCost: 'metric',
      Doctor:        'category',
      Readmitted:    'category',
    },
    rows: healthcareRows,
  },
  {
    id: 'inventory',
    name: 'Inventory Stocks',
    description: '5 SKUs, stock quantities, and retail prices',
    icon: '',
    tag: 'Inventory',
    tagColor: '#3b82f6',
    filename: 'sample_product_inventory.xlsx',
    headers: ['SKUID', 'ProductName', 'Category', 'StockQuantity', 'UnitCost', 'RetailPrice', 'Supplier'],
    columns_metadata: {
      SKUID:         'identifier',
      ProductName:   'identifier',
      Category:      'category',
      StockQuantity: 'metric',
      UnitCost:      'metric',
      RetailPrice:   'metric',
      Supplier:      'category',
    },
    rows: inventoryRows,
  },
  {
    id: 'marketing',
    name: 'Marketing Spend',
    description: '4 marketing campaigns, impressions, and conversions',
    icon: '',
    tag: 'Marketing',
    tagColor: '#10b981',
    filename: 'sample_marketing_spend.xlsx',
    headers: ['CampaignID', 'CampaignName', 'Channel', 'AdSpend', 'Clicks', 'Conversions', 'RevenueGenerated'],
    columns_metadata: {
      CampaignID:       'identifier',
      CampaignName:     'identifier',
      Channel:          'category',
      AdSpend:          'metric',
      Clicks:           'metric',
      Conversions:      'metric',
      RevenueGenerated: 'metric',
    },
    rows: marketingRows,
  },
]
