import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { authApi } from '../api/auth.js';

const AuthContext = createContext(null);

// The single source of truth for "who is signed in" — every route guard
// and permission-aware nav item reads from here, never from a token/cookie
// directly. On mount it asks the server (GET /auth/me) rather than trusting
// any client-side flag, since the actual credential is an HttpOnly session
// cookie the frontend can't inspect.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res.data);
      return res.data;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  // Returns the raw login response so the caller (LoginPage) can branch on
  // `mfaRequired` without this context needing to know about that flow.
  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.data.user) setUser(res.data.user);
    return res.data;
  }, []);

  const completeMfaChallenge = useCallback(async (mfaToken, code) => {
    const res = await authApi.mfaChallenge({ mfaToken, code });
    setUser(res.data.user);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const hasRole = useCallback((...roles) => Boolean(user) && roles.some((r) => user.roles.includes(r)), [user]);

  const value = useMemo(
    () => ({ user, loading, isAuthenticated: Boolean(user), login, completeMfaChallenge, logout, refreshUser, hasRole }),
    [user, loading, login, completeMfaChallenge, logout, refreshUser, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
