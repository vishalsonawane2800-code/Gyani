'use client';

import { ExternalLink } from 'lucide-react';

interface ScrollButtonsProps {
  ipoName?: string;
  ipoSlug?: string;
}

export function ScrollButtons({ ipoName = 'Powerica Limited', ipoSlug = 'powerica-limited-ipo' }: ScrollButtonsProps) {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // KFin Tech URL for allotment status check
  const kfinAllotmentUrl = 'https://www.kfintech.com/';

  // DRHP URLs for NSE and BSE (generic - can be customized per IPO)
  const nsedrHPUrl = 'https://www.nseindia.com/';
  const bseDrHPUrl = 'https://www.bseindia.com/';

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button 
          onClick={() => scrollToSection('gmp-section')}
          className="py-2 px-4 rounded-lg text-[12px] font-bold bg-secondary text-ink2 border border-border transition-colors hover:bg-border"
        >
          GMP Graph
        </button>
        <button 
          onClick={() => scrollToSection('subscription-section')}
          className="py-2 px-4 rounded-lg text-[12px] font-bold bg-secondary text-ink2 border border-border transition-colors hover:bg-border"
        >
          Subscription Graph
        </button>
        <a 
          href={kfinAllotmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 px-4 rounded-lg text-[12px] font-semibold bg-primary text-white border border-primary transition-colors hover:opacity-90 ml-auto flex items-center gap-1.5"
        >
          Check Allotment Status
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* DRHP Links Section */}
      <div className="pt-3 border-t border-border">
        <p className="text-[11px] font-semibold text-ink3 mb-2">DRHP & Documents</p>
        <div className="flex gap-2 flex-wrap">
          <a 
            href={nsedrHPUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-1.5 px-3 rounded-lg text-[11px] font-medium bg-muted text-ink2 border border-border transition-colors hover:bg-secondary flex items-center gap-1"
          >
            NSE DRHP
            <ExternalLink className="w-3 h-3" />
          </a>
          <a 
            href={bseDrHPUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-1.5 px-3 rounded-lg text-[11px] font-medium bg-muted text-ink2 border border-border transition-colors hover:bg-secondary flex items-center gap-1"
          >
            BSE DRHP
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
