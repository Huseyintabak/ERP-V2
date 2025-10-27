import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function tenantRoutingMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/static')
  ) {
    return NextResponse.next();
  }

  // Get subdomain from hostname
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];
  
  // Skip if it's the main domain (no subdomain)
  if (subdomain === 'localhost' || subdomain === 'thunder-erp' || subdomain === 'www') {
    return NextResponse.next();
  }

  // Check if subdomain exists in database
  const supabase = createClient();
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, name, subdomain, plan, status')
    .eq('subdomain', subdomain)
    .single();

  if (error || !tenant) {
    // Subdomain not found, redirect to main domain
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (tenant.status !== 'active') {
    // Tenant is suspended or cancelled
    return NextResponse.redirect(new URL('/tenant-suspended', request.url));
  }

  // Add tenant context to request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenant.id);
  requestHeaders.set('x-tenant-name', tenant.name);
  requestHeaders.set('x-tenant-plan', tenant.plan);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Export the middleware function
export default tenantRoutingMiddleware;
