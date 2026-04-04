'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { User } from '@/types';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // TODO: Get current user from auth context/session
    // Placeholder: check if user is logged in
  }, []);

  const navLinks = [
    { href: '/browse', label: 'Browse Workers' },
    ...(user?.roles.includes('worker') ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
    ...(user?.roles.includes('staker') ? [{ href: '/staker', label: 'Portfolio' }] : []),
    ...(user ? [{ href: '/agents', label: 'Agents' }] : []),
  ];

  return (
    <nav className="bg-worldcoin-gray-800 border-b border-worldcoin-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-veridex-primary to-veridex-secondary rounded-lg flex items-center justify-center font-bold text-white">
              V
            </div>
            <span className="text-xl font-bold">Veridex</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-worldcoin-gray-300 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Section */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* WLD Balance Badge */}
                <div className="hidden sm:flex items-center gap-1 px-3 py-1 bg-worldcoin-gray-700 rounded-full text-sm">
                  <span className="text-veridex-primary font-medium">{user.wld_balance.toLocaleString()}</span>
                  <span className="text-worldcoin-gray-400">WLD</span>
                </div>
                {/* User Display */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-veridex-primary rounded-full flex items-center justify-center text-sm font-medium">
                    {user.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="hidden sm:inline text-sm">{user.display_name}</span>
                </div>
              </>
            ) : (
              <Link href="/verify" className="btn-primary text-sm">
                Get Started
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-worldcoin-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-worldcoin-gray-700">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2 text-worldcoin-gray-300 hover:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
