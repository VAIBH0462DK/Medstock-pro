-- =====================================================
-- MedStock Pro — Verified Supabase Schema
-- Matches your ACTUAL live DB exactly (8 tables).
-- Only run this if rebuilding from scratch.
-- =====================================================

-- 1. SHOP PROFILES
CREATE TABLE IF NOT EXISTS shop_profiles (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  shop_name   TEXT NOT NULL DEFAULT 'My Shop',
  shop_email  TEXT,
  phone       TEXT,
  address     TEXT,
  city        TEXT,
  state       TEXT,
  pincode     TEXT,
  gst_number  TEXT,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. SHOP SETTINGS
-- IMPORTANT: shop_id is NOT NULL — always insert after shop_profiles
CREATE TABLE IF NOT EXISTS shop_settings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  shop_id     UUID REFERENCES shop_profiles(id) ON DELETE CASCADE NOT NULL,
  shop_name   TEXT,
  address     TEXT,
  phone       TEXT,
  email       TEXT,
  gst_number  TEXT,
  admin_pin   TEXT DEFAULT '1234',
  staff_pin   TEXT DEFAULT '0000',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. SUBSCRIPTIONS
-- IMPORTANT: shop_id is NOT NULL — trial_end defaults to now()+30days in DB
CREATE TABLE IF NOT EXISTS subscriptions (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  shop_id                   UUID REFERENCES shop_profiles(id) ON DELETE CASCADE NOT NULL,
  plan                      TEXT NOT NULL DEFAULT 'trial',
  status                    TEXT NOT NULL DEFAULT 'active',
  trial_start               TIMESTAMPTZ DEFAULT now(),
  trial_end                 TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  razorpay_customer_id      TEXT,
  razorpay_subscription_id  TEXT,
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ
);

-- 4. SUPER ADMINS
CREATE TABLE IF NOT EXISTS super_admins (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. STAFF MEMBERS
CREATE TABLE IF NOT EXISTS staff_members (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shop_id         UUID REFERENCES shop_profiles(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  role            TEXT NOT NULL DEFAULT 'staff',
  status          TEXT NOT NULL DEFAULT 'invited',
  invite_token    TEXT,
  invite_sent_at  TIMESTAMPTZ,
  joined_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 6. MEDICINE MASTERS
CREATE TABLE IF NOT EXISTS masters (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shop_id         UUID REFERENCES shop_profiles(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  category        TEXT,
  unit            TEXT DEFAULT 'pcs',
  hsn_code        TEXT,
  gst_rate        NUMERIC DEFAULT 0,
  mrp             NUMERIC DEFAULT 0,
  selling_price   NUMERIC DEFAULT 0,
  purchase_price  NUMERIC DEFAULT 0,
  min_stock       INTEGER DEFAULT 10,
  supplier_name   TEXT DEFAULT '',
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 7. PURCHASES
CREATE TABLE IF NOT EXISTS purchases (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shop_id         UUID REFERENCES shop_profiles(id) ON DELETE CASCADE NOT NULL,
  medicine_name   TEXT NOT NULL,
  category        TEXT,
  unit            TEXT,
  quantity        INTEGER NOT NULL DEFAULT 0,
  batch_no        TEXT,
  expiry_date     DATE,
  supplier_name   TEXT,
  purchase_rate   NUMERIC DEFAULT 0,
  total_amount    NUMERIC DEFAULT 0,
  purchase_date   DATE DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 8. SALES
-- NOTE: staff_name does NOT exist in live DB
-- Run the ALTER below if you want to add it
CREATE TABLE IF NOT EXISTS sales (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shop_id          UUID REFERENCES shop_profiles(id) ON DELETE CASCADE NOT NULL,
  invoice_no       TEXT NOT NULL,
  sale_date        DATE DEFAULT CURRENT_DATE,
  customer_name    TEXT,
  customer_phone   TEXT,
  payment_mode     TEXT DEFAULT 'Cash',
  items            JSONB DEFAULT '[]',
  subtotal         NUMERIC DEFAULT 0,
  discount         NUMERIC DEFAULT 0,
  gst_amount       NUMERIC DEFAULT 0,
  net_total        NUMERIC DEFAULT 0,
  is_return        BOOLEAN DEFAULT false,
  original_invoice TEXT,
  reason           TEXT,
  notes            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE shop_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins   ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE masters        ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own shop_profiles"  ON shop_profiles  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own shop_settings"  ON shop_settings  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own subscriptions"  ON subscriptions  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own staff_members"  ON staff_members  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own masters"        ON masters        FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own purchases"      ON purchases      FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own sales"          ON sales          FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "check super admin"  ON super_admins   FOR SELECT USING (auth.uid() = user_id);

-- Super Admin overrides
CREATE POLICY "superadmin view all shop_profiles"
  ON shop_profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()));

CREATE POLICY "superadmin manage subscriptions"
  ON subscriptions FOR ALL
  USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()));

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_masters_owner    ON masters(owner_id);
CREATE INDEX IF NOT EXISTS idx_masters_shop     ON masters(shop_id);
CREATE INDEX IF NOT EXISTS idx_purchases_owner  ON purchases(owner_id);
CREATE INDEX IF NOT EXISTS idx_purchases_expiry ON purchases(expiry_date);
CREATE INDEX IF NOT EXISTS idx_sales_owner      ON sales(owner_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice    ON sales(invoice_no);
CREATE INDEX IF NOT EXISTS idx_sales_date       ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_staff_owner      ON staff_members(owner_id);

-- =====================================================
-- OPTIONAL: Add staff_name to existing sales table
-- =====================================================
-- ALTER TABLE sales ADD COLUMN IF NOT EXISTS staff_name TEXT DEFAULT '';

-- =====================================================
-- Make yourself Super Admin (replace UUID):
-- INSERT INTO super_admins (user_id) VALUES ('your-uuid-here');
-- =====================================================
