-- Human Approvals Table
CREATE TABLE IF NOT EXISTS human_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL,
  action TEXT NOT NULL,
  data JSONB DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  user_id UUID REFERENCES users(id),
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_human_approvals_status ON human_approvals(status);
CREATE INDEX IF NOT EXISTS idx_human_approvals_agent ON human_approvals(agent);

-- RLS Policies (Enable RLS but allow open access for now as per project style, or specific rules)
ALTER TABLE human_approvals ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users"
ON human_approvals FOR SELECT
TO authenticated
USING (true);

-- Allow insert access to authenticated users (agents run as server but might use service role)
CREATE POLICY "Allow insert access to authenticated users"
ON human_approvals FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow update access to authenticated users (for approval/rejection)
CREATE POLICY "Allow update access to authenticated users"
ON human_approvals FOR UPDATE
TO authenticated
USING (true);
