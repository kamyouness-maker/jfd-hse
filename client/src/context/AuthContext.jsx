import React, { createContext, useContext, useState, useEffect } from 'react';
import { isDemoMode, mockRequest } from '../demo/mockApi';
import { DEMO_USER } from '../demo/demoData';
import axios from 'axios';

const AuthContext = createContext(null);

const TOKEN_KEY = 'safecheck_token';
const USER_KEY = 'safecheck_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (isDemoMode) return DEMO_USER;
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => isDemoMode ? 'demo-token' : localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && !isDemoMode) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const response = isDemoMode
        ? await mockRequest('POST', '/auth/login', { username, password })
        : await axios.post('/api/auth/login', { username, password });
      const { token: newToken, user: newUser } = response.data.data;
      if (!isDemoMode) {
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      }
      setToken(newToken);
      setUser(newUser);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Erreur de connexion';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    if (!isDemoMode) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      delete axios.defaults.headers.common['Authorization'];
    }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated: !!user, isDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
