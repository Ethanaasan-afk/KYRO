# KYRO — Smart billing for every business

VAT-compliant invoicing, inventory, and customer credit for businesses in the UAE.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind
- Supabase (Postgres + Auth)
- TanStack Query, react-hook-form + zod
- @react-pdf/renderer, Recharts, lucide-react

## Setup

### 1. Install

```bash
npm install
cp .env.local.example .env.local
```

Fill in Supabase keys in `.env.local`.

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL files in `supabase/migrations/` in order in the SQL Editor (001 → 039). Run `037_vat_gcc.sql`, then `038_every_business_email.sql`, then `039_security_hardening.sql`.
3. **Authentication → Providers → Email**: keep email/password enabled.
4. Sign up through the app; each signup creates its own organization.
5. In **Settings**, enter your TRN, emirate, address, and IBAN — these print on every tax invoice.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) and sign in.

### 4. Deploy

- **Vercel**: import the repo, set the same env vars, deploy.
- Point production URL in Supabase Auth → URL configuration.
- Go through the deployment checklist in [SECURITY.md](SECURITY.md).

## Roles

| Role  | Capabilities |
|-------|----------------|
| Admin | Full access: products delete, users, settings, void invoices, stock adjustments |
| Staff | Create invoices, stock in/out, customers, view catalog — cannot manage users or void without admin |

## Invoice numbers

Format: `KY/2026-27/0001` (prefix + financial year + sequence). Existing businesses keep the prefix they already use. Sequences never reuse numbers even if an invoice is voided.

## VAT

Country rules live in `src/lib/vat/countries.ts` (UAE enabled; Saudi Arabia, Bahrain and Oman staged). The engine is `src/lib/vat.ts`.

- UAE standard rate 5%; each product is **standard**, **zero-rated** or **exempt**
- Prices can be entered exclusive or inclusive of VAT (org default in Settings, toggle per invoice)
- VAT is rounded per line to 2 decimals (fils); no rounding to whole dirhams
- Tax invoices show supplier and customer TRN, VAT per line, and a VAT summary by rate
- Reports → **VAT Return (VAT 201)**: standard-rated supplies by emirate, zero-rated, exempt, input VAT from purchases, net payable — exported to Excel

Invoices issued before the VAT switch keep their stored GST amounts and are stamped `INR`; they still display in rupees and are excluded from AED VAT returns.

Run the checks:

```bash
npx tsx src/lib/vat.test.ts
```

```bash
npx tsx src/lib/vat-reports.test.ts
```

```bash
npx tsx src/lib/insights.test.ts
```

## Every kind of business

16 trades are built in (`src/lib/business-types.ts`): grocery, fruit & vegetables, restaurants, mobile shops, pharmacies, clothing, perfumes, hardware & building materials, furniture & appliances, auto parts, wholesale, salons, freelancers, jewellery, hotels and a general mode. Each one brings:

- **Units** (`src/lib/units.ts`): kg, g, L, ml, m, sq m, box, carton, bunch, hour, night… Weight, volume and length units take decimal quantities (1.25 kg); pieces stay whole. Stock moves by the same amount.
- **Categories with subcategories**: a built-in tree per trade plus the shop's own (`product_categories` table, Products → Categories).
- **Invoice line fields** where they matter: IMEI/serial numbers, batches, vehicle plates, sizes, room nights.

## Email invoices

Invoices (one, many at once, or payment reminders) are emailed with the PDF attached and a secure download link. Set `RESEND_API_KEY` and `EMAIL_FROM` (a domain verified in [Resend](https://resend.com)) to send in one click; without them, Email opens the user's own mail app with the PDF link. Every send is logged in `invoice_emails`.

## Modules

- `/` Website (pricing, how it works, contact)
- `/dashboard` Today's sales, monthly goal, billing streak, money to collect, VAT set-aside
- `/products` Catalog + detail + price history
- `/inventory` Stock levels + movement log
- `/customers` Customer master with TRN
- `/invoices` List + `/invoices/new` billing wizard + PDF
- `/reports` VAT 201 summary + sales / stock / VAT CSV export
- `/settings` Company letterhead, TRN, VAT defaults (admin)
- `/users` Create staff accounts (admin)

## Brand

Logo source artwork is in `assets/brand/`. Regenerate the logo files, favicons and app icons with:

```bash
node scripts/generate-brand-icons.mjs
```

## Security

See [SECURITY.md](SECURITY.md) for how KYRO is protected and what to configure before going live.
