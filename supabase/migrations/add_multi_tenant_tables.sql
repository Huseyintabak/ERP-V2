-- ============================================
-- Multi-Tenant Architecture - Phase 2
-- ============================================
-- Yeni tablolar ekleniyor (mevcut tablolar değiştirilmiyor)
-- ============================================

-- 1. Tenants Table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tenant Users Table (Many-to-many relationship)
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'user')),
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- 3. Subscriptions Table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Billing Table
CREATE TABLE billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  stripe_payment_intent_id TEXT,
  invoice_url TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tenant Settings Table
CREATE TABLE tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, setting_key)
);

-- Indexes for performance
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_plan ON tenants(plan);

CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX idx_tenant_users_role ON tenant_users(role);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

CREATE INDEX idx_billing_tenant ON billing(tenant_id);
CREATE INDEX idx_billing_subscription ON billing(subscription_id);
CREATE INDEX idx_billing_status ON billing(status);

CREATE INDEX idx_tenant_settings_tenant ON tenant_settings(tenant_id);
CREATE INDEX idx_tenant_settings_key ON tenant_settings(setting_key);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at_trigger
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_tenants_updated_at();

CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at_trigger
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscriptions_updated_at();

CREATE OR REPLACE FUNCTION update_billing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER billing_updated_at_trigger
    BEFORE UPDATE ON billing
    FOR EACH ROW
    EXECUTE FUNCTION update_billing_updated_at();

CREATE OR REPLACE FUNCTION update_tenant_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_settings_updated_at_trigger
    BEFORE UPDATE ON tenant_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_settings_updated_at();

-- RLS Policies for Multi-Tenant Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY "Users can only see their tenant data" ON tenants
    FOR ALL TO authenticated
    USING (id IN (
        SELECT tenant_id FROM tenant_users 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only see their tenant user records" ON tenant_users
    FOR ALL TO authenticated
    USING (user_id = auth.uid() OR tenant_id IN (
        SELECT tenant_id FROM tenant_users 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only see their tenant subscriptions" ON subscriptions
    FOR ALL TO authenticated
    USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only see their tenant billing" ON billing
    FOR ALL TO authenticated
    USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users 
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can only see their tenant settings" ON tenant_settings
    FOR ALL TO authenticated
    USING (tenant_id IN (
        SELECT tenant_id FROM tenant_users 
        WHERE user_id = auth.uid()
    ));

-- Helper functions for multi-tenant operations
CREATE OR REPLACE FUNCTION create_tenant(
    p_name TEXT,
    p_subdomain TEXT,
    p_plan TEXT DEFAULT 'starter',
    p_owner_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
BEGIN
    -- Create tenant
    INSERT INTO tenants (name, subdomain, plan)
    VALUES (p_name, p_subdomain, p_plan)
    RETURNING id INTO v_tenant_id;
    
    -- If owner_id provided, add as owner
    IF p_owner_id IS NOT NULL THEN
        INSERT INTO tenant_users (tenant_id, user_id, role)
        VALUES (v_tenant_id, p_owner_id, 'owner');
    END IF;
    
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION assign_user_to_tenant(
    p_tenant_id UUID,
    p_user_id UUID,
    p_role TEXT DEFAULT 'user'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO tenant_users (tenant_id, user_id, role)
    VALUES (p_tenant_id, p_user_id, p_role)
    ON CONFLICT (tenant_id, user_id) 
    DO UPDATE SET role = p_role, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_tenants(p_user_id UUID)
RETURNS TABLE (
    tenant_id UUID,
    tenant_name TEXT,
    subdomain TEXT,
    plan TEXT,
    role TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.subdomain,
        t.plan,
        tu.role,
        t.status
    FROM tenants t
    JOIN tenant_users tu ON t.id = tu.tenant_id
    WHERE tu.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
