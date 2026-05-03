import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon, LogIn, LayoutDashboard, LogOut, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/AuthContext';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/studio', label: 'Studio' },
  { href: '/builder', label: 'Builder' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
];

export default function Navbar() {
  const [pathname] = useLocation();
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); setUserMenuOpen(false); }, [pathname]);

  const isHome = pathname === '/';
  const displayName = user?.firstName ?? user?.email?.split('@')[0] ?? 'Account';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || !isHome
          ? 'bg-white/95 dark:bg-charcoal-500/95 backdrop-blur-sm shadow-sm border-b border-cream-200 dark:border-charcoal-400'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-2 min-w-0">
          <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight transition-colors text-charcoal-600">
            Alvéo
          </span>
          <span className={`text-[10px] sm:text-xs font-light tracking-widest uppercase transition-colors hidden sm:block truncate ${
            scrolled || !isHome ? 'text-taupe-400' : 'text-taupe-500'
          }`}>
            Carved for you.
          </span>
        </Link>

        <ul className="hidden md:flex items-center gap-6">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`relative text-sm font-medium tracking-wide transition-colors ${
                    active ? 'text-charcoal-600' : 'text-charcoal-400 hover:text-charcoal-600'
                  }`}
                >
                  {label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-taupe-400 rounded-full"
                    />
                  )}
                </Link>
              </li>
            );
          })}
          {user && (
            <li>
              <Link
                href="/clients"
                className={`relative text-sm font-medium tracking-wide transition-colors ${
                  pathname === '/clients' ? 'text-charcoal-600' : 'text-charcoal-400 hover:text-charcoal-600'
                }`}
              >
                Clients
              </Link>
            </li>
          )}
        </ul>

        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/configure"
            className="inline-flex items-center gap-2 bg-charcoal-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-charcoal-500 transition-colors shadow-sm"
          >
            Start Designing
          </Link>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cream-300 text-charcoal-600 hover:bg-cream-50 text-sm font-medium transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-taupe-200 flex items-center justify-center text-taupe-700 text-xs font-bold shrink-0">
                  {displayName[0]?.toUpperCase()}
                </div>
                <span className="max-w-24 truncate">{displayName}</span>
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-white border border-cream-200 rounded-xl shadow-lg py-1 z-50"
                  >
                    <div className="px-4 py-2 border-b border-cream-100">
                      <p className="text-xs text-charcoal-400 truncate">{user.email}</p>
                    </div>
                    <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal-600 hover:bg-cream-50">
                      <LayoutDashboard size={15} /> Dashboard
                    </Link>
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal-500 hover:bg-cream-50 w-full text-left"
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-cream-100 text-charcoal-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-cream-200 transition-colors"
            >
              <LogIn size={15} />
              Sign in
            </Link>
          )}

          <button
            aria-label="Toggle dark mode"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-md text-charcoal-500 dark:text-cream-100 hover:bg-cream-100 dark:hover:bg-charcoal-400 transition-colors"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <button
          aria-label="Toggle menu"
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden p-2 rounded-md text-charcoal-500 hover:bg-cream-100 transition-colors shrink-0"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="md:hidden bg-white/98 backdrop-blur border-b border-cream-200 px-4 sm:px-6 pb-6 pt-2 space-y-1"
          >
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`block py-3 text-base font-medium border-b border-cream-100 last:border-0 transition-colors ${
                  pathname === href ? 'text-charcoal-600' : 'text-charcoal-400 hover:text-charcoal-600'
                }`}
              >
                {label}
              </Link>
            ))}
            {user && (
              <>
                <Link href="/clients" className="block py-3 text-base font-medium border-b border-cream-100 text-charcoal-400 hover:text-charcoal-600">
                  Clients
                </Link>
                <Link href="/dashboard" className="block py-3 text-base font-medium border-b border-cream-100 text-charcoal-400 hover:text-charcoal-600">
                  Dashboard
                </Link>
              </>
            )}
            <Link
              href="/configure"
              className="block mt-4 text-center bg-charcoal-600 text-white text-sm font-medium px-5 py-3 rounded-lg hover:bg-charcoal-500 transition-colors"
            >
              Start Designing
            </Link>
            {user ? (
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="block w-full mt-2 text-center bg-cream-100 text-charcoal-600 text-sm font-medium px-5 py-3 rounded-lg hover:bg-cream-200 transition-colors"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                className="block mt-2 text-center bg-cream-100 text-charcoal-600 text-sm font-medium px-5 py-3 rounded-lg hover:bg-cream-200 transition-colors"
              >
                Sign in
              </Link>
            )}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full mt-2 text-center bg-cream-100 dark:bg-charcoal-400 dark:text-cream-100 text-charcoal-600 text-sm font-medium px-5 py-3 rounded-lg transition-colors"
            >
              {theme === 'dark' ? 'Use Light Mode' : 'Use Dark Mode'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
