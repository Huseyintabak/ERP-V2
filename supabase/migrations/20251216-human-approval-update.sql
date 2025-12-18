-- Add missing columns to human_approvals table
ALTER TABLE human_approvals ADD COLUMN IF NOT EXISTS expiry_at TIMESTAMPTZ;
ALTER TABLE human_approvals ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE human_approvals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE human_approvals ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES users(id);
ALTER TABLE human_approvals ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE human_approvals ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_human_approvals_expiry ON human_approvals(expiry_at);
CREATE INDEX IF NOT EXISTS idx_human_approvals_severity ON human_approvals(severity);

-- Function to expire old approvals
CREATE OR REPLACE FUNCTION expire_old_approvals()
RETURNS VOID AS $$
BEGIN
  UPDATE human_approvals
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expiry_at < NOW();
END;
$$ LANGUAGE plpgsql;
