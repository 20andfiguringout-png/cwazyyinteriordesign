'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { signIn, signOut, useSession } from 'next-auth/react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/configure', label: 'Configure' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mentionUnreadCount, setMentionUnreadCount] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (!session?.user?.email) {
      setMentionUnreadCount(0);
      return;
    }

    const loadUnread = async () => {
      try {
        const res = await fetch('/api/design-comments?mentionMe=1', {
          cache: 'no-store',
        });
        if (!res.ok) {
          setMentionUnreadCount(0);
          return;
        }
        const data = (await res.json()) as { unreadCount?: number };
        setMentionUnreadCount(data.unreadCount ?? 0);
      } catch {
        setMentionUnreadCount(0);
      }
    };

    void loadUnread();
    const timer = setInterval(() => void loadUnread(), 15_000);
    return () => clearInterval(timer);
  }, [session?.user?.email]);

  const isHome = pathname === '/';

  const linksToRender = session?.user?.email
    ? [...navLinks, { href: '/admin/analytics', label: 'Analytics' }]
    : navLinks;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || !isHome
          ? 'bg-white/95 dark:bg-charcoal-500/95 backdrop-blur-sm shadow-sm border-b border-cream-200 dark:border-charcoal-400'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <Link href="/" className="group flex items-center gap-2">
          <span
            className={`font-serif text-2xl font-bold tracking-tight transition-colors ${
              scrolled || !isHome ? 'text-charcoal-600' : 'text-charcoal-600'
            }`}
          >
            Alvéo
          </span>
          <span
            className={`text-xs font-light tracking-widest uppercase transition-colors hidden sm:block ${
              scrolled || !isHome ? 'text-taupe-400' : 'text-taupe-500'
            }`}
          >
            Carved for you.
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {linksToRender.map(({ href, label }) => {
            const active = pathname === href;
            const showUnreadBadge = href === '/admin/analytics' && mentionUnreadCount > 0;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`relative text-sm font-medium tracking-wide transition-colors ${
                    active
                      ? 'text-charcoal-600'
                      : 'text-charcoal-400 hover:text-charcoal-600'
                  }`}
                >
                  {label}
                  {showUnreadBadge && (
                    <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-taupe-500 text-white text-[10px] leading-none">
                      {mentionUnreadCount}
                    </span>
                  )}
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
        </ul>

        {/* Desktop CTA */}
        <Link
          href="/configure"
          className="hidden md:inline-flex items-center gap-2 bg-charcoal-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-charcoal-500 transition-colors"
        >
          Start Designing
        </Link>

        {session?.user?.email ? (
          <button
            onClick={() => signOut()}
            className="hidden md:inline-flex items-center gap-2 bg-cream-100 dark:bg-charcoal-400 dark:text-cream-100 text-charcoal-600 text-sm font-medium px-4 py-2.5 rounded-lg"
          >
            Sign out
          </button>
        ) : (
          <button
            onClick={() => signIn()}
            className="hidden md:inline-flex items-center gap-2 bg-cream-100 dark:bg-charcoal-400 dark:text-cream-100 text-charcoal-600 text-sm font-medium px-4 py-2.5 rounded-lg"
          >
            Sign in
          </button>
        )}

        <button
          aria-label="Toggle dark mode"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="hidden md:inline-flex p-2 rounded-md text-charcoal-500 dark:text-cream-100 hover:bg-cream-100 dark:hover:bg-charcoal-400 transition-colors"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Mobile hamburger */}
        <button
          aria-label="Toggle menu"
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden p-2 rounded-md text-charcoal-500 hover:bg-cream-100 transition-colors"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="md:hidden bg-white border-b border-cream-200 px-6 pb-6 pt-2 space-y-1"
          >
            {linksToRender.map(({ href, label }) => {
              const showUnreadBadge = href === '/admin/analytics' && mentionUnreadCount > 0;
              return (
              <Link
                key={href}
                href={href}
                className={`block py-3 text-base font-medium border-b border-cream-100 last:border-0 transition-colors ${
                  pathname === href
                    ? 'text-charcoal-600'
                    : 'text-charcoal-400 hover:text-charcoal-600'
                }`}
              >
                <span className="inline-flex items-center">
                  {label}
                  {showUnreadBadge && (
                    <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-taupe-500 text-white text-[10px] leading-none">
                      {mentionUnreadCount}
                    </span>
                  )}
                </span>
              </Link>
            );})}
            <Link
              href="/configure"
              className="block mt-4 text-center bg-charcoal-600 text-white text-sm font-medium px-5 py-3 rounded-lg hover:bg-charcoal-500 transition-colors"
            >
              Start Designing
            </Link>
            {session?.user?.email ? (
              <button
                onClick={() => signOut()}
                className="w-full mt-2 text-center bg-cream-100 dark:bg-charcoal-400 dark:text-cream-100 text-charcoal-600 text-sm font-medium px-5 py-3 rounded-lg transition-colors"
              >
                Sign out
              </button>
            ) : (
              <button
                onClick={() => signIn()}
                className="w-full mt-2 text-center bg-cream-100 dark:bg-charcoal-400 dark:text-cream-100 text-charcoal-600 text-sm font-medium px-5 py-3 rounded-lg transition-colors"
              >
                Sign in
              </button>
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
