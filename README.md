# SyndicSahl (سانديك ساهل) — Moroccan Apartment Building Syndic Manager MVP

A mobile-first Web App (PWA) tailored for apartment buildings (*copropriétés*) in Morocco:
- **Bilingual UI:** 1-tap switch between **Français (`FR`)** and **العربية (`AR` with RTL)**
- **WhatsApp-First (0 MAD):** Pre-filled **Darija**, **French**, and **Arabic** `wa.me` templates for digital receipts, polite arrears reminders, and group transparency updates
- **Zero-App Resident Transparency Link (`/r/[slug]`):** Neighbors see the live building treasury balance, monthly payment grid, and clickable photos of every bill/receipt without downloading an app or creating an account
- **Printable Official Receipts (`/receipt/[id]`) & AG Financial Reports**
- **Moroccan Monetization Flow:** 30-day free trial (or free forever for ≤8 lots), read-only soft-lock on expiry, **Virement Bancaire (RIB)** & **CashPlus / Wafacash** upgrade flow, and a founder `/admin` activation dashboard

---

## 1. Run Locally (Zero Setup Required)

By default, the app boots in **0-MAD Local/Demo Mode** (`localStorage`) pre-loaded with two realistic Moroccan sample buildings (**Résidence Atlas** in Casablanca and **Immeuble Majorelle** in Marrakech).

```bash
cd C:\Users\boula\.gemini\antigravity\scratch\syndic-sahl
npm run dev
```

Open:
- **Main Syndic App:** `http://localhost:3000`
- **Public Resident Transparency Portal:** `http://localhost:3000/r/residence-atlas`
- **Founder Admin Panel:** `http://localhost:3000/admin`

---

## 2. Customize Your RIB, CashPlus & Brand Name

Edit **`src/lib/config.ts`**:
- `APP_NAME` / `APP_NAME_AR`: Your brand name
- `PLANS`: Semi-annual (`700 MAD`) and Annual (`1200 MAD`) pricing
- `FOUNDER_BANK_NAME`, `FOUNDER_ACCOUNT_HOLDER`, `FOUNDER_RIB`: Your bank account details for *virement*
- `FOUNDER_CASHPLUS_NAME`: Recipient name for CashPlus / Wafacash
- `FOUNDER_WHATSAPP`: Your Moroccan WhatsApp number in international format (`"2126XXXXXXXX"`)

---

## 3. Deploy for Free (Vercel) + Connect Supabase (When Ready)

1. **Deploy Frontend (0 MAD):** Push this folder to GitHub and import it into [Vercel](https://vercel.com).
2. **Optional Cloud Database (0 MAD):**
   - Create a free project on [Supabase](https://supabase.com).
   - Paste and run **`supabase/schema.sql`** in the Supabase SQL Editor (creates all 5 tables, indexes, strict Row-Level Security policies, and the private `receipts` storage bucket).
   - Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
