import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Fallback check: if state says not authenticated, check localStorage
  const hasToken = localStorage.getItem('access_token');
  const hasUser = localStorage.getItem('user');
  const isAuthenticatedFallback = isAuthenticated || (hasToken && hasUser);

  console.log('[ProtectedRoute] Checking auth - isAuthenticated:', isAuthenticated, 'loading:', loading, 'fallback:', isAuthenticatedFallback);

  if (loading) {
    console.log('[ProtectedRoute] Still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
        <div className="text-white text-2xl font-semibold">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticatedFallback) {
    console.log('[ProtectedRoute] Not authenticated, redirecting to login');
    return <Navigate to="/login" />;
  }

  console.log('[ProtectedRoute] Authenticated, rendering children');
  return children;
};
