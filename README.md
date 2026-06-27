# 🚀 InsightAI - AI-Powered Business Analytics SaaS Platform

A state-of-the-art, enterprise-grade Business Intelligence (BI) and Data Analytics platform powered by Google Gemini AI. **InsightAI** dynamically ingests, parses, audits, and visualizes multi-dimensional business datasets (CSV, Excel `.xlsx`/`.xls`, JSON) in real-time without rigid schemas or fixed column dependencies.

![Platform Preview](https://ai-business-analytics-saas-dashboard.vercel.app/og-preview.png)

## 🌐 Live Production Application
- **Main App**: [https://ai-business-analytics-saas-dashboard.vercel.app](https://ai-business-analytics-saas-dashboard.vercel.app)
- **Production Deployment**: [https://frontend-pkbomjqdj-business-analytics-ai.vercel.app](https://frontend-pkbomjqdj-business-analytics-ai.vercel.app)

---

## 🔥 Key Features

### 📊 1. Universal Multi-Format Dataset Processing
- **Instant Schema Resolution**: Upload any dataset (Sales, Customer Churn, Revenue, Marketing, E-commerce) and the system automatically detects primary category fields, numerical KPIs, and time-series columns.
- **Multi-Sheet Excel Support**: Seamlessly switch between multiple sheets in complex Excel workbooks via the global sheet selector.
- **Dynamic Sampling Engine**: Effortlessly handles datasets ranging from small sample sets to 100,000+ row enterprise spreadsheets using high-performance streaming sampling algorithms.

### 📈 2. Interactive Analytical Modules
- **Executive Dashboard Overview**: Real-time KPI summaries, sparkline trend profiles, channel performance distribution bars, revenue timelines, and audience mix pie charts.
- **Analytics Workspace**: Dimensional breakdown tables, categorical segment clustering, and correlation charts with multi-select column filtering.
- **Customer Intelligence**: Real-time customer lifetime value (LTV) tracking, churn probability risk scoring, and interactive cohort analysis.
- **Financial Intelligence**: Revenue growth profiling, MRR/ARR trend tracking, and budget variance accounting.

### 🧠 3. AI Analyst Copilot (Powered by Gemini AI)
- **Streaming Analytical SSE Answers**: Ask natural-language questions about your loaded data ("What is our highest revenue region?", "Show top performing campaigns").
- **Smart Offline Reasoning Engine**: Computes real dynamic statistics, numerical totals, and entity rankings directly from active dataset columns when offline or operating in demo mode.

### 📑 4. Executive Reports & Audited Ledgers
- **Instant Exporting**: One-click exports to audited CSV ledgers, formatted Excel workbooks (`.xlsx`), and clean printable PDF executive decks.
- **Automated AI Audit Flags**: Generates compliance flags, variance observations, and strategic directives tailored to uploaded data.

### 💎 5. Premium UX & Enterprise Controls
- **Global Fullscreen Presentation Mode**: One-click fullscreen toggle (`Maximize2`/`Minimize2`) for executive presentation displays.
- **Spacious Glassmorphism Design**: Curated color palettes with crystal-clear contrast across Dark Mode and Light Mode.

---

## 🛠️ Technology Stack

### Frontend Architecture
- **Framework**: React 18, Vite, TypeScript
- **State & Context**: Context API (`SpreadsheetContext`, `AuthContext`)
- **Data Visualization**: Recharts, Lucide React Icons
- **Parsing & Utilities**: XLSX (SheetJS), Canvas-Confetti, Axios

### Backend Architecture
- **Server**: Node.js, Express, TypeScript
- **AI Core**: Google Generative AI (`@google/generative-ai` - Gemini 2.5)
- **Database / Auth**: Supabase (`@supabase/supabase-js`), PostgreSQL (`pg`)
- **Payments**: Stripe Node.js SDK

---

## 📁 Repository Structure

```
Ai-Business-Analytics-Saas-Dashboard/
├── frontend/                     # React Vite Single Page Application
│   ├── src/
│   │   ├── components/           # Reusable UI components (Topbar, Sidebar, RecommendedDatasets)
│   │   ├── context/              # Global state providers (Spreadsheet, Auth)
│   │   ├── pages/                # Main feature routes (Dashboard, Analytics, Reports, AI, Billing)
│   │   ├── services/             # API client, data cleaners, audit loggers
│   │   ├── index.css             # Core design system tokens & theme variables
│   │   └── App.tsx               # Main application router
│   ├── package.json
│   └── vite.config.ts
│
└── backend/                      # Express API Server
    ├── src/
    │   ├── routes/               # API endpoints (ai.ts, data.ts, stripe.ts, auth.ts)
    │   ├── services/             # Gemini AI streaming & analytical logic
    │   └── index.ts              # Express app initialization
    └── package.json
```

---

## ⚡ Quick Start & Local Development Setup

### Prerequisites
- Node.js (v20.0.0 or higher)
- npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/pavan12-dotcom/Ai-Business-Analytics-Saas-Dashboard.git
cd Ai-Business-Analytics-Saas-Dashboard
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend application will start at `http://localhost:5173`.

### 3. Backend Setup
```bash
cd ../backend
npm install
# Create a .env file with your GEMINI_API_KEY and SUPABASE keys
npm run dev
```
The API server will start at `http://localhost:5000`.

---

## 📝 License
Distributed under the MIT License. See `LICENSE` for more information.
