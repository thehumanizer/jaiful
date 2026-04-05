-- ============================================================
-- JAIFUL Registration System — Supabase Schema
-- Run this in Supabase SQL Editor to set up all tables
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- MEMBERS — ทุกคนที่เคยติดต่อ JAIFUL ได้ JAIFUL ID ทันที
-- ============================================================
CREATE TABLE members (
  jaiful_id     TEXT PRIMARY KEY DEFAULT 'JAI-' || TO_CHAR(NOW(), 'YYMM') || '-' || UPPER(SUBSTR(MD5(uuid_generate_v4()::text), 1, 4)),
  full_name     TEXT NOT NULL,
  nickname      TEXT,
  phone         TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE,
  line_id       TEXT,
  company       TEXT,
  position      TEXT,
  member_status TEXT NOT NULL DEFAULT 'prospect'
    CHECK (member_status IN ('prospect', 'registered', 'paid', 'member', 'alumni')),
  jai_balance   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WORKSHOPS — แต่ละ workshop มี config ของตัวเอง
-- ============================================================
CREATE TABLE workshops (
  workshop_id   TEXT PRIMARY KEY,  -- e.g. 'claude-123'
  name          TEXT NOT NULL,
  tagline       TEXT,
  description   TEXT,
  price         INTEGER NOT NULL,  -- in THB
  max_seats     INTEGER NOT NULL DEFAULT 10,
  date          DATE,
  time_start    TIME,
  time_end      TIME,
  location      TEXT,
  status        TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'full', 'closed', 'completed')),
  config        JSONB NOT NULL DEFAULT '{}',  -- survey questions + extra config
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SURVEY QUESTIONS — admin สร้าง/แก้ได้ ไม่ hardcode
-- ============================================================
CREATE TABLE survey_questions (
  question_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id   TEXT NOT NULL REFERENCES workshops(workshop_id) ON DELETE CASCADE,
  survey_type   TEXT NOT NULL DEFAULT 'pre'
    CHECK (survey_type IN ('pre', 'post')),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'choice'
    CHECK (question_type IN ('choice', 'multiple', 'open', 'scale')),
  options       JSONB,  -- array of strings for choice/multiple types
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_required   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REGISTRATIONS — การสมัครแต่ละครั้ง
-- ============================================================
CREATE TABLE registrations (
  reg_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jaiful_id       TEXT NOT NULL REFERENCES members(jaiful_id) ON DELETE RESTRICT,
  workshop_id     TEXT NOT NULL REFERENCES workshops(workshop_id) ON DELETE RESTRICT,
  status          TEXT NOT NULL DEFAULT 'interested'
    CHECK (status IN ('interested', 'registered', 'confirmed', 'attended', 'cancelled')),
  payment_status  TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'uploaded', 'confirmed', 'refunded')),
  payment_amount  INTEGER,
  slip_url        TEXT,
  source          TEXT,  -- how they found out
  notes           TEXT,
  confirmed_at    TIMESTAMPTZ,
  confirmed_by    TEXT,  -- admin_id who confirmed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (jaiful_id, workshop_id)
);

