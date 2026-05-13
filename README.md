# Time Tracker

A web and mobile-friendly time tracking and PTO management application for small teams. Built with Next.js 15, Supabase, and Tailwind CSS. Installable as a PWA on phones.

---

## Tech Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **UI:** shadcn/ui components (hand-rolled, no CLI dependency)
- **Backend/Database:** Supabase (Postgres + Auth + RLS)
- **Hosting:** Vercel
- **Auth:** Supabase Auth (email/password)

---

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Wait for the project to finish provisioning.

### 2. Run the Database Migration

In the Supabase dashboard, open **SQL Editor** and run the contents of:

```
supabase/migrations/001_schema.sql
```

This creates all tables, indexes, RLS policies, and default settings.

### 3. Create Your Admin Account

In the Supabase dashboard:

1. Go to **Authentication > Users > Invite user**.
2. Enter your admin email. Supabase sends a confirmation email.
3. After confirming, go to **SQL Editor** and run:

```sql
INSERT INTO public.users (id, full_name, email, role, is_active, annual_pto_hours, pto_balance, force_password_reset)
VALUES (
  '<your-auth-user-uuid>',  -- find this in Auth > Users
  'Your Name',
  'you@example.com',
  'admin',
  TRUE,
  0,
  0,
  FALSE
);
```

### 4. Set Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000   # use your production URL in Vercel
```

Find these values in your Supabase project under **Settings > API**.

> **Warning:** Never commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY` client-side. It is only used in server-side API routes.

### 5. Configure Supabase Auth Settings

In Supabase dashboard, go to **Authentication > URL Configuration**:

- Set **Site URL** to your app URL (e.g. `https://your-app.vercel.app`)
- Add `https://your-app.vercel.app/**` to **Redirect URLs**

### 6. Install Dependencies and Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo in [vercel.com](https://vercel.com).
3. Add the environment variables in the Vercel project settings.
4. Deploy.

### 8. Enable HSTS (Vercel)

HSTS is set via the `Strict-Transport-Security` header in `next.config.ts`. It activates automatically once the app is served over HTTPS.

---

## Project Structure

```
app/
  (auth)/           Login, forgot password, reset, setup
  (dashboard)/      Employee and admin pages
    admin/          Admin-only pages
  api/              API route handlers
components/
  auth/             Auth forms
  dashboard/        Employee dashboard components
  admin/            Admin components
  layout/           Navbar
  ui/               shadcn/ui components
lib/
  supabase/         Supabase clients and types
  validations/      Zod schemas
  audit.ts          Audit log helper
  utils.ts          Shared utilities
supabase/
  migrations/       SQL schema
  seed.sql          Seed instructions
```

---

## Security Notes

- All database access goes through Supabase RLS. Employees can only see their own data.
- The service role key is only used server-side in API routes. It is never sent to the client.
- Login is rate limited: 5 failures per 15 minutes locks the email, 10 in 24 hours locks the account.
- Sessions expire after 12 hours of inactivity (or 30 days with "Remember me").
- All sensitive actions are recorded in the append-only audit log.
- Input validation uses Zod on every API endpoint.
