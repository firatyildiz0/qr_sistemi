# Rental QR

Product rental reservation system: a seller manages products from an admin
panel, each product gets a QR code, and scanning it opens a public
booking page for that item.

## Stack

Next.js (App Router, TypeScript) · Supabase (Postgres, Auth) ·
`qrcode` · `react-day-picker` · Tailwind CSS · Vercel Cron

## Setup

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor
   — creates the tables and RLS policies.
3. In Supabase Auth, create the seller's login (Authentication → Users → Add user).
4. Copy `.env.local.example` to `.env.local` and fill in your project's URL,
   anon key, service role key, site URL, and a `CRON_SECRET`.
5. `npm install`
6. `npm run dev`

## Deploying

Deploy to Vercel and set the same environment variables there. `vercel.json`
registers a daily cron job (`/api/cron/notifications`, 07:00 UTC) that flags
bookings due back the next day; Vercel sends `Authorization: Bearer
$CRON_SECRET` automatically when `CRON_SECRET` is set as an env var.

## Structure

- `src/app/admin` — seller-only pages (product CRUD, QR codes, notifications)
- `src/app/product/[id]` — public page reached by scanning a product's QR code
- `src/app/api/cron/notifications` — daily job, called by Vercel Cron
- `src/app/api/products/[id]/qr` — QR code PNG/SVG download endpoint
- `src/proxy.ts` — session refresh + `/admin` auth guard
