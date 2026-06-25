import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, AlertCircle, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ForgotPassword = () => {
  const { logoUrl } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to verify email address.');
      }

      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reset password.');
      }

      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Password reset failed. Please try again.');
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
            alt="Logo"
            referrerPolicy="no-referrer"
            className="h-16 w-auto object-contain mx-auto mb-6 rounded-2xl bg-white p-2.5 shadow-lg shadow-black/40"
          />
          <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-gray-400">Recover access to your UnifyAI account</p>
        </div>

        <div className="bg-[#15171C] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden min-h-[300px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-purple-400" /> Verify Your Email
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                  Enter your registered email address below. We'll verify it to let you reset your password.
                </p>

                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                )}

                <form onSubmit={handleVerifyEmail} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="w-5 h-5 text-gray-500" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#0F1115] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Link to="/login" className="text-sm text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors">
                      <ArrowLeft className="w-4 h-4" /> Back to Login
                    </Link>
                    <button
                      type="submit"
                      disabled={isLoading || !email}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20"
                    >
                      {isLoading ? 'Verifying...' : 'Next'}
                      {!isLoading && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-purple-400" /> Choose New Password
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                  Your email has been verified. Choose a secure new password for <strong>{email}</strong>.
                </p>

                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="w-5 h-5 text-gray-500" />
                      </div>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#0F1115] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        placeholder="••••••••"
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Confirm New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="w-5 h-5 text-gray-500" />
                      </div>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-[#0F1115] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        placeholder="••••••••"
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-sm text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !password || !confirmPassword}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20"
                    >
                      {isLoading ? 'Resetting...' : 'Reset Password'}
                      {!isLoading && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="text-center py-6 space-y-6"
              >
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">Password Reset!</h2>
                  <p className="text-gray-400 text-sm leading-relaxed px-4">
                    Your password has been successfully updated. You can now log in using your new credentials.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-xl py-3.5 hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
                >
                  Continue to Sign In
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
