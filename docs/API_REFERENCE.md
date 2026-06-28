# InsightAI - API Reference Documentation

The InsightAI backend API is built with Node.js, Express, and TypeScript. All secured endpoints require a valid Supabase Bearer token or guest identification header.

**Base URL**: `/api` (e.g., `http://localhost:5000/api` or production URL)

---

## Authentication & Headers

| Header | Type | Description |
| :--- | :--- | :--- |
| `Authorization` | `string` | `Bearer <supabase_access_token>` for authenticated users |
| `x-guest-id` | `string` | Optional guest identifier for unauthenticated demo sessions |
| `Content-Type` | `string` | `application/json` (unless uploading multipart file payloads) |

---

## 1. AI Analyst Endpoints (`/api/ai`)

### `POST /api/ai/query`
Sends a question to the AI analyst and receives a complete JSON response.

- **Request Body**:
```json
{
  "question": "What is our highest revenue region?",
  "mode": "spreadsheet" // or "document"
}
```
- **Response** (200 OK):
```json
{
  "answer": "Based on your sales dataset, the highest revenue region is North America with total sales of $45,200.",
  "demo": false,
  "engine": "gemini (gemini-1.5-flash)"
}
```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "question is required" }`
  - `403 Forbidden`: `{ "error": "trial_exhausted", "message": "Your free trial has ended..." }`

### `POST /api/ai/stream`
Establishes a Server-Sent Events (SSE) stream for real-time token-by-token answer generation.

- **Request Body**: Same as `/query`.
- **Response Stream Headers**: `Content-Type: text-event-stream`
- **Stream Event Format**:
```http
data: {"engine":"gemini (gemini-1.5-flash)","demo":false}

data: {"chunk":"Based "}

data: {"chunk":"on your data... "}

data: [DONE]
```

---

## 2. Data & Workspace Endpoints (`/api/data`)

### `GET /api/data/overview`
Retrieves aggregated KPIs, monthly revenue timelines, customer lists, active spreadsheet summaries, and subscription quotas for the dashboard.

- **Response** (200 OK):
```json
{
  "kpis": [...],
  "monthlyMetrics": [...],
  "planDistribution": [...],
  "customers": [...],
  "activeSpreadsheet": {...},
  "subscription": {
    "plan_type": "pro",
    "subscription_status": "active",
    "questions_remaining": 999999
  }
}
```

### `POST /api/data/upload`
Uploads and parses a new multi-format spreadsheet dataset.

- **Request Payload**: Multipart form-data containing `file` (`.csv`, `.xlsx`, `.xls`, `.json`).
- **Response** (200 OK): Returns parsed headers, row count, and column classifications.

### `POST /api/data/upload-document`
Uploads a document (`.pdf`, `.txt`, `.md`) for RAG-style AI documentation querying.

### `GET /api/data/audit-logs`
Fetches historical compliance and analytical action audit logs for the authenticated user workspace.

---

## 3. Billing & Subscription Endpoints (`/api/billing`)

### `POST /api/billing/checkout`
Creates a Stripe Checkout Session URL for upgrading subscription tiers.

- **Request Body**:
```json
{
  "plan": "pro" // or "enterprise"
}
```
- **Response** (200 OK):
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

### `POST /api/billing/webhook`
Handles asynchronous Stripe billing webhooks (`checkout.session.completed`) to update user customer tiers in PostgreSQL.

### `POST /api/billing/simulate-upgrade`
Simulates a instant plan upgrade for evaluation and demo purposes.

- **Request Body**: `{ "plan": "pro" }`
- **Response** (200 OK): `{ "success": true, "plan": "Pro", "mrr": 29 }`
