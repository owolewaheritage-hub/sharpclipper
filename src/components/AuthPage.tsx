import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { signInWithEmail, signUpWithEmail } from '../utils/storage';
import { UserAccount } from '../types';

interface AuthPageProps {
  onSuccess: (account: UserAccount) => void;
  onCancel: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, onCancel }) => {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup') {
      const res = signUpWithEmail(email, password, name);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSuccess(res.account);
    } else {
      const res = signInWithEmail(email, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSuccess(res.account);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#060608] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#0E0E13] border border-white/10 rounded-xl p-6 sm:p-8">
        <div className="flex items-center gap-1 p-1 bg-[#060608] border border-white/10 rounded-lg mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'signup' ? 'bg-[#8B5CF6] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError('');
            }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'signin' ? 'bg-[#8B5CF6] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight">
          {mode === 'signup' ? 'Create your SharpClipper account' : 'Welcome back'}
        </h1>
        <p className="text-sm text-zinc-400 mt-1.5">
          {mode === 'signup'
            ? 'Save your exported clips, track your 3 free monthly exports, and unlock Pro.'
            : 'Sign in with your email and password to access your saved clips.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Creator Name (optional)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Creator"
                  className="w-full h-11 pl-10 pr-4 bg-[#060608] border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 pl-10 pr-4 bg-[#060608] border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full h-11 pl-10 pr-11 bg-[#060608] border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#8B5CF6]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full h-12 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            {mode === 'signup' ? 'Create Free Account' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Continue without signing in
          </button>
        </form>
      </div>
    </div>
  );
};
