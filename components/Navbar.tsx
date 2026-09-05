'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function Navbar() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single();
        if (data) setUsername(data.username);
      }
    }
    fetchUser();
  }, [supabase]);

  // Hide navbar on the immersive focus page or auth pages
  if (pathname.includes('/focus') || pathname === '/') return null;

  const navLinks = [
    { name: 'Today', href: '/dashboard' },
    { name: 'Analytics', href: '/analytics' },
    { name: 'Rooms', href: '/explore' }, // Your existing Jitsi rooms page
  ];

  return (
    <nav className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xl leading-none tracking-tighter">P</span>
          </div>
          <span className="font-black text-xl tracking-tight text-gray-900 hidden sm:block">
            Productivholic
          </span>
        </Link>

        {/* Center Links */}
        <div className="flex items-center gap-1 md:gap-4">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                  isActive 
                    ? 'bg-gray-900 text-white shadow-md' 
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Profile Link */}
        <div>
          {username ? (
            <Link 
              href={`/profile/${username}`}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                pathname.includes('/profile')
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              Profile
            </Link>
          ) : (
            <div className="w-16 h-8 animate-pulse bg-gray-200 rounded-lg"></div>
          )}
        </div>
      </div>
    </nav>
  );
}