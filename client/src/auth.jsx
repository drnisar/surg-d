import { createContext, useContext, useEffect, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  // Any request rejected for its token signs the user out; the signed-out routes then show the login page.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear();
      setUser(null);
    });
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) return;
    api('/auth/me')
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = async (identifier, password) => {
    const { token, user } = await api('/auth/login', { method: 'POST', body: { identifier, password } });
    tokenStore.set(token);
    setUser(user);
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  // Admin testing aid: act as another user, keeping the admin token to switch back.
  const impersonate = async (employeeId) => {
    const { token, user } = await api('/auth/impersonate', { method: 'POST', body: { employeeId } });
    if (!tokenStore.getAdmin()) tokenStore.setAdmin(tokenStore.get());
    tokenStore.set(token);
    setUser(user);
  };

  const stopImpersonating = async () => {
    const adminToken = tokenStore.getAdmin();
    if (!adminToken) return logout();
    tokenStore.set(adminToken);
    tokenStore.clearAdmin();
    try {
      setUser(await api('/auth/me'));
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, impersonate, stopImpersonating }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
