'use client'

import { Radio, Music, ListMusic, Plus, Home, User, LogIn } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/auth-context'

const LOGO_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logo-etc/filthystream-logo.png`

export function Sidebar() {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  
  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/stations', icon: Radio, label: 'Stations' },
    { href: '/playlists', icon: ListMusic, label: 'Playlists' },
    { href: '/library', icon: Music, label: 'Library' },
  ]
  
  return (
    <aside className="w-64 bg-[var(--card-bg)] border-r border-[var(--border)] flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-[var(--border)]">
        <Link href="/" className="flex items-center gap-3">
          <Image src={LOGO_URL} alt="FilthyStream" width={40} height={40} className="w-10 h-10 rounded-xl object-cover" />
          <span className="text-xl font-bold gradient-text">FilthyStream</span>
        </Link>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
      
      {/* Create Station Button */}
      <div className="p-4 border-t border-[var(--border)]">
        <Link
          href="/stations/create"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          Create Station
        </Link>
      </div>
      
      {/* Account Section */}
      <div className="p-4 border-t border-[var(--border)]">
        {loading ? (
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        ) : user ? (
          <Link
            href="/account"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              pathname === '/account'
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white">
              {user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.name || user.username || 'Account'}</p>
              <p className="text-xs text-gray-500 truncate">@{user.username || 'user'}</p>
            </div>
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <LogIn className="w-5 h-5" />
            <span className="font-medium">Sign In</span>
          </Link>
        )}
      </div>
    </aside>
  )
}
