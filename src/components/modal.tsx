'use client';

import { ReactNode, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, Mail } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  type?: 'success' | 'error' | 'info' | 'email';
  showCloseButton?: boolean;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  type = 'info',
  showCloseButton = true 
}: ModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle className="w-12 h-12 text-green-400" />,
    error: <AlertCircle className="w-12 h-12 text-red-400" />,
    info: <Info className="w-12 h-12 text-blue-400" />,
    email: <Mail className="w-12 h-12 text-purple-400" />,
  };

  const bgColors = {
    success: 'from-green-500/20 to-emerald-500/20',
    error: 'from-red-500/20 to-rose-500/20',
    info: 'from-blue-500/20 to-cyan-500/20',
    email: 'from-purple-500/20 to-pink-500/20',
  };

  const borderColors = {
    success: 'border-green-500/30',
    error: 'border-red-500/30',
    info: 'border-blue-500/30',
    email: 'border-purple-500/30',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-md bg-gradient-to-br ${bgColors[type]} bg-zinc-900 border ${borderColors[type]} rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Close button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={`p-3 rounded-full bg-gradient-to-br ${bgColors[type]}`}>
            {icons[type]}
          </div>
        </div>
        
        {/* Title */}
        {title && (
          <h2 className="text-xl font-bold text-white text-center mb-2">
            {title}
          </h2>
        )}
        
        {/* Content */}
        <div className="text-zinc-300 text-center">
          {children}
        </div>
      </div>
    </div>
  );
}

// Convenience component for success modal with email confirmation
interface EmailConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  email?: string;
}

export function EmailConfirmModal({ isOpen, onClose, email }: EmailConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      type="email"
      title="Check Your Email! 📧"
    >
      <div className="space-y-4">
        <p>
          We&apos;ve sent a confirmation link to{' '}
          {email && <span className="text-purple-400 font-medium">{email}</span>}
        </p>
        <p className="text-sm text-zinc-400">
          Click the link in your email to activate your account and start streaming!
        </p>
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Got it!
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Didn&apos;t receive the email? Check your spam folder or try registering again.
        </p>
      </div>
    </Modal>
  );
}

// Toast notification component
interface ToastProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

export function Toast({ isOpen, onClose, message, type = 'info', duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, duration]);

  if (!isOpen) return null;

  const bgColors = {
    success: 'bg-green-500/20 border-green-500/30 text-green-400',
    error: 'bg-red-500/20 border-red-500/30 text-red-400',
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm ${bgColors[type]}`}>
        {icons[type]}
        <span className="font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 hover:opacity-70 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
