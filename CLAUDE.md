# MTH (Maju Trans Hutama) - Enterprise Fleet & ERP Management System

## System Overview & Context
This is an enterprise-grade internal ERP and Fleet Management Web Application for **MTH (Maju Trans Hutama)**.
- **Goal:** Modernize legacy Excel workflows into a high-performance, real-time admin web panel.
- **Target Audience:** Internal System Admins only (High data density, rapid keyboard-driven navigation, enterprise UI/UX).

## Tech Stack Requirements
- **Framework:** Next.js (App Router, Server Components, Server Actions).
- **Language:** TypeScript (Strict mode, zero `any` types).
- **Database & ORM:** MySQL with Prisma ORM.
- **Styling & UI Components:** Tailwind CSS, Shadcn UI, Lucide React Icons.
- **Tables & Data Grids:** TanStack Table v8 (Virtualization for 1,000+ Excel rows, column filtering, global search).
- **Excel Engine:** SheetJS (`xlsx`) for zero-latency Excel Import/Export processing.
- **State & Data Fetching:** TanStack Query v5 (React Query) for client-side caching & optimistic updates.

## Architecture & Code Quality Guidelines (Senior Developer Standards)

### 1. Performance & Zero-Freeze Navigation
- **Streaming & Suspense:** EVERY route in `app/(dashboard)/` MUST have a co-located `loading.tsx` render-ready Skeleton UI to prevent navigation freezes.
- **Data Revalidation Strategy:**
  - For static/reference tables: Use `revalidate = 3600`.
  - For real-time operational feeds (Positions, Log UJ, Maintenance): Use `export const dynamic = 'force-dynamic'` or Tag-based revalidation (`revalidateTag`).
- **Parallel Data Fetching:** Never nest async database calls sequentially. Use `Promise.all()` for fetching independent dashboard metrics or relations.

### 2. UI/UX & Design Tokens (Enterprise Class)
- **Design Aesthetic:** Clean, compact, professional business dashboard (slate/zinc palette with subtle border elevation).
- **Data Density:** Use compact padding (`py-1.5`, `px-3`), sticky table headers, and monospaced font numbers (`font-mono` / `tabular-nums`) for currency and numeric values.
- **Visual Feedback:** All async buttons MUST show loading spinners (`lucide-react` Loader2) and disabled states during execution.
- **Toasts:** Use `sonner` for crisp error/success notifications.

### 3. Database & Excel Schema Alignment
- Schema model field names must map cleanly to legacy MTH Excel headers.
- Always implement transaction blocks (`prisma.$transaction`) when importing bulk Excel records or updating cascading balances (e.g., updating UJ logs and automobile KM totals simultaneously).

### 4. File Structure Convention
src/
├── app/
│   ├── (auth)/             # Login & Session management
│   ├── (dashboard)/        # Admin layout with sidebar navigation
│   │   ├── cars/           # Fleet & STNK module
│   │   ├── positions/      # Vehicle & Driver position tracking
│   │   ├── drivers/        # Driver MTH & Payroll schedule
│   │   ├── maintenance/    # Service records & KM logs
│   │   ├── tires-oil/      # Sparepart & physical inspection logs
│   │   ├── contracts/      # Client PT contracts
│   │   ├── leasing/        # Financing & installment trackers
│   │   ├── insurance/      # Fleet insurance policies
│   │   ├── driver-logs/    # Daily UJ, OT, and Toll tracking
│   │   └── invoices/       # Tax Engine & Billing records
│   └── api/                # Specialized endpoints (Excel parsers, webhooks)
├── components/
│   ├── ui/                 # Shadcn primitives
│   ├── tables/             # Generic TanStack Table components with Excel export
│   └── dashboard/          # Summary widgets & alert system cards
├── lib/
│   ├── prisma.ts           # Singleton Prisma Client instance
│   ├── excel.ts            # Excel parser utilities
│   └── tax-calculator.ts   # DPP Nilai Lain, PPN 11%, PpH 23 2% pure functions
