import { AlertCircle } from 'lucide-react';
import type { IPO } from '@/lib/data';
import { formatDate } from '@/lib/data';

interface DetailSidebarProps {
  ipo: IPO;
}

export function DetailSidebar({ ipo }: DetailSidebarProps) {
  const keyDates = [
    { label: 'Open Date', date: formatDate(ipo.openDate), status: 'done' },
    { label: 'Close Date', date: formatDate(ipo.closeDate), status: ipo.status === 'lastday' ? 'active' : ipo.status === 'upcoming' || ipo.status === 'open' ? 'upcoming' : 'done' },
    { label: 'Allotment', date: 'TBA', status: ipo.status === 'allot' ? 'active' : ipo.status === 'listing' ? 'done' : 'upcoming' },
    { label: 'Listing Date', date: formatDate(ipo.listDate), status: ipo.status === 'listing' ? 'active' : 'upcoming' },
  ];

  return (
    <aside className="hidden lg:flex flex-col gap-4 sticky top-20">
      {/* Key Dates */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border bg-secondary">
          <h3 className="text-[13px] font-bold">Key Dates</h3>
        </div>
        <div className="p-4">
          {keyDates.map((item, index) => (
            <div 
              key={index}
              className={`flex items-center gap-3 py-2.5 ${
                index !== keyDates.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                item.status === 'done' ? 'bg-emerald-mid' : 
                item.status === 'active' ? 'bg-gold-mid animate-pulse' : 'bg-ink4'
              }`} />
              <span className="text-[12.5px] text-ink3 flex-1">{item.label}</span>
              <span className={`text-[12.5px] font-medium ${item.status === 'active' ? 'text-gold-mid' : ''}`}>
                {item.date}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Registrar Info */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border bg-secondary">
          <h3 className="text-[13px] font-bold">Check Allotment</h3>
        </div>
        <div className="p-4">
          <p className="text-[12px] text-ink3 mb-3">Registrar: {ipo.registrar}</p>
          <input
            type="text"
            placeholder="Enter PAN Number"
            className="w-full border-[1.5px] border-border-secondary rounded-lg py-2 px-3 text-[13px] mb-2 outline-none focus:border-primary-mid bg-card text-foreground placeholder:text-ink4"
            maxLength={10}
          />
          <button className="w-full bg-gradient-to-br from-primary to-cobalt text-white text-[13px] font-bold py-2.5 rounded-lg hover:opacity-90 transition-opacity">
            Check Status
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-gold-bg border border-gold/20 rounded-2xl p-4">
        <div className="flex gap-2">
          <AlertCircle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] text-gold font-semibold mb-1">Disclaimer</p>
            <p className="text-[10.5px] text-gold/80 leading-relaxed">
              IPOGyani is not SEBI registered. AI predictions are probabilistic and NOT investment advice. 
              Always do your own research before investing.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
