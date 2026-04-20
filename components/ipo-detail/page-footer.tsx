import { AlertCircle, ExternalLink, FileText, Users } from 'lucide-react';
import type { IPO } from '@/lib/data';

interface PageFooterProps {
  ipo: IPO;
}

// Fallback map keyed by registrar name. Used when the admin has not
// provided a per-IPO allotment URL on the IPO record itself.
const registrarUrls: Record<string, string> = {
  'KFin Technologies': 'https://kosmic.kfintech.com/ipostatus/',
  'Link Intime': 'https://linkintime.co.in/MIPO/Ipoallotment.html',
  'Link Intime India': 'https://linkintime.co.in/MIPO/Ipoallotment.html',
  'Bigshare Services': 'https://www.bigshareonline.com/IPOStatus.aspx',
  'Skyline Financial': 'https://ipo.bigshareonline.com/',
  'Cameo Corporate': 'https://ipostatus.cameoindia.com/',
};

// Allotment button is only meaningful between allotment day and listing day.
// For open / lastday / upcoming / closed statuses, the registrar won't have
// anything to show, so we hide the block entirely.
const ALLOTMENT_VISIBLE_STATUSES: IPO['status'][] = ['allot', 'listing'];

interface DocumentLink {
  label: string;
  url: string;
  description: string;
  icon: typeof FileText;
}

export function PageFooter({ ipo }: PageFooterProps) {
  const allotmentUrl =
    ipo.allotmentUrl?.trim() ||
    (ipo.registrar ? registrarUrls[ipo.registrar] : undefined) ||
    null;

  const showAllotment =
    ALLOTMENT_VISIBLE_STATUSES.includes(ipo.status) && !!allotmentUrl;

  const gridCols = showAllotment
    ? 'grid-cols-1 md:grid-cols-2'
    : 'grid-cols-1';

  // Collect only the document URLs the admin has actually filled in.
  // Each button links to the underlying PDF / exchange announcement.
  const documentLinks: DocumentLink[] = [
    ipo.drhpUrl?.trim() && {
      label: 'DRHP',
      url: ipo.drhpUrl.trim(),
      description: 'Draft Red Herring Prospectus',
      icon: FileText,
    },
    ipo.rhpUrl?.trim() && {
      label: 'RHP',
      url: ipo.rhpUrl.trim(),
      description: 'Red Herring Prospectus',
      icon: FileText,
    },
    ipo.anchorInvestorsUrl?.trim() && {
      label: 'Anchor Investors',
      url: ipo.anchorInvestorsUrl.trim(),
      description: 'Anchor allotment disclosure',
      icon: Users,
    },
  ].filter(Boolean) as DocumentLink[];

  return (
    <div className="mt-10 border-t border-border pt-8">
      <div className={`grid ${gridCols} gap-6`}>
        {/* Check Allotment - only visible once allotment has started */}
        {showAllotment && (
          <div className="bg-primary-bg border border-primary/20 rounded-2xl p-6">
            <h3 className="font-[family-name:var(--font-sora)] text-lg font-bold mb-2">
              Check Allotment Status
            </h3>
            <p className="text-[13px] text-ink3 mb-4">
              Check your {ipo.name} IPO allotment status on the registrar website.
            </p>
            <div className="flex items-center gap-3 mb-4 p-3 bg-background rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="font-bold text-primary text-sm">R</span>
              </div>
              <div>
                <p className="text-[12px] font-semibold">{ipo.registrar}</p>
                <p className="text-[11px] text-ink3">IPO Registrar</p>
              </div>
            </div>
            <a
              href={allotmentUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-primary text-white text-[13px] font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              Check Allotment Status
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-gold-bg/50 border border-gold/20 rounded-2xl p-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
            <div>
              <h3 className="font-[family-name:var(--font-sora)] text-lg font-bold text-gold mb-2">
                Disclaimer
              </h3>
              <div className="space-y-2 text-[12px] text-gold/90 leading-relaxed">
                <p>
                  IPOGyani is <strong>not SEBI registered</strong> and does not provide investment advice.
                  All information is for educational purposes only.
                </p>
                <p>
                  AI predictions are probabilistic estimates based on historical data and market trends.
                  Past performance is not indicative of future results.
                </p>
                <p>
                  GMP (Grey Market Premium) data is sourced from various unofficial channels and may not be accurate.
                  Always verify from multiple sources.
                </p>
                <p className="font-semibold">
                  Investors should do their own research (DYOR) and consult a SEBI registered advisor before investing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Official Documents row - only rendered when the admin has set at
          least one URL. Each button opens the PDF / announcement in a new tab. */}
      {documentLinks.length > 0 && (
        <div className="mt-6 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-[family-name:var(--font-sora)] text-lg font-bold">
                Official Documents
              </h3>
              <p className="text-[12px] text-ink3 mt-0.5">
                Prospectus filings and anchor allotment disclosures from {ipo.name}.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {documentLinks.map((doc) => {
              const Icon = doc.icon;
              return (
                <a
                  key={doc.label}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-background hover:border-primary hover:bg-primary-bg transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold truncate">{doc.label}</p>
                    <p className="text-[11px] text-ink3 truncate">{doc.description}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-ink4 group-hover:text-primary shrink-0" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
