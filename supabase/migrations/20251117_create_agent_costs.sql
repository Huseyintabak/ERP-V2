-- Agent Cost Tracking Tablosu
CREATE TABLE IF NOT EXISTS agent_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost_usd DECIMAL(10, 6) NOT NULL,
  request_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Günlük ve haftalık toplamlar için view
CREATE OR REPLACE VIEW agent_cost_summary AS
SELECT 
  DATE(created_at) as date,
  agent,
  SUM(cost_usd) as daily_cost,
  COUNT(*) as request_count
FROM agent_costs
GROUP BY DATE(created_at), agent;

-- Indexes (DATE() fonksiyonu immutable olmadığı için index'te kullanılamaz)
CREATE INDEX IF NOT EXISTS idx_agent_costs_created_at ON agent_costs(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_costs_agent ON agent_costs(agent);

-- RLS - Sadece admin görebilir
ALTER TABLE agent_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_costs_select_policy" ON agent_costs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = current_setting('request.jwt.claims', true)::json->>'user_id'
      AND users.role = 'yonetici'
    )
  );

CREATE POLICY "agent_costs_insert_policy" ON agent_costs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

