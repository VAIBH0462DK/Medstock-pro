# 💊 MedStock Pro — Pharmacy Inventory Management

A full-featured SaaS pharmacy inventory app built with **React** + **Supabase**.

---

## 🗂️ Project Structure

```
medstock-pro/
├── public/
│   └── index.html
├── src/
│   ├── index.js          ← React entry point (wraps app in AuthProvider)
│   ├── App.js            ← Main app: all screens, dashboard, logic
│   ├── AuthContext.js    ← Auth state: user, shop, subscription
│   ├── supabaseClient.js ← Supabase client config
│   ├── Login.js          ← Login screen
│   └── Signup.js         ← Signup screen (creates shop + trial)
├── supabase_schema.sql   ← Full DB schema with RLS policies
├── .env.example          ← Environment variable template
└── package.json
```

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Edit `.env` and fill in your Supabase credentials:
```
REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```
Find these in: Supabase Dashboard → Project Settings → API

### 3. Set up the database
- Open your Supabase project → SQL Editor
- Paste the contents of `supabase_schema.sql` and run it
- This creates all tables, RLS policies, and indexes

### 4. Run the app
```bash
npm start
```

---

## 🔑 Features

| Feature | Description |
|---|---|
| 🔐 Auth | Supabase email/password login with session persistence |
| 💊 Medicine Master | Add/edit/delete medicines with categories, GST, pricing |
| 🛒 POS / Billing | Multi-item cart, GST calculation, printable invoice |
| 📦 Inventory | Real-time stock (purchases − sales + returns) |
| 🛍️ Purchases | Stock-in entries with batch & expiry tracking |
| 🧾 Sales History | Searchable invoice list with print support |
| ↩️ Returns | Full return by invoice number, restores stock |
| ⏰ Expiry Tracker | Color-coded expired / expiring soon / OK |
| 🔔 Reorder Alerts | Low-stock medicines below min threshold |
| 📈 Analytics | Revenue vs cost, profit trend, top medicines, payment methods |
| 👑 Super Admin | View all shops, activate/deactivate, revenue overview |
| ⏱️ Trial System | 30-day trial with banner and expiry screen |

---

## 🗄️ Database Tables

| Table | Purpose |
|---|---|
| `shop_profiles` | Shop info per user (name, address, phone, GSTIN) |
| `shop_settings` | Extended settings (mirrors shop_profiles) |
| `subscriptions` | Plan (trial/paid), status, dates |
| `super_admins` | List of super admin user IDs |
| `masters` | Medicine catalogue (name, category, pricing, GST) |
| `purchases` | Stock-in entries (batch, expiry, supplier, qty) |
| `sales` | Sale invoices with JSONB items array |

---

## 👑 Creating a Super Admin

After signing up, get your user UUID from Supabase → Auth → Users, then run:

```sql
INSERT INTO super_admins (user_id) VALUES ('your-user-uuid-here');
```

The Super Admin can see all registered shops and manage subscriptions.

---

## 🏗️ Deployment

### Vercel / Netlify
1. Push to GitHub
2. Import project in Vercel/Netlify
3. Add environment variables:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
4. Deploy!

### Build for production
```bash
npm run build
```

---

## 🔧 Tech Stack

- **React 18** — UI framework
- **Supabase** — Auth + PostgreSQL database
- **Recharts** — Analytics charts
- **CSS-in-JS** — Inline styles (no external CSS framework needed)
