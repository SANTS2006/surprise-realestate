import { createContext, useContext, useCallback, useEffect, useState, useMemo } from 'react';
import { organizationsApi } from '../api/organizations.js';
import { applyColorRamp } from '../utils/colorRamp.js';
import { useAuth } from './AuthContext.jsx';

const BrandingContext = createContext(null);

const PLATFORM_BRANDING = { name: 'NTS Real Estate System', logoUrl: '/logo-nts.png' };

// Two independent sources feed this, never both at once:
//  - Pre-auth: a tenant's own login/register/forgot/reset pages call
//    `applyTenantBranding` (see layouts/AuthLayout.jsx) after fetching
//    GET /orgs/:orgSlug/branding — anonymous, so it has to be pushed in
//    explicitly rather than fetched here.
//  - Post-auth: once `useAuth()` reports a signed-in user, this fetches the
//    caller's own organization's branding automatically (GET
//    /organizations/me/branding) and applies it for the whole dashboard.
// Either way, "applying" means computing a full 50–950 tint/shade ramp from
// the tenant's two colors and writing it as CSS custom properties (see
// utils/colorRamp.js) — every `bg-brand-600`/`text-accent-400`/etc. class
// already used throughout the app picks it up with no component changes.
// Falls back to the platform's own NTS identity whenever no tenant context
// applies (platform-admin pages, or before either fetch above resolves).
export function BrandingProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [tenantBranding, setTenantBranding] = useState(null);
  const [dashboardBranding, setDashboardBranding] = useState(null);

  const applyTenantBranding = useCallback((branding) => {
    setTenantBranding(branding);
    if (branding?.primaryColor) applyColorRamp('brand', branding.primaryColor);
    if (branding?.secondaryColor) applyColorRamp('accent', branding.secondaryColor);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setDashboardBranding(null);
      return;
    }
    organizationsApi.getMyBranding()
      .then((res) => {
        setDashboardBranding(res.data);
        applyColorRamp('brand', res.data.primaryColor);
        applyColorRamp('accent', res.data.secondaryColor);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const branding = dashboardBranding ?? tenantBranding ?? PLATFORM_BRANDING;

  const value = useMemo(() => ({ branding, applyTenantBranding }), [branding, applyTenantBranding]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within a BrandingProvider');
  return ctx;
}
