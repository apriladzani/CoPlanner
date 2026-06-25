import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Film, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, logoUrl } = useAuth();
  const navigate = useNavigate();

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (!val) {
      setEmailError('Email wajib diisi');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setEmailError('Format email tidak sesuai (contoh: user@gmail.com)');
    } else {
      setEmailError('');
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (!val) {
      setPasswordError('Password wajib diisi');
    } else {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let hasError = false;
    if (!email) {
      setEmailError('Email wajib diisi');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Format email tidak sesuai (contoh: user@gmail.com)');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password wajib diisi');
      hasError = true;
    }

    if (hasError) return;
    setIsLoading(true);

    try {
      await signIn(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1115] flex flex-col justify-center items-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <img
            src={logoUrl}
            alt="Uni - LLMedia Logo"
            referrerPolicy="no-referrer"
            className="h-16 w-auto object-contain mx-auto mb-6 rounded-2xl bg-white p-2.5 shadow-lg shadow-black/40"
          />
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to continue to CoPlanner</p>
        </div>

        <div className="bg-[#15171C] border border-white/5 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-gray-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`w-full bg-[#0F1115] border rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none transition-all ${emailError
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                    }`}
                  placeholder="you@example.com"
                />
              </div>
              {emailError && (
                <span className="text-[11px] text-red-400 mt-1 block font-medium opacity-90 transition-all">
                  {emailError}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-400">Password</label>
                <Link to="/forgot-password" className="text-xs text-purple-400 hover:text-purple-300">Forgot password?</Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className={`w-full bg-[#0F1115] border rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none transition-all ${passwordError
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                    }`}
                  placeholder="••••••••"
                />
              </div>
              {passwordError && (
                <span className="text-[11px] text-red-400 mt-1 block font-medium opacity-90 transition-all">
                  {passwordError}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 mt-6 shadow-lg shadow-purple-500/20"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-purple-400 hover:text-purple-300 font-medium">
              Create an account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
