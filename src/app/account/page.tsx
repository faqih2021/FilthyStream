'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  User, 
  Mail, 
  Key, 
  LogOut, 
  Loader2, 
  Check, 
  AlertCircle,
  ArrowLeft,
  Shield,
  Camera,
  Trash2,
  X
} from 'lucide-react';

export default function AccountPage() {
  const { user, loading, logout, refreshUser } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Profile photo state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Redirect if not authenticated (using useEffect to avoid render error)
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  // Set preview from existing avatar
  useEffect(() => {
    if (user?.image) {
      setPreviewUrl(user.image);
    }
  }, [user?.image]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setPhotoMessage({ type: 'error', text: 'Please select an image file' });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setPhotoMessage({ type: 'error', text: 'Image must be less than 5MB' });
        return;
      }
      
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPhotoMessage(null);
    }
  };

  const handleSavePhoto = async () => {
    if (!selectedFile || !user) return;
    
    setPhotoLoading(true);
    setPhotoMessage(null);

    try {
      // Delete old avatar if exists
      if (user.image) {
        const oldPath = user.image.split('/avatars/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload new avatar
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: urlData.publicUrl }
      });

      if (updateError) {
        throw updateError;
      }

      setPhotoMessage({ type: 'success', text: 'Profile photo updated!' });
      setSelectedFile(null);
      await refreshUser();
    } catch (error) {
      console.error('Upload error:', error);
      setPhotoMessage({ type: 'error', text: 'Failed to upload photo' });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!user?.image) return;
    
    setPhotoLoading(true);
    setPhotoMessage(null);

    try {
      // Delete from storage
      const oldPath = user.image.split('/avatars/').pop();
      if (oldPath) {
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      });

      if (error) {
        throw error;
      }

      setPreviewUrl(null);
      setShowDeleteConfirm(false);
      setPhotoMessage({ type: 'success', text: 'Profile photo deleted!' });
      await refreshUser();
    } catch (error) {
      console.error('Delete error:', error);
      setPhotoMessage({ type: 'error', text: 'Failed to delete photo' });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleCancelPhotoEdit = () => {
    setSelectedFile(null);
    setPreviewUrl(user?.image || null);
    setPhotoMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setPasswordMessage({ type: 'error', text: error.message });
      } else {
        setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
        setNewPassword('');
        setConfirmPassword('');
        setIsChangingPassword(false);
      }
    } catch {
      setPasswordMessage({ type: 'error', text: 'Failed to update password' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const hasUnsavedPhoto = selectedFile !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        {/* Header with Profile Photo */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            {/* Avatar */}
            <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-purple-500/30 overflow-hidden">
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'
              )}
            </div>
            
            {/* Camera Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={photoLoading}
              className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center text-white shadow-lg transition-colors disabled:opacity-50"
            >
              <Camera className="w-5 h-5" />
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          
          {/* Photo Actions */}
          {hasUnsavedPhoto && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={handleSavePhoto}
                disabled={photoLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {photoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Photo
              </button>
              <button
                onClick={handleCancelPhotoEdit}
                disabled={photoLoading}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
          
          {/* Delete Photo Button */}
          {!hasUnsavedPhoto && user.image && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={photoLoading}
              className="mt-4 px-4 py-2 text-red-400 hover:text-red-300 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              <Trash2 className="w-4 h-4" />
              Remove Photo
            </button>
          )}
          
          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm mb-3">Are you sure you want to delete your profile photo?</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleDeletePhoto}
                  disabled={photoLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {photoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={photoLoading}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Photo Message */}
          {photoMessage && (
            <div className={`mt-4 flex items-center justify-center gap-2 text-sm ${photoMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {photoMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {photoMessage.text}
            </div>
          )}
          
          <h1 className="text-3xl font-bold text-white mt-4">
            {user.username || 'User'}
          </h1>
        </div>

        {/* Account Info Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            Account Information
          </h2>

          <div className="space-y-4">
            {/* Email */}
            <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-white">{user.email || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <Check className="w-4 h-4" />
                Verified
              </div>
            </div>

            {/* Username */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Username</p>
                  <p className="text-white">@{user.username || 'Not set'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            Security
          </h2>

          {!isChangingPassword ? (
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-white">Password</p>
                  <p className="text-sm text-gray-400">••••••••••••</p>
                </div>
              </div>
              <button
                onClick={() => setIsChangingPassword(true)}
                className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg text-sm font-medium transition-colors"
              >
                Change Password
              </button>
            </div>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter new password"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                />
              </div>

              {passwordMessage && (
                <div className={`flex items-center gap-2 text-sm ${passwordMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {passwordMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {passwordMessage.text}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {passwordLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Key className="w-5 h-5" />
                      Update Password
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordMessage(null);
                  }}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full py-4 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </div>
  );
}
