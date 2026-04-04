'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/browse', label: 'Browse' },
  { href: '/staker', label: 'Vouches' },
  { href: '/agents', label: 'Agents' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [visible, setVisible] = useState(pathname !== '/');
  const isHome = pathname === '/';

  useEffect(() => {
    if (!isHome) {
      setVisible(true);
      return;
    }

    const onScroll = () => setVisible(window.scrollY > 300);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Only show nav links when authenticated
  const visibleLinks = user ? navLinks : [];

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: '#DBEAFE',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.3s ease',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 48px',
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            textDecoration: 'none',
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontStyle: 'italic',
            fontSize: '20px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.01em',
          }}
        >
          Veridex
        </Link>

        {/* Center nav links (desktop) */}
        <nav className="hidden md:flex" style={{ alignItems: 'center', gap: '0' }}>
          {visibleLinks.map((link, i) => {
            const isActive = pathname === link.href;
            return (
              <span key={link.href} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && (
                  <span
                    style={{
                      color: 'rgba(37,99,235,0.2)',
                      fontSize: '14px',
                      margin: '0 6px',
                    }}
                  >
                    ·
                  </span>
                )}
                <Link
                  href={link.href}
                  style={{
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    fontSize: '14px',
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? '#2563EB' : '#64748B',
                    textDecoration: 'none',
                    borderBottom: isActive
                      ? '1.5px solid #2563EB'
                      : '1.5px solid transparent',
                    paddingBottom: '1px',
                    transition: 'color 0.15s ease, border-color 0.15s ease',
                  }}
                >
                  {link.label}
                </Link>
              </span>
            );
          })}
        </nav>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#2563EB',
                }}
              >
                {user.wld_balance.toLocaleString()} WLD
              </span>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {user.display_name?.[0]?.toUpperCase() || '?'}
              </div>
              <button
                onClick={handleLogout}
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '13px',
                  color: '#94A3B8',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <Link href="/verify" className="btn-primary" style={{ fontSize: '13px', padding: '8px 20px' }}>
              Get Started
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#64748B',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {isMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div
          className="md:hidden"
          style={{
            padding: '12px 24px 16px',
            borderTop: '1px solid rgba(37,99,235,0.08)',
          }}
        >
          {visibleLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                style={{
                  display: 'block',
                  padding: '8px 0',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '14px',
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? '#2563EB' : '#64748B',
                  textDecoration: 'none',
                }}
              >
                {link.label}
              </Link>
            );
          })}
          {user && (
            <button
              onClick={handleLogout}
              style={{
                display: 'block',
                padding: '8px 0',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '14px',
                color: '#94A3B8',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
