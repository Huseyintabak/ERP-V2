import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'cancelled';
}

interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'manager' | 'user';
  permissions: Record<string, any>;
}

export function useTenant() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantUser, setTenantUser] = useState<TenantUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getTenantContext() {
      try {
        setLoading(true);
        
        // Get tenant ID from headers (set by middleware)
        const tenantId = document.querySelector('meta[name="tenant-id"]')?.getAttribute('content');
        
        if (!tenantId) {
          setError('No tenant context found');
          setLoading(false);
          return;
        }

        const supabase = createClient();
        
        // Get tenant details
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantId)
          .single();

        if (tenantError) {
          setError('Failed to load tenant');
          setLoading(false);
          return;
        }

        setTenant(tenantData);

        // Get current user's tenant user record
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: tenantUserData, error: tenantUserError } = await supabase
            .from('tenant_users')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('user_id', user.id)
            .single();

          if (!tenantUserError && tenantUserData) {
            setTenantUser(tenantUserData);
          }
        }

        setLoading(false);
      } catch (err) {
        setError('Failed to load tenant context');
        setLoading(false);
      }
    }

    getTenantContext();
  }, []);

  const hasPermission = (permission: string): boolean => {
    if (!tenantUser) return false;
    
    // Owner has all permissions
    if (tenantUser.role === 'owner') return true;
    
    // Check specific permissions
    return tenantUser.permissions?.[permission] === true;
  };

  const hasRole = (role: string): boolean => {
    if (!tenantUser) return false;
    return tenantUser.role === role;
  };

  const canAccess = (feature: string): boolean => {
    if (!tenant) return false;
    
    // Check plan-based access
    const planFeatures = {
      starter: ['basic_dashboard', 'basic_reports'],
      professional: ['basic_dashboard', 'basic_reports', 'advanced_analytics', 'api_access'],
      enterprise: ['basic_dashboard', 'basic_reports', 'advanced_analytics', 'api_access', 'custom_integrations', 'priority_support']
    };
    
    return planFeatures[tenant.plan]?.includes(feature) || false;
  };

  return {
    tenant,
    tenantUser,
    loading,
    error,
    hasPermission,
    hasRole,
    canAccess,
    isOwner: tenantUser?.role === 'owner',
    isAdmin: tenantUser?.role === 'admin',
    isManager: tenantUser?.role === 'manager',
    isUser: tenantUser?.role === 'user',
  };
}
