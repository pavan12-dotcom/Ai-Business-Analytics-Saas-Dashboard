# InsightAI - AI-Powered Business Analytics SaaS Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-blue)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.0+-green)](https://nodejs.org/)
[![Gemini AI](https://img.shields.io/badge/AI-Google_Gemini-orange)](https://deepmind.google/technologies/gemini/)

**InsightAI** is an enterprise-grade Business Intelligence (BI) and SaaS analytics platform powered by Google Gemini AI. The platform dynamically ingests, parses, audits, and visualizes multi-dimensional business datasets (CSV, Excel `.xlsx`/`.xls`, JSON) in real-time without rigid schemas or fixed column dependencies.

---

## Repository & Live Links
- **GitHub Repository**: [https://github.com/pavan12-dotcom/Ai-Business-Analytics-Saas-Dashboard](https://github.com/pavan12-dotcom/Ai-Business-Analytics-Saas-Dashboard)
- **Live Application**: [https://ai-business-analytics-saas-dashboard.vercel.app](https://ai-business-analytics-saas-dashboard.vercel.app)


---

## Detailed Documentation Index

For in-depth technical specifications, developer guides, and architectural diagrams, refer to the dedicated documentation modules:

- **[System Architecture & Design](docs/ARCHITECTURE.md)**: Deep dive into data parsing pipelines, client-side state flow, and AI reasoning fallback engines.
- **[API Reference Documentation](docs/API_REFERENCE.md)**: Complete endpoint specifications for AI streaming (SSE), dataset management, and Stripe billing.
- **[Database Schema & Data Dictionary](docs/DATABASE_SCHEMA.md)**: Entity-relationship diagrams, PostgreSQL table definitions, and Supabase RLS security policies.
- **[Deployment & Operations Guide](docs/DEPLOYMENT_GUIDE.md)**: Production deployment instructions for Vercel, Railway, Render, and Supabase environment configuration.

---

## Key Platform Features

### 1. Universal Multi-Format Dataset Processing
- **Instant Schema Resolution**: Upload any business dataset (Sales, Customer Churn, Revenue, Marketing, E-commerce) and the system automatically classifies metrics, categorical dimensions, and time-series columns.
- **Multi-Sheet Excel Support**: Seamlessly switch between multiple worksheets in complex Excel workbooks via the global sheet selector.
- **Dynamic Sampling Engine**: Effortlessly handles datasets ranging from small sample sets to large enterprise spreadsheets using high-performance streaming sampling algorithms.

### 2. Interactive Analytical Modules
- **Executive Dashboard Overview**: Real-time KPI summaries, sparkline trend profiles, channel performance distribution bars, revenue timelines, and audience mix pie charts.
- **Analytics Workspace**: Dimensional breakdown tables, categorical segment clustering, and correlation charts with multi-select column filtering.
- **Customer Intelligence**: Real-time customer lifetime value (LTV) tracking, churn probability risk scoring, and interactive cohort analysis.
- **Financial Intelligence**: Revenue growth profiling, MRR/ARR trend tracking, and budget variance accounting.

### 3. AI Analyst Copilot (Powered by Gemini AI)
- **Streaming Analytical SSE Answers**: Ask natural-language questions about your loaded data ("What is our highest revenue region?", "Show top performing campaigns").
- **Smart Offline Reasoning Engine**: Computes real dynamic statistics, numerical totals, and entity rankings directly from active dataset columns when offline or operating in demo mode.

### 4. Executive Reports & Audited Ledgers
- **Instant Exporting**: One-click exports to audited CSV ledgers, formatted Excel workbooks (`.xlsx`), and clean printable PDF executive decks.
- **Automated AI Audit Flags**: Generates compliance flags, variance observations, and strategic directives tailored to uploaded data.

---

## Technology Stack

| Domain | Stack Component |
| :--- | :--- |
| **Frontend Framework** | React 18, Vite, TypeScript |
| **State Management** | Context API (`SpreadsheetContext`, `AuthContext`) |
| **Data Visualization** | Recharts, Lucide React Icons |
| **Parsing & Utilities** | XLSX (SheetJS), Canvas-Confetti, Axios |
| **Backend Framework** | Node.js, Express, TypeScript |
| **AI Integration** | Google Generative AI (`@google/generative-ai` - Gemini 2.5 API) |
| **Database & Auth** | Supabase (`@supabase/supabase-js`), PostgreSQL (`pg`) |
| **Payments** | Stripe Node.js SDK |

---

## Repository Structure

```
Ai-Business-Analytics-Saas-Dashboard/
├── docs/                         # Detailed documentation suite
│   ├── ARCHITECTURE.md           # System architecture & data flow diagrams
│   ├── API_REFERENCE.md          # REST API & SSE streaming documentation
│   ├── DATABASE_SCHEMA.md        # Database tables & RLS security rules
│   └── DEPLOYMENT_GUIDE.md       # Production deployment instructions
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
└── backend/                      # Express API Server
    ├── src/
    │   ├── routes/               # API endpoints (ai.ts, data.ts, billing.ts)
    │   ├── middleware/           # Auth & security middleware
    │   └── index.ts              # Express app initialization
    └── package.json
```

---


## GitHub Repository Metadata & Configuration

When configuring this repository on GitHub, use the following standardized settings:

- **Repository Description**:
  > Enterprise AI-powered Business Intelligence (BI) SaaS platform built with React 18, Node.js, Express, TypeScript, Supabase PostgreSQL, and Google Gemini AI. Dynamic dataset parsing, streaming SSE analytics copilot, financial metrics engine, and executive PDF reporting.

- **Website URL**:
  `https://ai-business-analytics-saas-dashboard.vercel.app`

- **Topics / Tags**:
  `business-intelligence` • `saas` • `react` • `typescript` • `gemini-ai` • `analytics-dashboard` • `data-visualization` • `recharts` • `supabase` • `express` • `vite` • `stripe`

---

## License
Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
