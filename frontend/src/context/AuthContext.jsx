import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/auth.service';
import { getErrorMessage } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'smartstore_token';
const USER_KEY = 'smartstore_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setLoading(false);
      return;
    }

    authService
      .me()
      .then((currentUser) => {
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        setUser(currentUser);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async ({ email, password }) => {
    try {
      const data = await authService.login({ email, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Le JWT est stateless : on nettoie le stockage local même si l'appel échoue.
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return context;
}
