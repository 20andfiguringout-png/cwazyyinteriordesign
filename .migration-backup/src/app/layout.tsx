import './globals.css'
import { Inter, Playfair_Display } from 'next/font/google'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Metadata } from 'next'
import { AppProviders } from '@/components/AppProviders'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: {
    default: 'Alvéo - Carved for you',
    template: '%s | Alvéo',
  },
  description: 'Custom closet layouts designed around your wardrobe, your life, your space',
  openGraph: {
    title: 'Alvéo - Carved for you',
    description: 'Custom closet layouts designed around your wardrobe, your life, your space',
    images: ['/og-closet.svg'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Alvéo - Carved for you',
    description: 'Custom closet layouts designed around your wardrobe, your life, your space',
    images: ['/og-closet.svg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans bg-cream-50 text-charcoal-500 dark:bg-charcoal-600 dark:text-cream-100 transition-colors">
        <AppProviders>
          <Navbar />
          {children}
          <Footer />
        </AppProviders>
      </body>
    </html>
  )
}