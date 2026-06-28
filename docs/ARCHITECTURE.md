# InsightAI - System Architecture & Technical Design

This document provides a detailed breakdown of the technical architecture, dynamic data pipelines, AI reasoning fallback strategies, and security models governing the **InsightAI** platform.

---

## 1. High-Level Architecture Overview

InsightAI follows a decoupled dual-workspace architecture separating client-side state processing from server-side AI orchestration and persistent data management.

```mermaid
graph TD
    User([User / Browser]) -->|HTTPS / WSS| Frontend[React 18 + Vite SPA]
    
    subgraph Frontend Layer
        Frontend --> Context[SpreadsheetContext & AuthContext]
        Context --> Engine[Local Analytics & KPI Engines]
        Context --> Export[CSV / XLSX / PDF Exporters]
    end

    Frontend -->|REST API / SSE| Backend[Node.js Express Server]

    subgraph Backend Layer
        Backend --> AuthMW[Supabase JWT Auth Middleware]
        Backend --> AIRoute[/api/ai Router]
        Backend --> DataRoute[/api/data Router]
        Backend --> BillingRoute[/api/billing Router]
    end

    AIRoute -->|Google GenAI SDK| Gemini[Google Gemini 2.5 API]
    BillingRoute -->|Stripe SDK| Stripe[Stripe Billing & Webhooks]
    DataRoute -->|PostgreSQL Client| Supabase[(Supabase PostgreSQL Database)]
```

---

## 2. Dynamic Universal Data Parser Pipeline

InsightAI ingests structured data files without relying on hardcoded column schemas. The ingestion pipeline works as follows:

1. **Upload Handling**: Files (`.csv`, `.xlsx`, `.xls`, `.json`) are parsed in-memory via SheetJS (`xlsx`) on the frontend or backend.
2. **Column Type Detection (`columnDetection.ts`)**:
   - Analyzes column values across samples to infer data types (`metric`, `category`, `timestamp`, or `text`).
   - Handles localized numbers, currency formatting (`$`, `€`), percentages, and ISO date strings.
3. **Data Normalization (`dataCleaner.ts`)**:
   - Strips empty rows, handles missing null values, and converts numeric strings into JavaScript numbers for low-latency mathematical computations.
4. **Sampling Engine**:
   - For large datasets exceeding client memory bounds, dynamic streaming sampling algorithms isolate representative samples for real-time visualization while retaining total mathematical aggregates.

---

## 3. AI Analyst Copilot Architecture

The AI Copilot (`/api/ai`) provides intelligent data auditing and interactive Q&A.

### Real-Time Streaming SSE Pipeline
- **Server-Sent Events (SSE)**: When a user queries their data via `/api/ai/stream`, the Express backend establishes a streaming HTTP connection with `Content-Type: text-event-stream`.
- **Gemini Engine Integration**: Requests are forwarded to Google's `@google/generative-ai` SDK (cycling through `gemini-1.5-flash`, `gemini-1.5-pro`, and `gemini-2.0-flash`).
- **Context Injection**: The active dataset summary (sums, averages, distributions, and top 100 sample rows) or uploaded document text is injected directly into the system instructions prompt.

### Offline / Demo Smart Fallback Engine
If the Google Gemini API is rate-limited or operating without network connectivity:
- The backend triggers `generateSmartFallbackAnswer()`.
- This engine inspects active dataset metrics in memory, performing real-time mathematical operations (ranking top records by primary metric, aggregate sums, categorical percentage breakdowns) and generating dynamic analytical responses without relying on third-party AI services.

---

## 4. Security & Authentication Model

- **Authentication Provider**: Powered by Supabase Auth using JWT tokens passed in HTTP Authorization headers (`Bearer <token>`).
- **Guest Access Sessioning**: Supports sandbox demo sessions with temporary `guestId` identification, allowing instant exploration before creating an account.
- **Row-Level Security (RLS)**: PostgreSQL tables enforce standard Supabase RLS policies to guarantee isolation across distinct `user_id` owners.

---

## 5. Monetization & Usage Metering

- **Subscription Tiers**: Managed via Stripe Checkout and webhook synchronization (`/api/billing/webhook`).
- **Quota Tracking**: Tracks question usage limits (`questions_used`, `questions_remaining`) and trial status in `user_subscriptions` table with automated enforcement on AI routes.
