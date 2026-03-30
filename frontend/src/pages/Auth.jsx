import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('[Login] Attempting login with:', email);
      const result = await login(email, password);
      console.log('[Login] Login successful, user:', result);
      console.log('[Login] Navigating to /dashboard');
      navigate('/dashboard');
    } catch (err) {
      console.error('[Login] Login failed:', err);
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-3 sm:p-4 relative overflow-hidden perspective bg-scene-auth">
      {/* Animated floating background elements */}
      <div className="absolute top-0 left-0 w-screen h-screen overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-full blur-3xl animate-float" style={{animation: 'float 8s ease-in-out infinite'}}></div>
        <div className="absolute bottom-0 right-10 w-96 h-96 bg-gradient-to-r from-secondary/20 to-pink-400/20 rounded-full blur-3xl animate-float" style={{animation: 'float 10s ease-in-out infinite', animationDelay: '-2s'}}></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-gradient-to-r from-pink-300/20 to-primary/20 rounded-full blur-3xl animate-morph" style={{animation: 'morph 8s ease-in-out infinite', animationDelay: '-1.5s'}}></div>
      </div>

      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(102, 126, 234, 0.05) 25%, rgba(102, 126, 234, 0.05) 26%, transparent 27%, transparent 74%, rgba(102, 126, 234, 0.05) 75%, rgba(102, 126, 234, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(102, 126, 234, 0.05) 25%, rgba(102, 126, 234, 0.05) 26%, transparent 27%, transparent 74%, rgba(102, 126, 234, 0.05) 75%, rgba(102, 126, 234, 0.05) 76%, transparent 77%, transparent)',
        backgroundSize: '50px 50px'
      }}></div>

      {/* Login Card with 3D perspective */}
      <div className="card w-full max-w-md p-6 sm:p-8 animate-rotate-in-3d relative z-10 shadow-2xl hover-3d scene-content">
        <div className="text-center mb-6 sm:mb-7">
          <div className="text-5xl sm:text-6xl mb-2 sm:mb-3 animate-float" style={{animation: 'float 3s ease-in-out infinite'}}>🔐</div>
          <h1 className="text-3xl sm:text-4xl font-black gradient-text-animated mb-2">Invoice Processor</h1>
          <p className="text-gray-600 text-sm sm:text-base font-semibold tracking-wide">✨ AI-Powered Intelligence</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="form-group mb-0 animate-float-up" style={{animationDelay: '0.1s'}}>
            <label htmlFor="email" className="form-label flex items-center gap-2">
              <span className="text-xl">📧</span> Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="input-field btn-ripple"
            />
          </div>

          <div className="form-group mb-0 animate-float-up" style={{animationDelay: '0.2s'}}>
            <label htmlFor="password" className="form-label flex items-center gap-2">
              <span className="text-xl">🔑</span> Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="input-field btn-ripple"
            />
          </div>

          {error && (
            <div className="mb-2 p-3 bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 text-red-700 text-xs sm:text-sm rounded-xl animate-scale-in shadow-lg">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <span className="font-semibold">{error}</span>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 sm:py-4 text-base sm:text-lg font-bold mt-4 sm:mt-5 btn-ripple">
            {loading ? '⏳ Logging in...' : '🚀 Login Now'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 sm:my-6 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300 to-transparent h-px top-1/2"></div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-gray-500 text-sm font-semibold">OR</span>
          </div>
        </div>

        {/* Sign up link */}
        <div className="text-center animate-float-up" style={{animationDelay: '0.3s'}}>
          <p className="text-gray-700 font-medium text-sm sm:text-base">
            Don't have an account? 
            <a href="/register" className="text-primary font-bold hover:text-secondary transition-all duration-300 ml-2 hover:underline">
              Create one
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, fullName);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4 bg-scene-auth">
      <div className="card w-full max-w-md p-10 scene-content">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🔐 Create Account</h1>
          <p className="text-gray-600 text-sm">Join Invoice Processor</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName" className="form-label">Full Name</label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Your name"
              className="input-field"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="input-field"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="At least 8 characters"
              className="input-field"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
              className="input-field"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="text-center mt-6 text-gray-600 text-sm">
          <p>Already have an account? <a href="/login" className="text-primary font-semibold hover:underline">Login here</a></p>
        </div>
      </div>
    </div>
  );
};
