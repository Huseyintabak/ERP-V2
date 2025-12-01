-- Agent Logs Tablosu
-- AI Agent işlemlerini loglar (validation, decisions, errors, vb.)

CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent VARCHAR(50) NOT NULL, -- planning, warehouse, production, purchase, developer, manager
  action VARCHAR(100) NOT NULL, -- order_approval_validation, stock_movement_validation, vb.
  level VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error')),
  data JSONB NOT NULL DEFAULT '{}', -- Tüm log entry data (context, errors, warnings, protocolResult, vb.)
  conversation_id VARCHAR(255), -- İlgili conversation ID
  request_id VARCHAR(255), -- İlgili request ID
  order_id UUID, -- İlgili order ID (varsa)
  plan_id UUID, -- İlgili production plan ID (varsa)
  material_id UUID, -- İlgili material ID (varsa)
  final_decision VARCHAR(50), -- approved, rejected, pending_approval
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent);
CREATE INDEX IF NOT EXISTS idx_agent_logs_action ON agent_logs(action);
CREATE INDEX IF NOT EXISTS idx_agent_logs_level ON agent_logs(level);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_conversation_id ON agent_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_order_id ON agent_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_plan_id ON agent_logs(plan_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_material_id ON agent_logs(material_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_final_decision ON agent_logs(final_decision);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_created ON agent_logs(agent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_level_created ON agent_logs(level, created_at DESC);

-- RLS Policies
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

-- Yönetici ve planlama rolleri görebilir
CREATE POLICY "agent_logs_select_policy" ON agent_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = current_setting('request.jwt.claims', true)::json->>'user_id'
      AND users.role IN ('yonetici', 'planlama')
    )
  );

-- Sistem agent log oluşturabilir
CREATE POLICY "agent_logs_insert_policy" ON agent_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Agent log summary view (günlük özet)
CREATE OR REPLACE VIEW agent_logs_summary AS
SELECT 
  DATE(created_at) as date,
  agent,
  level,
  COUNT(*) as log_count,
  COUNT(DISTINCT action) as unique_actions,
  COUNT(DISTINCT CASE WHEN final_decision = 'approved' THEN id END) as approved_count,
  COUNT(DISTINCT CASE WHEN final_decision = 'rejected' THEN id END) as rejected_count,
  COUNT(DISTINCT CASE WHEN final_decision = 'pending_approval' THEN id END) as pending_count
FROM agent_logs
GROUP BY DATE(created_at), agent, level;

-- Agent activity view (son 24 saat)
CREATE OR REPLACE VIEW agent_logs_recent AS
SELECT 
  agent,
  action,
  level,
  final_decision,
  data,
  created_at
FROM agent_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

