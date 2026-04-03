import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

const createSafeStorage = () => {
  const memoryStore = new Map();

  const getBrowserStorage = () => {
    if (typeof window === 'undefined') return null;
    try {
      return window.sessionStorage;
    } catch {
      return null;
    }
  };

  return {
    getItem: (key) => {
      const storage = getBrowserStorage();
      if (storage) return storage.getItem(key);
      return memoryStore.has(key) ? memoryStore.get(key) : null;
    },
    setItem: (key, value) => {
      const storage = getBrowserStorage();
      if (storage) {
        storage.setItem(key, value);
        return;
      }
      memoryStore.set(key, value);
    },
    removeItem: (key) => {
      const storage = getBrowserStorage();
      if (storage) {
        storage.removeItem(key);
        return;
      }
      memoryStore.delete(key);
    },
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const authStorage = React.useMemo(() => createSafeStorage(), []);

  useEffect(() => {
    console.log('[AuthProvider] useEffect - Loading stored auth state');
    const storedUser = authStorage.getItem('user');
    const token = authStorage.getItem('access_token');

    const bootstrapAuth = async () => {
      console.log('[AuthProvider] Found stored user:', !!storedUser, 'token:', !!token);
      if (storedUser && token) {
        try {
          const user = JSON.parse(storedUser);
          console.log('[AuthProvider] Validating stored auth with backend...');
          const response = await authAPI.getMe();
          const freshUser = response.data || user;
          console.log('[AuthProvider] Stored auth is valid:', freshUser);
          authStorage.setItem('user', JSON.stringify(freshUser));
          setUser(freshUser);
        } catch (error) {
          console.warn('[AuthProvider] Stored auth is invalid, clearing session:', error);
          authStorage.removeItem('access_token');
          authStorage.removeItem('user');
          setUser(null);
        }
      }

      setLoading(false);
    };

    bootstrapAuth();
  }, []);

  const register = async (email, password, fullName) => {
    try {
      setError(null);
      const response = await authAPI.register(email, password, fullName);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Registration failed';
      setError(errorMessage);
      throw err;
    }
  };

  const login = async (email, password) => {
    try {
      console.log('[AuthContext.login] Starting login for:', email);
      setError(null);
      const response = await authAPI.login(email, password);
      console.log('[AuthContext.login] Login response:', response.data);
      const { access_token } = response.data;

      // Store token immediately
      authStorage.setItem('access_token', access_token);
      console.log('[AuthContext.login] Token stored');

      // Fetch user data
      console.log('[AuthContext.login] Fetching user data...');
      const userResponse = await authAPI.getMe();
      console.log('[AuthContext.login] User data received:', userResponse.data);
      const userData = userResponse.data;
      
      // Store and update user state synchronously
      authStorage.setItem('user', JSON.stringify(userData));
      console.log('[AuthContext.login] User stored in sessionStorage');
      setUser(userData);
      console.log('[AuthContext.login] User state updated');

      return userData;
    } catch (err) {
      console.error('[AuthContext.login] Login failed:', err);
      // Clear any partial auth state on error
      authStorage.removeItem('access_token');
      authStorage.removeItem('user');
      const errorMessage = err.response?.data?.detail || err.message || 'Login failed';
      setError(errorMessage);
      throw err;
    }
  };

  const logout = () => {
    authStorage.removeItem('access_token');
    authStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

