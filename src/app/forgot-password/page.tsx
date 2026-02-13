'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { Mail, ArrowLeft, Loader2, Check, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ 
          type: 'success', 
          text: 'Check your email! We sent you a link to reset your password.' 
        });
        setEmail('');
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Back to Login */}
        <Link 
          href="/login"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        {/* Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Forgot Password?</h1>
            <p className="text-gray-400 mt-2">
              No worries! Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="Enter your email"
                required
              />
            </div>

            {message && (
              <div className={`flex items-start gap-2 p-4 rounded-xl ${
                message.type === 'success' 
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                {message.type === 'success' ? (
                  <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                )}
                <p className="text-sm">{message.text}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-gray-400 mt-6 text-sm">
            Remember your password?{' '}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