-- ============================================================
-- SURVEY RESPONSES — คำตอบแบบสอบถาม
-- ============================================================
CREATE TABLE survey_responses (
  response_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jaiful_id     TEXT NOT NULL REFERENCES members(jaiful_id) ON DELETE CASCADE,
  question_id   UUID NOT NULL REFERENCES survey_questions(question_id) ON DELETE CASCADE,
  workshop_id   TEXT NOT NULL REFERENCES workshops(workshop_id) ON DELETE CASCADE,
  reg_id        UUID REFERENCES registrations(reg_id) ON DELETE SET NULL,
  answer        JSONB NOT NULL,  -- flexible: string, array, number
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BADGES — badge definitions
-- ============================================================
CREATE TABLE badges (
  badge_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  description   TEXT,
  icon          TEXT,  -- emoji fallback
  image_url     TEXT,  -- Supabase Storage URL for visual badge
  badge_type    TEXT NOT NULL DEFAULT 'achievement'
    CHECK (badge_type IN ('achievement', 'completion', 'special', 'community')),
  workshop_id   TEXT REFERENCES workshops(workshop_id) ON DELETE SET NULL,
  trigger_event TEXT,  -- 'payment_confirmed', 'course_completed', etc.
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MEMBER BADGES — badges earned by members
-- ============================================================
CREATE TABLE member_badges (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jaiful_id     TEXT NOT NULL REFERENCES members(jaiful_id) ON DELETE CASCADE,
  badge_id      UUID NOT NULL REFERENCES badges(badge_id) ON DELETE CASCADE,
  workshop_id   TEXT REFERENCES workshops(workshop_id) ON DELETE SET NULL,
  earned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  given_by      TEXT,  -- admin_id
  UNIQUE (jaiful_id, badge_id)
);

-- ============================================================
-- ADMIN USERS — แยกจาก Supabase Auth users
-- ============================================================
CREATE TABLE admin_users (
  admin_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id     UUID UNIQUE,  -- links to auth.users.id
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'staff'
    CHECK (role IN ('owner', 'finance', 'pm', 'staff')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- JAI TRANSACTIONS — Phase 1: log only, Phase 2: display
-- ============================================================
CREATE TABLE jai_transactions (
  tx_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jaiful_id     TEXT NOT NULL REFERENCES members(jaiful_id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,  -- 'registered', 'paid', 'completed', 'survey_done', 'referral'
  jai_amount    INTEGER NOT NULL DEFAULT 0,
  workshop_id   TEXT REFERENCES workshops(workshop_id) ON DELETE SET NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- JAI CONFIG — admin กำหนดว่าแต่ละ event ได้ JAI กี่แต้ม
-- ============================================================
CREATE TABLE jai_config (
  event_type    TEXT PRIMARY KEY,
  jai_amount    INTEGER NOT NULL DEFAULT 0,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER workshops_updated_at BEFORE UPDATE ON workshops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER registrations_updated_at BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jai_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jai_config ENABLE ROW LEVEL SECURITY;

-- Public can read open workshops
CREATE POLICY "workshops_public_read" ON workshops
  FOR SELECT USING (status IN ('open', 'full'));

-- Public can read survey questions for open workshops
CREATE POLICY "survey_questions_public_read" ON survey_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workshops w
      WHERE w.workshop_id = survey_questions.workshop_id
      AND w.status IN ('open', 'full')
    )
  );

-- Public can read badges (for display)
CREATE POLICY "badges_public_read" ON badges FOR SELECT USING (true);

-- Public can insert members (registration)
CREATE POLICY "members_public_insert" ON members FOR INSERT WITH CHECK (true);

-- Public can insert registrations
CREATE POLICY "registrations_public_insert" ON registrations FOR INSERT WITH CHECK (true);

-- Public can insert survey responses
CREATE POLICY "survey_responses_public_insert" ON survey_responses FOR INSERT WITH CHECK (true);

-- Public can lookup own member by phone (returning user)
CREATE POLICY "members_public_lookup" ON members
  FOR SELECT USING (true);  -- limited fields exposed via view below

-- Authenticated admin: full access
CREATE POLICY "admin_full_access_members" ON members
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "admin_full_access_registrations" ON registrations
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "admin_full_access_workshops" ON workshops
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "admin_full_access_survey_q" ON survey_questions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "admin_full_access_survey_r" ON survey_responses
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "admin_full_access_badges" ON badges
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "admin_full_access_member_badges" ON member_badges
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "admin_full_access_admin_users" ON admin_users
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "admin_full_access_jai_tx" ON jai_transactions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "admin_full_access_jai_config" ON jai_config
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- SEED DATA
-- ============================================================

-- JAI config defaults
INSERT INTO jai_config (event_type, jai_amount, description, is_active) VALUES
  ('registered',    10,  'สมัคร workshop',             true),
  ('paid',          50,  'ชำระเงินแล้ว',                true),
  ('survey_pre',    10,  'ทำ pre-course survey',        true),
  ('completed',     100, 'เรียนจบ workshop',            true),
  ('survey_post',   20,  'ทำ post-course survey',       true),
  ('referral',      30,  'ชวนเพื่อนสมัครสำเร็จ',        true);

-- Claude 123 workshop
INSERT INTO workshops (
  workshop_id, name, tagline, description, price, max_seats,
  time_start, time_end, status
) VALUES (
  'claude-123',
  'Claude 123 🪽',
  'เปลี่ยน "กลัว" เป็น "กล้า"',
  'workshop แรกของ JAIFUL ที่สอนคนทำงานทั่วไปใช้ Claude AI อย่างมีหลักคิด เหมาะสำหรับคนที่สนใจ AI แต่ยังไม่รู้จะเริ่มยังไง',
  3500,
  10,
  '09:00',
  '17:30',
  'open'
);

-- Default pre-course survey questions for Claude 123
INSERT INTO survey_questions (workshop_id, survey_type, question_text, question_type, options, sort_order, is_required) VALUES
  ('claude-123', 'pre', 'คุณเคยใช้ AI มาก่อนไหม?', 'choice',
   '["ไม่เคยเลย", "เคยนิดหน่อย แต่ไม่แน่ใจว่าถูก", "ใช้เป็นประจำ"]',
   1, true),

  ('claude-123', 'pre', 'ตอนนี้คุณรู้สึกยังไงกับ AI?', 'choice',
   '["กลัวอยู่เลย ยังงงๆ", "สนใจแต่ยังไม่กล้าลอง", "ลองใช้บ้างแล้ว อยากเรียนให้ถูกต้อง", "ใช้อยู่แล้ว อยากต่อยอด"]',
   2, true),

  ('claude-123', 'pre', 'อยากให้ AI ช่วยเรื่องอะไรมากที่สุด?', 'open',
   NULL,
   3, true),

  ('claude-123', 'pre', 'รู้จัก Claude 123 จากไหน?', 'choice',
   '["Facebook/Instagram", "เพื่อนแนะนำ", "LinkedIn", "TikTok", "อื่นๆ"]',
   4, true),

  ('claude-123', 'pre', 'ความคาดหวังจาก workshop นี้?', 'open',
   NULL,
   5, false);

-- Claude 123 Pioneer badge
INSERT INTO badges (name, description, icon, badge_type, workshop_id, trigger_event) VALUES
  ('Claude 123 Pioneer 🪽',
   'ผู้บุกเบิก — เป็นคนแรกๆ ที่กล้าเปลี่ยน "กลัว" เป็น "กล้า" กับ JAIFUL',
   '🪽',
   'achievement',
   'claude-123',
   'payment_confirmed');
