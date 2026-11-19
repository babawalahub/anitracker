import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { signIn, signUp, signInWithGithub, signInWithGoogle, resetPassword } from '../services/auth';

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const reset = () => { setError(null); setSuccess(null); };

  const handleLogin = async (e) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      await signIn(email, password);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    reset();
    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, username.trim());
      setSuccess('Account created! Check your email to confirm, then log in.');
      setMode('login');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess('Password reset email sent! Check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    reset();
    try {
      if (provider === 'github') await signInWithGithub();
      else await signInWithGoogle();
    } catch (err) {
      setError(err.message || `${provider} login failed.`);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#0b1622] border border-[#1e293b] rounded-3xl p-8 shadow-2xl cursor-default"
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-[#151f2e] transition-colors">
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center shadow-lg mb-3">
            <span className="text-white font-black text-2xl">A</span>
          </div>
          <h2 className="text-xl font-black text-white">
            {mode === 'login' ? 'Sign in to AniTrack' : mode === 'register' ? 'Create Account' : 'Reset Password'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' ? 'Sync your lists across all devices' : mode === 'register' ? 'Join the AniTrack community' : 'Enter your email to reset'}
          </p>
        </div>

        {/* Error / Success Banner */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* OAuth Buttons - Login & Register only */}
        {mode !== 'forgot' && (
          <div className="space-y-2 mb-5">
            <button
              onClick={() => handleOAuth('github')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#151f2e] border border-[#1e293b] hover:border-sky-500/50 text-white text-sm font-semibold transition-all"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              <span>Continue with GitHub</span>
            </button>
            <button
              onClick={() => handleOAuth('google')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#151f2e] border border-[#1e293b] hover:border-sky-500/50 text-white text-sm font-semibold transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.2 30.2 0 24 0 14.8 0 7 5.4 3.2 13.3l7.9 6.1C13 14 18.1 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/><path fill="#FBBC05" d="M11.1 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.7-4.6L2.3 13.3A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l8.6-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-5.9 0-10.9-4-12.7-9.4l-7.9 6.1C7.1 42.7 15 48 24 48z"/></svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-[#1e293b]" />
              <span className="text-xs text-slate-500 font-medium">or with email</span>
              <div className="flex-1 h-px bg-[#1e293b]" />
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleForgot} className="space-y-3">
          
          {/* Username - Register only */}
          {mode === 'register' && (
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Username (min 3 chars)"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full bg-[#151f2e] border border-[#1e293b] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          )}

          {/* Email */}
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[#151f2e] border border-[#1e293b] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Password */}
          {mode !== 'forgot' && (
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Password (min 6 chars)' : 'Password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#151f2e] border border-[#1e293b] rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Forgot link */}
          {mode === 'login' && (
            <div className="text-right">
              <button type="button" onClick={() => { setMode('forgot'); reset(); }} className="text-xs text-sky-400 hover:underline">
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm transition-all shadow-lg shadow-sky-500/20 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>
              {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Email'}
            </span>
          </button>
        </form>

        {/* Switch mode */}
        <div className="mt-5 text-center text-xs text-slate-400">
          {mode === 'login' ? (
            <>Don't have an account?{' '}
              <button onClick={() => { setMode('register'); reset(); }} className="text-sky-400 font-bold hover:underline">Sign up free</button>
            </>
          ) : (
            <button onClick={() => { setMode('login'); reset(); }} className="flex items-center gap-1 text-sky-400 font-bold hover:underline mx-auto">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
