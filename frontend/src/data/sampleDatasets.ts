/**
 * sampleDatasets.ts
 * Sample datasets for instant universal demo — no upload required.
 * Each matches the format SpreadsheetContext expects.
 * Programmatically generates 15,000–20,000 rows with rich business features.
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
const rng = (() => {
  let seed = 42
  return () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    return ((seed >>> 0) / 0xffffffff)
  }
})()

const randomChoice = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]
const randomRange = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min
const randomFloat = (min: number, max: number, decimals = 2) =>
  parseFloat((rng() * (max - min) + min).toFixed(decimals))
const randomDate = (start: Date, end: Date): string => {
  const date = new Date(start.getTime() + rng() * (end.getTime() - start.getTime()))
  return date.toISOString().split('T')[0]
}

// ── 1. Retail Sales (18,000 rows) ─────────────────────────────
const generateRetailRows = (): Record<string, any>[] => {
  const rows: Record<string, any>[] = []
  const categories = {
    Electronics: ['Laptop Pro', 'Wireless Earbuds', 'Tablet X', 'Smart Watch', 'Gaming Keyboard', 'Bluetooth Speaker', 'VR Headset', 'Monitor 27"', '4K Webcam', 'SSD Drive 1TB', 'Smart TV 55"'],
    Clothing:    ['Winter Jacket', 'Running Shoes', 'Denim Jeans', 'Formal Shirt', 'Hoodie Classic', 'Leather Bag', 'Sports Leggings', 'Puffer Vest', 'Wool Sweater', 'Canvas Sneakers'],
    Home:        ['Smart Thermostat', 'Robot Vacuum', 'Air Purifier', 'Coffee Machine', 'LED Desk Lamp', 'Smart Doorbell', 'Blender Pro', 'Plant Pot Set', 'Weighted Blanket', 'Shower Filter'],
    Sports:      ['Yoga Mat', 'Dumbbell Set', 'Cycling Helmet', 'Protein Powder', 'Tennis Racket', 'Jump Rope', 'Camping Tent', 'Resistance Bands', 'Trail Running Shoes', 'Hydration Pack'],
    Beauty:      ['Vitamin C Serum', 'Collagen Cream', 'Electric Toothbrush', 'Perfume Luxe', 'Shampoo Pro', 'Mascara Ultra', 'Lip Palette'],
    Books:       ['Business Strategy 2024', 'AI & Machine Learning', 'The Growth Mindset', 'Python Deep Dive', 'Marketing Mastery'],
  }
  const regions = ['North', 'South', 'East', 'West', 'Central']
  const statuses = ['Completed', 'Completed', 'Completed', 'Completed', 'Pending', 'Refunded', 'Cancelled']
  const segments = ['VIP', 'Regular', 'Regular', 'Regular', 'New', 'New', 'Wholesale']
  const paymentMethods = ['Credit Card', 'Credit Card', 'Credit Card', 'PayPal', 'Debit Card', 'Buy Now Pay Later', 'Crypto', 'Bank Transfer']
  const channels = ['Online', 'Online', 'Online', 'Store', 'Store', 'Mobile App', 'Phone']
  const customers = [
    'Emma Johnson','James Smith','Sarah Lee','Mike Davis','Anna White','Chris Brown','Olivia Taylor',
    'Noah Martinez','Sophia Anderson','Liam Jackson','Ava Thomas','Mason Harris','Isabella Clark',
    'Ethan Lewis','Mia Robinson','Lucas Walker','Charlotte Hall','Henry Allen','Amelia Young',
    'Jack King','Grace Scott','Daniel Green','Zoe Adams','Benjamin Wright','Chloe Turner',
    'Sebastian Parker','Lily Evans','Owen Rivera','Aria Collins','Aiden Mitchell',
  ]

  for (let i = 1; i <= 18000; i++) {
    const cat = randomChoice(Object.keys(categories) as Array<keyof typeof categories>)
    const prod = randomChoice(categories[cat])
    const basePrice = cat === 'Electronics' ? randomRange(80, 1400)
      : cat === 'Home' ? randomRange(30, 400)
      : cat === 'Beauty' ? randomRange(15, 180)
      : cat === 'Books' ? randomRange(12, 45)
      : randomRange(15, 180)

    const qty = randomChoice([1, 1, 1, 2, 2, 3, 4])
    const purchaseDate = randomDate(new Date(2023, 0, 1), new Date(2024, 11, 31))
    const monthIndex = new Date(purchaseDate).getMonth()
    const yearIndex = new Date(purchaseDate).getFullYear() === 2024 ? 1 : 0
    const trendMultiplier = 1 + (monthIndex * 0.04) + (yearIndex * 0.3)
    const discountPct = randomChoice([0, 0, 0, 5, 10, 15, 20, 25])
    const revenue = Math.round(basePrice * qty * trendMultiplier)
    const cost = Math.round(revenue * randomFloat(0.35, 0.65))
    const profit = revenue - cost - Math.round(revenue * discountPct / 100)

    rows.push({
      OrderID:       `ORD-${String(i).padStart(6, '0')}`,
      Customer:      randomChoice(customers),
      Category:      cat,
      Product:       prod,
      Revenue:       revenue,
      Cost:          cost,
      Profit:        profit,
      Quantity:      qty,
      DiscountPct:   discountPct,
      Date:          purchaseDate,
      Region:        randomChoice(regions),
      Status:        randomChoice(statuses),
      CustomerSegment: randomChoice(segments),
      PaymentMethod: randomChoice(paymentMethods),
      Channel:       randomChoice(channels),
    })
  }
  return rows
}

// ── 2. SaaS Sales Pipeline (16,000 rows) ───────────────────────
const generateSalesRows = (): Record<string, any>[] => {
  const rows: Record<string, any>[] = []
  const companies = [
    'TechNova Inc','PixelCraft','CloudBridge','VortexMetrics','ScaleUp Labs','QuantumFlow',
    'NexGen Analytics','SkyDash Corp','PulseTrack','InnovateSphere','BrightEdge AI','CoreStack',
    'DataMesh','OmniCloud','Hyperion AI','ZenithData','FusionTech','ApexSystems','GlobalInsights',
    'NovaLink','FlowState','SyncLogic','AlphaMetrics','BetaAnalytics','ClearPath','DeltaOps',
    'EchoPlatform','FogCompute','GridMind','HorizonAI',
  ]
  const plans = ['Free', 'Starter', 'Pro', 'Pro', 'Enterprise', 'Enterprise']
  const stages = ['Closed Won', 'Closed Won', 'Closed Won', 'Negotiation', 'Prospecting', 'Demo Done', 'Qualified', 'Closed Lost']
  const reps = ['Alex Kim', 'Sara Liu', 'Tom Hayes', 'Emma Rose', 'Dave Miller', 'Priya Patel', 'James Ford', 'Lily Zhang']
  const regions = ['APAC', 'EMEA', 'NA', 'LATAM', 'MEA']
  const leadSources = ['Inbound Organic', 'LinkedIn Outreach', 'Google Ads', 'Product Hunt', 'Partner Referral', 'Cold Email', 'Webinar', 'Event / Conference']
  const industries = ['SaaS', 'FinTech', 'HealthTech', 'E-commerce', 'Retail', 'Manufacturing', 'Logistics', 'Education', 'Media', 'Real Estate']
  const churnRisks = ['Low', 'Low', 'Low', 'Medium', 'Medium', 'High']

  for (let i = 1; i <= 16000; i++) {
    const plan = randomChoice(plans)
    const mrr = plan === 'Enterprise' ? randomRange(2500, 8000)
      : plan === 'Pro' ? randomRange(500, 2000)
      : plan === 'Starter' ? randomRange(99, 499)
      : 0
    const acv = mrr * 12
    const closeDate = randomDate(new Date(2023, 0, 1), new Date(2024, 11, 31))
    const dealAgeDays = randomRange(3, 180)
    const npsScore = mrr > 2000 ? randomRange(8, 10) : randomRange(4, 10)
    const stage = randomChoice(stages)
    const winProb = stage === 'Closed Won' ? 100
      : stage === 'Negotiation' ? randomRange(60, 85)
      : stage === 'Demo Done' ? randomRange(35, 60)
      : stage === 'Qualified' ? randomRange(20, 40)
      : stage === 'Prospecting' ? randomRange(5, 25)
      : 0

    rows.push({
      DealID:       `D-${String(i).padStart(6, '0')}`,
      Company:      randomChoice(companies) + ' ' + randomRange(100, 999),
      Plan:         plan,
      Stage:        stage,
      MRR:          mrr,
      ACV:          acv,
      WinProb:      winProb,
      DealAgeDays:  dealAgeDays,
      LeadSource:   randomChoice(leadSources),
      Region:       randomChoice(regions),
      SalesRep:     randomChoice(reps),
      Industry:     randomChoice(industries),
      NPS:          npsScore,
      ChurnRisk:    randomChoice(churnRisks),
      CloseDate:    closeDate,
    })
  }
  return rows
}

// ── 3. Finance / P&L (17,000 rows) ─────────────────────────────
const generateFinanceRows = (): Record<string, any>[] => {
  const rows: Record<string, any>[] = []
  const departments = ['Engineering', 'Sales', 'Marketing', 'Operations', 'HR', 'Product', 'Design', 'Finance', 'Legal', 'Customer Success']
  const expenseCategories = ['Salaries', 'Cloud Infra', 'Ads & Campaigns', 'Travel & Meals', 'Hardware / Laptops', 'Office Lease', 'Recruiting', 'Legal Fees', 'Contractor Fees', 'Software Licenses', 'Training', 'R&D']
  const incomeCategories = ['SaaS Revenue', 'Professional Services', 'Enterprise Contracts', 'API Usage Fees', 'Support Contracts', 'Marketplace Revenue']
  const costCenters = ['CC-101', 'CC-102', 'CC-103', 'CC-104', 'CC-201', 'CC-202', 'CC-301', 'CC-302']
  const approvalStatuses = ['Approved', 'Approved', 'Approved', 'Pending', 'Rejected', 'Under Review']
  const accounts = ['SVB Checking', 'Mercury Operating', 'Stripe Clearing', 'Chase Business', 'Silicon Valley Bank']

  for (let i = 1; i <= 17000; i++) {
    const txDate = randomDate(new Date(2023, 0, 1), new Date(2024, 11, 31))
    const month = new Date(txDate).getMonth()
    const yearMult = new Date(txDate).getFullYear() === 2024 ? 1.25 : 1
    const type = randomChoice(['Expense', 'Expense', 'Expense', 'Income', 'Income'])
    const category = type === 'Income' ? randomChoice(incomeCategories) : randomChoice(expenseCategories)

    let amount = 0
    if (type === 'Income') {
      amount = Math.round(randomRange(3000, 45000) * (1 + month * 0.09) * yearMult)
    } else {
      amount = category === 'Salaries' ? randomRange(7000, 18000)
        : category === 'Cloud Infra' ? randomRange(2000, 15000)
        : category === 'Ads & Campaigns' ? randomRange(1000, 25000)
        : category === 'Office Lease' ? randomRange(8000, 30000)
        : randomRange(150, 8500)
    }

    const budget = Math.round(amount * randomFloat(0.80, 1.25))
    const variance = amount - budget
    const variancePct = parseFloat(((variance / budget) * 100).toFixed(1))

    rows.push({
      TransactionID:  `TX-${String(i).padStart(6, '0')}`,
      Date:           txDate,
      Department:     randomChoice(departments),
      Category:       category,
      Amount:         amount,
      Budget:         budget,
      Variance:       variance,
      VariancePct:    variancePct,
      Type:           type,
      CostCenter:     randomChoice(costCenters),
      Account:        randomChoice(accounts),
      ApprovalStatus: randomChoice(approvalStatuses),
    })
  }
  return rows
}

// ── 4. HR Employees (15,500 rows) ──────────────────────────────
const generateHRRows = (): Record<string, any>[] => {
  const rows: Record<string, any>[] = []
  const firstNames = ['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda','William','Elizabeth','David','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen','Sophia','Ethan','Isabella','Oliver','Ava','Noah','Mia','Liam','Emma','Lucas']
  const lastNames = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Patel','Kim','Chen','Nguyen','Ramirez','White','Harris','Clark','Lewis']
  const departments = ['Engineering', 'Sales', 'Product', 'Design', 'Marketing', 'Finance', 'Operations', 'HR', 'Legal', 'Customer Success']
  const roles = {
    Engineering:      ['Frontend Developer', 'Backend Developer', 'DevOps Engineer', 'QA Engineer', 'Tech Lead', 'Data Engineer', 'ML Engineer', 'Platform Engineer'],
    Sales:            ['Account Executive', 'Sales Development Rep', 'Solutions Engineer', 'Sales Manager', 'VP of Sales'],
    Product:          ['Product Manager', 'Data Analyst', 'Product Director', 'Business Analyst'],
    Design:           ['UI/UX Designer', 'Brand Designer', 'Product Designer'],
    Marketing:        ['Growth Marketer', 'Content Writer', 'SEO Manager', 'Demand Gen Manager'],
    Finance:          ['Accountant', 'Finance Analyst', 'Controller', 'FP&A Manager'],
    Operations:       ['Operations Manager', 'IT Specialist', 'Procurement Manager'],
    HR:               ['HR Generalist', 'Recruiter', 'L&D Manager', 'HRBP'],
    Legal:            ['Legal Counsel', 'Compliance Officer'],
    'Customer Success': ['CS Manager', 'Onboarding Specialist', 'Support Engineer'],
  }
  const locations = ['San Francisco', 'New York', 'Austin', 'London', 'Berlin', 'Toronto', 'Singapore', 'Remote']
  const statuses = ['Active', 'Active', 'Active', 'Active', 'On Leave', 'Contractor']
  const educationLevels = ["Bachelor's", "Master's", "PhD", "Associate's", 'Self-Taught', 'Bootcamp']

  for (let i = 1; i <= 15500; i++) {
    const dept = randomChoice(departments)
    const role = randomChoice(roles[dept as keyof typeof roles])
    const salary = dept === 'Engineering' ? randomRange(85000, 185000)
      : dept === 'Product' ? randomRange(90000, 160000)
      : dept === 'Design' ? randomRange(75000, 135000)
      : dept === 'Sales' ? randomRange(65000, 145000)
      : dept === 'Legal' ? randomRange(100000, 200000)
      : dept === 'Finance' ? randomRange(80000, 155000)
      : randomRange(50000, 120000)
    const tenureMonths = randomRange(1, 96)
    const perfRating = randomFloat(1.0, 5.0, 1)
    const bonusPct = perfRating >= 4.5 ? randomRange(15, 25)
      : perfRating >= 3.5 ? randomRange(8, 15)
      : randomRange(0, 8)
    const bonus = Math.round(salary * bonusPct / 100)
    const trainingHrs = randomRange(0, 80)

    rows.push({
      EmployeeID:    `EMP-${String(i).padStart(6, '0')}`,
      Name:          `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
      Department:    dept,
      Role:          role,
      Salary:        salary,
      Bonus:         bonus,
      BonusPct:      bonusPct,
      TenureMonths:  tenureMonths,
      PerfRating:    perfRating,
      TrainingHrs:   trainingHrs,
      Status:        randomChoice(statuses),
      Location:      randomChoice(locations),
      Education:     randomChoice(educationLevels),
      JoinDate:      randomDate(new Date(2019, 0, 1), new Date(2024, 11, 31)),
    })
  }
  return rows
}

// ── 5. Marketing Spend (16,500 rows) ─────────────────────────────
const generateMarketingRows = (): Record<string, any>[] => {
  const rows: Record<string, any>[] = []
  const channels = ['Google Search Ads', 'Facebook Social', 'LinkedIn B2B', 'Email Newsletter', 'YouTube Video', 'Organic SEO', 'TikTok Ads', 'Affiliate', 'Podcast Sponsorship', 'Display Network']
  const campaignTypes = ['Awareness', 'Retargeting', 'Lead Gen', 'Brand', 'Product Launch', 'Seasonal']
  const audiences = ['Enterprise B2B', 'SMB', 'Consumer', 'Developers', 'Students', 'Healthcare']
  const countries = ['United States', 'United Kingdom', 'Germany', 'India', 'Canada', 'Australia', 'France', 'Brazil', 'Japan', 'Singapore']
  const statuses = ['Active', 'Active', 'Active', 'Paused', 'Completed', 'Draft']

  for (let i = 1; i <= 16500; i++) {
    const channel = randomChoice(channels)
    const spend = channel === 'LinkedIn B2B' ? randomRange(500, 8000)
      : channel === 'Organic SEO' ? 0
      : channel === 'Podcast Sponsorship' ? randomRange(2000, 12000)
      : channel === 'YouTube Video' ? randomRange(800, 6000)
      : randomRange(100, 4000)
    const clicks = channel === 'Organic SEO' ? randomRange(800, 8000) : Math.floor(spend / randomFloat(1.2, 5.5))
    const impressions = clicks * randomRange(10, 80)
    const convRate = channel === 'Email Newsletter' ? randomFloat(3, 9)
      : channel === 'LinkedIn B2B' ? randomFloat(2, 6)
      : randomFloat(0.5, 5)
    const conversions = Math.floor(clicks * (convRate / 100))
    const revenue = conversions * randomRange(40, 350)
    const roi = spend > 0 ? parseFloat(((revenue - spend) / spend * 100).toFixed(1)) : 0
    const cpl = conversions > 0 ? parseFloat((spend / conversions).toFixed(2)) : 0
    const ctr = impressions > 0 ? parseFloat((clicks / impressions * 100).toFixed(2)) : 0

    rows.push({
      CampaignID:   `MKT-${String(i).padStart(6, '0')}`,
      Date:         randomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
      Channel:      channel,
      CampaignType: randomChoice(campaignTypes),
      Audience:     randomChoice(audiences),
      Country:      randomChoice(countries),
      AdSpend:      spend,
      Impressions:  impressions,
      Clicks:       clicks,
      CTR:          ctr,
      Conversions:  conversions,
      Revenue:      revenue,
      ROI:          roi,
      CPL:          cpl,
      Status:       randomChoice(statuses),
    })
  }
  return rows
}

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: 'retail',
    name: 'Retail Sales',
    description: '18,000 orders across categories, regions, segments & channels',
    icon: '🛒',
    tag: 'Sales',
    tagColor: '#6366f1',
    filename: 'sample_retail_sales.xlsx',
    headers: ['OrderID','Customer','Category','Product','Revenue','Cost','Profit','Quantity','DiscountPct','Date','Region','Status','CustomerSegment','PaymentMethod','Channel'],
    columns_metadata: {
      OrderID:         'identifier',
      Customer:        'identifier',
      Category:        'category',
      Product:         'identifier',
      Revenue:         'metric',
      Cost:            'metric',
      Profit:          'metric',
      Quantity:        'metric',
      DiscountPct:     'metric',
      Date:            'time',
      Region:          'category',
      Status:          'category',
      CustomerSegment: 'category',
      PaymentMethod:   'category',
      Channel:         'category',
    },
    rows: generateRetailRows(),
  },
  {
    id: 'sales',
    name: 'SaaS Pipeline',
    description: '16,000 deals with plans, reps, ACV, churn risk & NPS',
    icon: '📈',
    tag: 'Sales Pipeline',
    tagColor: '#14b8a6',
    filename: 'sample_saas_pipeline.xlsx',
    headers: ['DealID','Company','Plan','Stage','MRR','ACV','WinProb','DealAgeDays','LeadSource','Region','SalesRep','Industry','NPS','ChurnRisk','CloseDate'],
    columns_metadata: {
      DealID:      'identifier',
      Company:     'identifier',
      Plan:        'category',
      Stage:       'category',
      MRR:         'metric',
      ACV:         'metric',
      WinProb:     'metric',
      DealAgeDays: 'metric',
      LeadSource:  'category',
      Region:      'category',
      SalesRep:    'category',
      Industry:    'category',
      NPS:         'metric',
      ChurnRisk:   'category',
      CloseDate:   'time',
    },
    rows: generateSalesRows(),
  },
  {
    id: 'finance',
    name: 'P&L General Ledger',
    description: '17,000 transactions with budget, variance & approval tracking',
    icon: '💰',
    tag: 'Finance',
    tagColor: '#f59e0b',
    filename: 'sample_finance_pl.xlsx',
    headers: ['TransactionID','Date','Department','Category','Amount','Budget','Variance','VariancePct','Type','CostCenter','Account','ApprovalStatus'],
    columns_metadata: {
      TransactionID:  'identifier',
      Date:           'time',
      Department:     'category',
      Category:       'category',
      Amount:         'metric',
      Budget:         'metric',
      Variance:       'metric',
      VariancePct:    'metric',
      Type:           'category',
      CostCenter:     'category',
      Account:        'category',
      ApprovalStatus: 'category',
    },
    rows: generateFinanceRows(),
  },
  {
    id: 'hr',
    name: 'HR Employees',
    description: '15,500 employee profiles with salary, bonus, rating & tenure',
    icon: '👥',
    tag: 'HR / Operations',
    tagColor: '#ec4899',
    filename: 'sample_hr_employees.xlsx',
    headers: ['EmployeeID','Name','Department','Role','Salary','Bonus','BonusPct','TenureMonths','PerfRating','TrainingHrs','Status','Location','Education','JoinDate'],
    columns_metadata: {
      EmployeeID:   'identifier',
      Name:         'identifier',
      Department:   'category',
      Role:         'category',
      Salary:       'metric',
      Bonus:        'metric',
      BonusPct:     'metric',
      TenureMonths: 'metric',
      PerfRating:   'metric',
      TrainingHrs:  'metric',
      Status:       'category',
      Location:     'category',
      Education:    'category',
      JoinDate:     'time',
    },
    rows: generateHRRows(),
  },
  {
    id: 'marketing',
    name: 'Marketing Spend',
    description: '16,500 campaigns with ROI, CTR, CPL & channel performance',
    icon: '📢',
    tag: 'Marketing',
    tagColor: '#10b981',
    filename: 'sample_marketing_spend.xlsx',
    headers: ['CampaignID','Date','Channel','CampaignType','Audience','Country','AdSpend','Impressions','Clicks','CTR','Conversions','Revenue','ROI','CPL','Status'],
    columns_metadata: {
      CampaignID:   'identifier',
      Date:         'time',
      Channel:      'category',
      CampaignType: 'category',
      Audience:     'category',
      Country:      'category',
      AdSpend:      'metric',
      Impressions:  'metric',
      Clicks:       'metric',
      CTR:          'metric',
      Conversions:  'metric',
      Revenue:      'metric',
      ROI:          'metric',
      CPL:          'metric',
      Status:       'category',
    },
    rows: generateMarketingRows(),
  },
]
