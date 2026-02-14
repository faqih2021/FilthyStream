'use client'

import { useState } from 'react'
import { Globe, Radio, Zap, ArrowRight, Loader2, Home, ListMusic, ChevronRight, ChevronLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/auth-context'

const LOGO_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logo-etc/filthystream-logo.png`
import { Player } from './player'
import { Queue } from './queue'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuth()
  const [queueOpen, setQueueOpen] = useState(true)
  
  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/stations', icon: Radio, label: 'My Stations' },
  ]
  
  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--card-bg)] border-r border-[var(--border)] flex flex-col h-full flex-shrink-0">
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
        
        {/* Create Station */}
        <div className="p-4 border-t border-[var(--border)] space-y-3">
          <Link
            href="/stations/create"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            <Zap className="w-5 h-5" />
            Create Station
          </Link>
          
          {/* User Info */}
          {authLoading ? (
            <div className="flex items-center justify-center p-3 bg-zinc-800/50 rounded-lg">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              <span className="ml-2 text-sm text-zinc-400">Loading...</span>
            </div>
          ) : user ? (
            <Link
              href="/account"
              className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-700/50 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                  {user.image ? (
                    <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.name || user.username || 'User'}</p>
                  <p className="text-xs text-zinc-500 truncate">@{user.username || 'user'}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
          
          {/* Queue Sidebar Toggle Button */}
          <button
            onClick={() => setQueueOpen(!queueOpen)}
            className="w-10 flex-shrink-0 bg-[var(--card-bg)] border-l border-[var(--border)] flex items-center justify-center hover:bg-white/5 transition-colors group"
            title={queueOpen ? 'Hide Queue' : 'Show Queue'}
          >
            <div className="flex flex-col items-center gap-2">
              <ListMusic className="w-5 h-5 text-gray-400 group-hover:text-purple-400" />
              {queueOpen ? (
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-500 group-hover:text-purple-400" />
              )}
            </div>
          </button>
          
          {/* Queue Sidebar */}
          <aside
            className={`bg-[var(--card-bg)] border-l border-[var(--border)] flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
              queueOpen ? 'w-80' : 'w-0'
            }`}
          >
            <div className="w-80 h-full">
              <Queue />
            </div>
          </aside>
        </div>
        
        {/* Player Footer */}
        <Player />
      </div>
    </div>
  )
}
