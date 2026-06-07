/**
 * sampleDatasets.ts
 * Sample datasets for instant universal demo — no upload required.
 * Each matches the format SpreadsheetContext expects.
 * programmatically generates 5000+ rows to maintain a lightweight bundle size.
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

// ── Helpers ────────────────────────────────────────────────────
const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const randomRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randomDate = (start: Date, end: Date): string => {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return date.toISOString().split('T')[0]
}

// ── 1. Retail Sales (5200 rows) ───────────────────────────────
const generateRetailRows = (): Record<string, any>[] => {
  const rows: Record<string, any>[] = []
  const categories = {
    Electronics: ['Laptop Pro', 'Wireless Earbuds', 'Tablet X', 'Smart Watch', 'Gaming Keyboard', 'Bluetooth Speaker', 'VR Headset', 'Monitor 27"'],
    Clothing: ['Winter Jacket', 'Running Shoes', 'Denim Jeans', 'Formal Shirt', 'Hoodie Classic', 'Leather Bag', 'Sports Leggings'],
    Home: ['Smart Thermostat', 'Robot Vacuum', 'Air Purifier', 'Coffee Machine', 'LED Desk Lamp', 'Smart Doorbell', 'Blender Pro', 'Plant Pot Set'],
    Sports: ['Yoga Mat', 'Dumbbell Set', 'Cycling Helmet', 'Protein Powder', 'Tennis Racket', 'Jump Rope', 'Camping Tent']
  }
  const regions = ['North', 'South', 'East', 'West']
  const statuses = ['Completed', 'Completed', 'Completed', 'Pending', 'Refunded']
  const customers = ['Emma Johnson', 'James Smith', 'Sarah Lee', 'Mike Davis', 'Anna White', 'Chris Brown', 'Olivia Taylor', 'Noah Martinez', 'Sophia Anderson', 'Liam Jackson', 'Ava Thomas', 'Mason Harris', 'Isabella Clark', 'Ethan Lewis', 'Mia Robinson', 'Lucas Walker', 'Charlotte Hall', 'Henry Allen', 'Amelia Young', 'Jack King']

  for (let i = 1; i <= 5200; i++) {
    const cat = randomChoice(Object.keys(categories) as Array<keyof typeof categories>)
    const prod = randomChoice(categories[cat])
    // Generate realistic base prices
    const basePrice = cat === 'Electronics' ? randomRange(150, 1200) : cat === 'Home' ? randomRange(50, 350) : randomRange(15, 150)
    const qty = randomChoice([1, 1, 1, 2, 2, 3])
    
    // Create an upwards trend in sales by scaling the date and prices
    const purchaseDate = randomDate(new Date(2024, 0, 1), new Date(2024, 5, 30))
    const monthIndex = new Date(purchaseDate).getMonth() // 0 to 5
    const trendMultiplier = 1 + (monthIndex * 0.08) // up to 40% growth by June
    
    rows.push({
      OrderID: `ORD-${String(i).padStart(5, '0')}`,
      Customer: randomChoice(customers),
      Category: cat,
      Product: prod,
      Revenue: Math.round(basePrice * qty * trendMultiplier),
      Quantity: qty,
      Date: purchaseDate,
      Region: randomChoice(regions),
      Status: randomChoice(statuses)
    })
  }
  return rows
}

// ── 2. SaaS Sales Pipeline (5050 rows) ─────────────────────────
const generateSalesRows = (): Record<string, any>[] => {
  const rows: Record<string, any>[] = []
  const companies = ['TechNova Inc', 'PixelCraft', 'CloudBridge', 'VortexMetrics', 'ScaleUp Labs', 'QuantumFlow', 'NexGen Analytics', 'SkyDash Corp', 'PulseTrack', 'InnovateSphere', 'BrightEdge AI', 'CoreStack', 'DataMesh', 'OmniCloud', 'Hyperion AI', 'ZenithData', 'FusionTech', 'ApexSystems', 'GlobalInsights', 'NovaLink', 'FlowState', 'SyncLogic']
  const plans = ['Free', 'Pro', 'Enterprise']
  const stages = ['Closed Won', 'Closed Won', 'Closed Won', 'Negotiation', 'Prospecting', 'Closed Lost']
  const reps = ['Alex Kim', 'Sara Liu', 'Tom Hayes', 'Emma Rose', 'Dave Miller']
  const regions = ['APAC', 'EMEA', 'NA', 'LATAM']
  const leadSources = ['Inbound Organic', 'LinkedIn Outreach', 'Google Ads', 'Product Hunt', 'Partner Referral']

  for (let i = 1; i <= 5050; i++) {
    const plan = randomChoice(plans)
    // Coherent MRR ranges based on Plan
    const mrr = plan === 'Enterprise' ? randomRange(3000, 6000) : plan === 'Pro' ? randomRange(750, 1500) : 0
    const acv = mrr * 12
    const closeDate = randomDate(new Date(2024, 0, 1), new Date(2024, 5, 30))
    
    rows.push({
      DealID: `D-${String(i).padStart(5, '0')}`,
      Company: randomChoice(companies) + ' ' + randomRange(100, 999),
      Plan: plan,
      Stage: randomChoice(stages),
      MRR: mrr,
      ACV: acv,
      LeadSource: randomChoice(leadSources),
      Region: randomChoice(regions),
      CloseDate: closeDate
    })
  }
  return rows
}

// ── 3. Finance / P&L (5100 rows) ───────────────────────────────
const generateFinanceRows = (): Record<string, any>[] => {
  const rows: Record<string, any>[] = []
  const departments = ['Engineering', 'Sales', 'Marketing', 'Operations', 'HR', 'Product', 'Design']
  const categories = {
    Expense: ['Salaries', 'Cloud Infra', 'Ads & Campaigns', 'Travel & Meals', 'Hardware Laptops', 'Office Lease', 'Recruiting', 'Legal Fees'],
    Income: ['SaaS Revenue', 'Professional Services', 'Enterprise Contracts', 'API Usage Fees']
  }

  for (let i = 1; i <= 5100; i++) {
    const txDate = randomDate(new Date(2024, 0, 1), new Date(2024, 5, 30))
    const month = new Date(txDate).getMonth()
    
    // Structure income to show a healthy growth curve, and expenses to scale moderately
    const type = randomChoice(['Expense', 'Expense', 'Expense', 'Income', 'Income'])
    const category = randomChoice(categories[type as keyof typeof categories])
    
    let amount = 0
    if (type === 'Income') {
      amount = randomRange(5000, 35000) * (1 + month * 0.12) // positive revenue trend
    } else {
      amount = category === 'Salaries' ? randomRange(8000, 15000) : randomRange(150, 8000)
    }

    rows.push({
      TransactionID: `TX-${String(i).padStart(5, '0')}`,
      Date: txDate,
      Department: randomChoice(departments),
      Category: category,
      Amount: Math.round(amount),
      Type: type,
      Account: randomChoice(['SVB Checking', 'Mercury Operating', 'Stripe Clearing'])
    })
  }
  return rows
}

// ── 4. HR Employees (5020 rows) ────────────────────────────────
const generateHRRows = (): Record<string, any>[] => {
  const rows: Record<string, any>[] = []
  const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']
  const departments = ['Engineering', 'Sales', 'Product', 'Design', 'Marketing', 'Finance', 'Operations', 'HR']
  const roles = {
    Engineering: ['Frontend Developer', 'Backend Developer', 'DevOps Specialist', 'QA Engineer', 'Tech Lead'],
    Sales: ['Account Executive', 'Sales Development Rep', 'Solutions Engineer', 'Sales Manager'],
    Product: ['Product Manager', 'Data Analyst', 'Product Director'],
    Design: ['UI/UX Designer', 'Brand Designer'],
    Marketing: ['Growth Marketer', 'Content Writer', 'SEO Manager'],
    Finance: ['Accountant', 'Finance Analyst'],
    Operations: ['Operations Manager', 'IT Specialist'],
    HR: ['HR Generalist', 'Recruiter']
  }

  for (let i = 1; i <= 5020; i++) {
    const dept = randomChoice(departments)
    const role = randomChoice(roles[dept as keyof typeof roles])
    // Generate realistic salary bounds per department
    const salary = dept === 'Engineering' ? randomRange(90000, 165000) : dept === 'Product' ? randomRange(85000, 145000) : randomRange(50000, 115000)
    rows.push({
      EmployeeID: `EMP-${String(i).padStart(5, '0')}`,
      Name: `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
      Department: dept,
      Role: role,
      Salary: salary,
      Status: randomChoice(['Active', 'Active', 'Active', 'Active', 'On Leave']),
      JoinDate: randomDate(new Date(2020, 0, 1), new Date(2024, 5, 30)),
      Rating: Number((randomRange(32, 50) / 10).toFixed(1))
    })
  }
  return rows
}

// ── 5. Marketing Spend (5000 rows) ──────────────────────────────
const generateMarketingRows = (): Record<string, any>[] => {
  const rows: Record<string, any>[] = []
  const channels = ['Google Search Ads', 'Facebook Social', 'LinkedIn B2B', 'Email Newsletter', 'YouTube Video', 'Organic SEO']

  for (let i = 1; i <= 5000; i++) {
    const channel = randomChoice(channels)
    // Correlate adSpend, clicks, conversions, and revenue for premium analytics
    const spend = channel === 'LinkedIn B2B' ? randomRange(800, 5000) : channel === 'Organic SEO' ? 0 : randomRange(100, 3000)
    const clicks = channel === 'Organic SEO' ? randomRange(1000, 5000) : Math.floor(spend / (randomRange(12, 45) / 10))
    const convRate = channel === 'Email Newsletter' ? randomRange(4, 9) : randomRange(1, 6)
    const conversions = Math.floor(clicks * (convRate / 100))
    const revenue = conversions * randomRange(50, 250)

    rows.push({
      CampaignID: `MKT-${String(i).padStart(5, '0')}`,
      Date: randomDate(new Date(2024, 0, 1), new Date(2024, 5, 30)),
      Channel: channel,
      AdSpend: spend,
      Clicks: clicks,
      Conversions: conversions,
      Revenue: revenue
    })
  }
  return rows
}

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: 'retail',
    name: 'Retail Sales',
    description: '5,200 orders across categories, regions & products',
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
    rows: generateRetailRows(),
  },
  {
    id: 'sales',
    name: 'SaaS Pipeline',
    description: '5,050 deals with plans, reps, ACV & lead sources',
    icon: '📈',
    tag: 'Sales Pipeline',
    tagColor: '#14b8a6',
    filename: 'sample_saas_pipeline.xlsx',
    headers: ['DealID', 'Company', 'Plan', 'Stage', 'MRR', 'ACV', 'LeadSource', 'Region', 'CloseDate'],
    columns_metadata: {
      DealID:     'identifier',
      Company:    'identifier',
      Plan:       'category',
      Stage:      'category',
      MRR:        'metric',
      ACV:        'metric',
      LeadSource: 'category',
      Region:     'category',
      CloseDate:  'time',
    },
    rows: generateSalesRows(),
  },
  {
    id: 'finance',
    name: 'P&L General Ledger',
    description: '5,100 transactions across departments, accounts & P&L types',
    icon: '💰',
    tag: 'Finance',
    tagColor: '#f59e0b',
    filename: 'sample_finance_pl.xlsx',
    headers: ['TransactionID', 'Date', 'Department', 'Category', 'Amount', 'Type', 'Account'],
    columns_metadata: {
      TransactionID: 'identifier',
      Date:          'time',
      Department:    'category',
      Category:      'category',
      Amount:        'metric',
      Type:          'category',
      Account:       'category',
    },
    rows: generateFinanceRows(),
  },
  {
    id: 'hr',
    name: 'HR Employees',
    description: '5,020 employee profiles with roles, salaries & ratings',
    icon: '👥',
    tag: 'HR / Operations',
    tagColor: '#ec4899',
    filename: 'sample_hr_employees.xlsx',
    headers: ['EmployeeID', 'Name', 'Department', 'Role', 'Salary', 'Status', 'JoinDate', 'Rating'],
    columns_metadata: {
      EmployeeID:  'identifier',
      Name:        'identifier',
      Department:  'category',
      Role:        'category',
      Salary:      'metric',
      Status:      'category',
      JoinDate:    'time',
      Rating:      'metric',
    },
    rows: generateHRRows(),
  },
  {
    id: 'marketing',
    name: 'Marketing Spend',
    description: '5,000 ad performance records across channels, spend & revenue',
    icon: '📢',
    tag: 'Marketing',
    tagColor: '#10b981',
    filename: 'sample_marketing_spend.xlsx',
    headers: ['CampaignID', 'Date', 'Channel', 'AdSpend', 'Clicks', 'Conversions', 'Revenue'],
    columns_metadata: {
      CampaignID:  'identifier',
      Date:        'time',
      Channel:     'category',
      AdSpend:     'metric',
      Clicks:      'metric',
      Conversions: 'metric',
      Revenue:     'metric',
    },
    rows: generateMarketingRows(),
  },
]
