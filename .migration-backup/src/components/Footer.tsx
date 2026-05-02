import Link from "next/link";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/configure", label: "Configure" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

const socials = [
  { href: "https://www.pinterest.com", label: "Pinterest" },
  { href: "https://www.instagram.com", label: "Instagram" },
];

export default function Footer() {
  return (
    <footer className="border-t border-cream-200 dark:border-charcoal-400 bg-cream-50 dark:bg-charcoal-500">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <p className="font-serif text-2xl text-charcoal-600 dark:text-cream-100">Alveo</p>
          <p className="text-sm text-charcoal-400 dark:text-cream-200 mt-2 max-w-xs">
            Custom closet planning designed around your wardrobe, your life, your space.
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-charcoal-400 dark:text-cream-300 mb-3">Navigate</p>
          <ul className="space-y-2 text-sm text-charcoal-500 dark:text-cream-100">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-charcoal-700 transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-charcoal-400 dark:text-cream-300 mb-3">Social</p>
          <ul className="space-y-2 text-sm text-charcoal-500 dark:text-cream-100">
            {socials.map((social) => (
              <li key={social.href}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-charcoal-700 transition-colors"
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-cream-200 dark:border-charcoal-400">
        <div className="max-w-7xl mx-auto px-6 py-4 text-xs text-charcoal-400 dark:text-cream-300 flex flex-wrap items-center gap-2">
          <span>© 2025 Alveo</span>
          <span>·</span>
          <Link href="/faq" className="hover:text-charcoal-600">Privacy</Link>
          <span>·</span>
          <a href="mailto:hello@alveo.design" className="hover:text-charcoal-600">Contact</a>
        </div>
      </div>
    </footer>
  );
}
