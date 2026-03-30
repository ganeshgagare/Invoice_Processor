import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('[AuthProvider] useEffect - Loading stored auth state');
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');

    console.log('[AuthProvider] Found stored user:', !!storedUser, 'token:', !!token);
    if (storedUser && token) {
      try {
        const user = JSON.parse(storedUser);
        console.log('[AuthProvider] Setting user from storage:', user);
        setUser(user);
      } catch (e) {
        console.error('[AuthProvider] Failed to parse stored user:', e);
      }
    }
    setLoading(false);
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
      localStorage.setItem('access_token', access_token);
      console.log('[AuthContext.login] Token stored');

      // Fetch user data
      console.log('[AuthContext.login] Fetching user data...');
      const userResponse = await authAPI.getMe();
      console.log('[AuthContext.login] User data received:', userResponse.data);
      const userData = userResponse.data;
      
      // Store and update user state synchronously
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('[AuthContext.login] User stored in localStorage');
      setUser(userData);
      console.log('[AuthContext.login] User state updated');

      return userData;
    } catch (err) {
      console.error('[AuthContext.login] Login failed:', err);
      // Clear any partial auth state on error
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      const errorMessage = err.response?.data?.detail || err.message || 'Login failed';
      setError(errorMessage);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
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

