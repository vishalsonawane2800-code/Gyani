import type { Metadata } from 'next'
import { DM_Sans, Sora } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const dmSans = DM_Sans({ 
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"]
});

const sora = Sora({ 
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "500", "600", "700", "800"]
});

export const metadata: Metadata = {
  title: 'IPOGyani - Live IPO GMP, AI Listing Gain Predictions & Subscription 2026',
  description: 'India\'s smartest IPO platform. Live GMP tracker, AI-predicted listing gains, real-time subscription data, market sentiment and expert reviews for all mainboard & SME IPOs 2026.',
  keywords: 'IPO GMP today 2026, upcoming IPO India, IPO listing gain prediction, IPO subscription live, IPO allotment status, SME IPO GMP, grey market premium',
  generator: 'IPOGyani',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.jpg',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.jpg',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: '/apple-icon.jpg',
  },
  openGraph: {
    type: 'website',
    title: 'IPOGyani - Live IPO GMP & AI Predictions',
    description: 'India\'s smartest IPO research platform with live GMP, AI predictions and subscription data.',
    siteName: 'IPOGyani',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${sora.variable}`}>
      <body className="font-sans antialiased overflow-x-hidden">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
