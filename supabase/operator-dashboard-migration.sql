-- ============================================
-- OPERATOR DASHBOARD MIGRATION
-- ============================================
-- This migration adds operator work status tracking and break management

-- Add work status to operators table
ALTER TABLE operators 
ADD COLUMN IF NOT EXISTS current_status TEXT DEFAULT 'idle' 
CHECK (current_status IN ('active', 'idle', 'break'));

-- Create operator_breaks table for break tracking
CREATE TABLE IF NOT EXISTS operator_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  break_type TEXT NOT NULL CHECK (break_type IN ('lunch', 'rest', 'other')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_operator_breaks_operator ON operator_breaks(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_breaks_started ON operator_breaks(started_at);
CREATE INDEX IF NOT EXISTS idx_operator_breaks_type ON operator_breaks(break_type);

-- Add RLS policies for operator_breaks
ALTER TABLE operator_breaks ENABLE ROW LEVEL SECURITY;

-- Policy: Operators can view their own breaks
CREATE POLICY "Operators can view own breaks" ON operator_breaks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.id = operator_breaks.operator_id
    AND users.role = 'operator'
  )
);

-- Policy: Operators can insert their own breaks
CREATE POLICY "Operators can insert own breaks" ON operator_breaks
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.id = operator_breaks.operator_id
    AND users.role = 'operator'
  )
);

-- Policy: Operators can update their own breaks
CREATE POLICY "Operators can update own breaks" ON operator_breaks
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.id = operator_breaks.operator_id
    AND users.role = 'operator'
  )
);

-- Policy: Yönetici can view all breaks
CREATE POLICY "Yönetici can view all breaks" ON operator_breaks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'yonetici'
  )
);

-- Add realtime support for operator_breaks
ALTER PUBLICATION supabase_realtime ADD TABLE operator_breaks;

-- Update existing operators to have default status
UPDATE operators 
SET current_status = 'idle' 
WHERE current_status IS NULL;

-- Add comment to operators table
COMMENT ON COLUMN operators.current_status IS 'Current work status of the operator: active, idle, or break';
