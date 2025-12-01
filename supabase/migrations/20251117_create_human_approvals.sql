-- Human Approvals Tablosu
CREATE TABLE IF NOT EXISTS human_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id VARCHAR(255) NOT NULL UNIQUE, -- Agent decision ID
  agent VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  data JSONB NOT NULL,
  reasoning TEXT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  rejected_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  expiry_at TIMESTAMP WITH TIME ZONE, -- 24 saat sonra expire
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_human_approvals_status ON human_approvals(status);
CREATE INDEX IF NOT EXISTS idx_human_approvals_requested_by ON human_approvals(requested_by);
CREATE INDEX IF NOT EXISTS idx_human_approvals_approved_by ON human_approvals(approved_by);
CREATE INDEX IF NOT EXISTS idx_human_approvals_expiry ON human_approvals(expiry_at);
CREATE INDEX IF NOT EXISTS idx_human_approvals_agent ON human_approvals(agent);
CREATE INDEX IF NOT EXISTS idx_human_approvals_created ON human_approvals(created_at DESC);

-- Expiry trigger (24 saat sonra otomatik expire)
CREATE OR REPLACE FUNCTION expire_old_approvals()
RETURNS void AS $$
BEGIN
  UPDATE human_approvals
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
    AND expiry_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE human_approvals ENABLE ROW LEVEL SECURITY;

-- Yönetici ve planlama rolleri görebilir
CREATE POLICY "human_approvals_select_policy" ON human_approvals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = current_setting('request.jwt.claims', true)::json->>'user_id'
      AND users.role IN ('yonetici', 'planlama')
    )
  );

-- Sistem approval oluşturabilir (AI agent'lar ve authenticated users)
CREATE POLICY "human_approvals_insert_policy" ON human_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Service role için INSERT izni (AI agent'lar için)
CREATE POLICY "human_approvals_service_role_insert" ON human_approvals
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Sadece yönetici onaylayabilir/reddedebilir
CREATE POLICY "human_approvals_update_policy" ON human_approvals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = current_setting('request.jwt.claims', true)::json->>'user_id'
      AND users.role = 'yonetici'
    )
  );

