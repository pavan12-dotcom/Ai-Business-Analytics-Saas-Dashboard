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

## Documentation

For comprehensive technical specifications, developer guides, and architectural diagrams, refer to the dedicated documentation files:

- **[System Architecture & Design](docs/ARCHITECTURE.md)**: Technical architecture, client state flow, universal data parsing pipelines, and AI reasoning fallback engines.
- **[API Reference Documentation](docs/API_REFERENCE.md)**: Endpoint specifications for AI streaming (SSE), dataset management, and Stripe billing.
- **[Database Schema & Data Dictionary](docs/DATABASE_SCHEMA.md)**: Entity-relationship diagrams, PostgreSQL table definitions, and Supabase Row-Level Security (RLS) policies.
- **[Deployment & Operations Guide](docs/DEPLOYMENT_GUIDE.md)**: Production deployment instructions for Vercel, Railway, Render, and Supabase environment setup.

---

## Frontend Architecture

The frontend is a React 18 Single-Page Application built with Vite and TypeScript, engineered for interactive data manipulation and real-time visualization.

### Core Frontend Capabilities
- **Universal Multi-Format Dataset Processing**: Instantly parses CSV, Excel (`.xlsx`/`.xls`), and JSON datasets, automatically detecting metric columns, categorical dimensions, and time-series data.
- **Multi-Sheet Selector**: Allows seamless switching between worksheets in complex Excel workbooks.
- **Interactive Analytical Dashboards**: Executive KPI summaries, sparkline trend profiles, revenue timelines, and customer cohort analytics powered by Recharts.
- **AI Analyst Copilot Interface**: Real-time streaming SSE Q&A interface for interacting with Google Gemini AI.
- **Executive Reports & Audited Ledgers**: Export functionality for CSV ledgers, Excel workbooks, and formatted PDF executive decks.

---

## Backend Architecture

The backend is a Node.js Express server written in TypeScript, managing AI orchestration, persistent storage, and payment webhooks.

### Core Backend Capabilities
- **Google Gemini AI Engine**: Integrates `@google/generative-ai` SDK supporting streaming SSE responses via `/api/ai/stream`.
- **Smart Offline Fallback Engine**: Computes real-time dynamic statistics, numerical aggregates, and entity rankings directly from active dataset columns when offline or rate-limited.
- **Supabase PostgreSQL & Auth**: Authentication management, Row-Level Security (RLS) enforcement, and dataset persistence.
- **Stripe Billing Integration**: Webhook handling and subscription lifecycle tracking.

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
├── docs/                         # Documentation suite
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

### Directory Breakdown

1. **`docs/` (Documentation Suite)**
   - [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): Technical architecture, streaming pipeline design, and fallback logic.
   - [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md): REST endpoints, SSE streams, payload examples, and status codes.
   - [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md): Entity relationships, Supabase tables, and Row-Level Security policies.
   - [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md): Operational guide for Vercel, Railway, Render, and Supabase deployment.

2. **`frontend/` (React Frontend Application)**
   - `src/components/`: Modular UI component library for layout, sidebars, and workspaces.
   - `src/context/`: React Context state providers (`SpreadsheetContext`, `AuthContext`).
   - `src/pages/`: Feature views for Dashboard, Analytics, AI Copilot, Reports, Settings, and Auth.
   - `src/services/`: Client engines (`analyticsEngine`, `columnDetection`, `dataCleaner`, `kpiEngine`).

3. **`backend/` (Express API Server)**
   - `src/routes/`: Express API routers for Google Gemini AI (`ai.ts`), dataset management (`data.ts`), and Stripe (`billing.ts`).
   - `src/middleware/`: Authentication middleware verifying Supabase JWT tokens.
   - `schema*.sql`: PostgreSQL table definitions and database migration scripts.


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
