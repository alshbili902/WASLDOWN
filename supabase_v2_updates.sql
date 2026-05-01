-- 1. إنشاء جدول profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  telegram_id BIGINT UNIQUE,
  telegram_username TEXT,
  plan_type TEXT DEFAULT 'free',
  is_subscribed BOOLEAN DEFAULT FALSE,
  subscription_end TIMESTAMPTZ,
  trial_used INT DEFAULT 0,
  trial_limit INT DEFAULT 10,
  points INT DEFAULT 0,
  total_downloads INT DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- نقل البيانات القديمة (إن وجدت)
INSERT INTO public.profiles (telegram_id, telegram_username, full_name, plan_type, is_subscribed, subscription_end, trial_used, trial_limit, points, total_downloads, referral_code, referred_by)
SELECT telegram_id, username, first_name, plan_type, is_subscribed, subscription_end, trial_used, trial_limit, points, total_downloads, referral_code, referred_by
FROM public.users
ON CONFLICT (telegram_id) DO NOTHING;

-- 2. إنشاء جدول أكواد الربط
CREATE TABLE IF NOT EXISTS public.linking_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id),
  code TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. إنشاء جدول سجل العمليات
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id),
  telegram_id BIGINT,
  source TEXT, -- 'bot' or 'web'
  action_type TEXT,
  status TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- تعديل توليد الإحالة للجدول الجديد
CREATE OR REPLACE FUNCTION generate_referral_code_profiles()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := 'ref' || substr(md5(random()::text), 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_referral_code_prof ON public.profiles;
CREATE TRIGGER set_referral_code_prof
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION generate_referral_code_profiles();
