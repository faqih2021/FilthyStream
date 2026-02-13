'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Mail, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { getSupabase } from '@/lib/supabase';

const LOGO_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logo-etc/filthystream-logo.png`;

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorCode('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setErrorCode(data.code || '');
        return;
      }

      // Sync session with client-side Supabase
      if (data.session?.accessToken && data.session?.refreshToken) {
        await getSupabase().auth.setSession({
          access_token: data.session.accessToken,
          refresh_token: data.session.refreshToken,
        });
      }

      // Redirect to home on success
      router.push('/');
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image src={LOGO_URL} alt="FilthyStream" width={48} height={48} className="w-12 h-12 rounded-xl object-cover" />
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              FilthyStream
            </span>
          </Link>
          <p className="text-zinc-400 mt-2">Welcome back! Sign in to continue.</p>
        </div>

        {/* Login Form */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className={`px-4 py-3 rounded-lg text-sm ${
                errorCode === 'email_not_confirmed' 
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' 
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                <div className="flex items-start gap-2">
                  {errorCode === 'email_not_confirmed' ? (
                    <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p>{error}</p>
                    {errorCode === 'email_not_confirmed' && (
                      <p className="mt-1 text-xs text-amber-400/70">
                        Check your inbox and spam folder for the confirmation link.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Email or Username
              </label>
              <input
                type="text"
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Enter your email or username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pr-10"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="text-center">
              <Link 
                href="/forgot-password" 
                className="text-sm text-zinc-400 hover:text-purple-400 transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-zinc-400 text-sm">
              Don't have an account?{' '}
              <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-500 text-xs mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
