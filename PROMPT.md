# Product Rental Reservation System — Build Spec

Build a full-stack web application for managing product rentals via QR codes. A seller manually adds products through an admin panel; each product gets a unique QR code. Scanning the QR code takes anyone (seller or customer) straight to that product's booking/detail page.

## Tech Stack

- **Framework:** Next.js (App Router, TypeScript)
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth (email/password) — seller-only login, no public customer accounts needed
- **QR generation:** `qrcode` npm package, generated server-side, pointing to `https://<domain>/product/<product_id>`
- **Calendar/availability UI:** `react-day-picker`
- **Hosting target:** Vercel (with Vercel Cron for scheduled jobs)
- **Styling:** Tailwind CSS

## Core Features

### 1. Seller Admin Panel (auth-protected)
- Login screen (Supabase Auth)
- Product list view (grid/table) with search
- Add/Edit/Delete product form:
  - Name, description, features (free text or tag list)
  - Photo upload (Supabase Storage)
  - Daily rental price (optional but useful)
  - Auto-generates a unique `product_id` (UUID) and QR code on creation
- QR code display + downloadable PNG/SVG for each product (to print and stick on the physical item)

### 2. Product Detail Page (`/product/[id]`)
Reached by scanning the QR code. Shows:
  - Product name, description, features, photo
  - Availability calendar: booked days highlighted vs free days
  - List of current/past rentals: customer name, contact info, start date, end date, number of days, status (upcoming/active/completed)
  - "New booking" form: customer name + phone, start date, end date (must validate no overlap with existing bookings for that product)

### 3. Bookings / Reservations
- A booking belongs to one product, has a date range (start_date, end_date), a customer (name + phone, no account needed), and a status (`upcoming`, `active`, `completed`, `cancelled`)
- Prevent double-booking: reject overlapping date ranges for the same product
- Ability to cancel/edit a booking from the product detail page

### 4. Return-Date Notifications
- A daily scheduled job (Vercel Cron, runs once every morning) checks all bookings where `end_date` is exactly 1 day from now
- For each match, insert a row into a `notifications` table (`booking_id`, `product_id`, `message`, `is_read`, `created_at`)
- Admin panel has a notification bell icon in the header showing unread count; clicking opens a dropdown/list linking to the relevant product/booking
- Mark-as-read on click

## Data Model (Postgres / Supabase)

```sql
products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  features text[],
  photo_url text,
  daily_price numeric,
  created_at timestamptz default now()
)

bookings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  start_date date not null,
  end_date date not null,
  status text not null default 'upcoming', -- upcoming | active | completed | cancelled
  created_at timestamptz default now()
)

notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
)
```

## Non-Functional Requirements

- Single seller/tenant for now — no multi-vendor marketplace logic needed
- Mobile-friendly (QR scanning happens on phones)
- No customer accounts/login — bookings are entered by the seller or filled in by the customer without authentication
- Keep the codebase simple: no premature abstractions, no features beyond what's listed above

## Suggested Build Order

1. Next.js project scaffold + Supabase project + env config
2. DB schema (tables above) + Supabase client setup
3. Seller auth (login page, protected routes)
4. Product CRUD + QR code generation/display
5. Product detail page with availability calendar
6. Booking creation with overlap validation
7. Notifications table + Vercel Cron job + bell UI in admin panel
8. Polish: mobile responsiveness, empty states, basic error handling
