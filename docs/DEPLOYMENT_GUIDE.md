# InsightAI - Deployment & Operations Guide

This guide details step-by-step instructions for deploying InsightAI across cloud infrastructure platforms including Vercel, Railway, Render, and Supabase.

---

## 1. Prerequisites & Environment Setup

Ensure you have admin access to:
- A GitHub repository hosting the project.
- A Supabase Project (PostgreSQL database + Auth).
- Google AI Studio (for `GEMINI_API_KEY`).
- Stripe Developer Dashboard (optional, for billing handling).

---

## 2. Supabase Provisioning

1. Log into your Supabase Dashboard and create a new project.
2. Navigate to the **SQL Editor**.
3. Execute the schema initialization scripts in order:
   - `backend/schema.sql`
   - `backend/schema_migration.sql`
   - `backend/schema_v2.sql`
   - `backend/schema_v3.sql`
   - `backend/schema_v4.sql`
4. Copy your project URL (`SUPABASE_URL`) and anon/service keys (`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

---

## 3. Frontend Deployment (Vercel)

The frontend is a React Vite Single-Page Application configured via `frontend/vercel.json`.

1. Connect your GitHub repository to Vercel.
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite**.
4. Configure Environment Variables:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
   - `VITE_API_URL`: Your deployed backend API URL (e.g., `https://your-backend.railway.app/api`).
5. Click **Deploy**.

---

## 4. Backend Deployment (Railway / Render / Vercel Serverless)

The backend is an Express Node.js application (`backend/`).

### Deploying to Railway
1. Create a new service from your GitHub repo.
2. Select root directory as `backend`.
3. Set Build Command: `npm install && npm run build`
4. Set Start Command: `npm start` (or `node dist/index.js`)
5. Add Environment Variables in Railway settings:
   - `PORT`: `5000` (or Railway dynamic `$PORT`)
   - `FRONTEND_URL`: `https://your-frontend.vercel.app`
   - `GEMINI_API_KEY`: Google Gemini API key.
   - `SUPABASE_URL`: Supabase Project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key.
   - `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET` (Optional for payments).

---

## 5. Environment Variables Matrix

### Backend (`backend/.env`)

| Variable | Required | Description |
| :--- | :--- | :--- |
| `PORT` | Yes | API server listening port (default: `5000`) |
| `FRONTEND_URL` | Yes | Allowed CORS origin URL |
| `GEMINI_API_KEY` | Yes | Google AI Studio Gemini API Key |
| `SUPABASE_URL` | Yes | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase admin key for secure operations |
| `STRIPE_SECRET_KEY` | No | Stripe secret key for subscriptions |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook endpoint verification secret |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | Yes | Base URL of backend API |
| `VITE_SUPABASE_URL` | Yes | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase client anon public key |
