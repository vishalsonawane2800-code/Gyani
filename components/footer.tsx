import Link from 'next/link';
import Image from 'next/image';

const footerLinks = {
  ipoLists: [
    { label: 'Listed IPO 2026', href: '/listed' },
    { label: 'Listed IPO 2025', href: '/listed?year=2025' },
    { label: 'Listed IPO 2024', href: '/listed?year=2024' },
    { label: 'SME IPO List', href: '/listed?exchange=sme' },
    { label: 'Mainboard IPO List', href: '/listed?exchange=mainboard' },
  ],
  tools: [
    { label: 'GMP Tracker', href: '/#gmp' },
    { label: 'Live Subscription', href: '/#current' },
    { label: 'Allotment Check', href: '/allotment' },
    { label: 'AI Accuracy', href: '/accuracy' },
  ],
  info: [
    { label: 'About IPOGyani', href: '/about' },
    { label: 'Methodology', href: '/methodology' },
    { label: 'Contact', href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Disclaimer', href: '/disclaimer' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-foreground text-white/55 pt-11 pb-6 px-5">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-8">
          {/* Brand */}
          <div>
            <Image 
              src="/images/logo.png" 
              alt="IPOGyani" 
              width={198} 
              height={53}
              className="h-[53px] w-auto mb-3 brightness-0 invert"
            />
            <p className="text-sm leading-relaxed max-w-xs text-white/50">
              {"India's most intelligent IPO research platform. Live GMP, AI predictions, and India's most complete listed IPO database."}
            </p>
          </div>

          {/* IPO Lists */}
          <div>
            <h4 className="text-xs font-extrabold tracking-wider uppercase text-white/35 mb-3">
              IPO Lists
            </h4>
            {footerLinks.ipoLists.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-sm text-white/55 mb-2 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Tools */}
          <div>
            <h4 className="text-xs font-extrabold tracking-wider uppercase text-white/35 mb-3">
              Tools
            </h4>
            {footerLinks.tools.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-sm text-white/55 mb-2 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Info */}
          <div>
            <h4 className="text-xs font-extrabold tracking-wider uppercase text-white/35 mb-3">
              Info
            </h4>
            {footerLinks.info.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-sm text-white/55 mb-2 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-wrap justify-between items-center pt-5 border-t border-white/10 text-xs gap-2">
          <span>2026 IPOGyani. All rights reserved</span>
          <span>Privacy. Terms. Disclaimer. Contact</span>
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-white/30 mt-4 leading-relaxed border-t border-white/5 pt-4">
          Disclaimer: IPOGyani is not SEBI registered. All content is for informational purposes only. 
          Listing gain data sourced from BSE/NSE official records. AI predictions are probabilistic - NOT investment advice.
        </p>
      </div>
    </footer>
  );
}
