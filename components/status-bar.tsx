import { currentIPOs } from '@/lib/data';
import { Calendar, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

const statusNodes = [
  { id: 'open', label: 'Open Soon', sub: 'Next 3 days', icon: Calendar, accentClass: 'text-cobalt-mid' },
  { id: 'lastday', label: 'Last Day', sub: 'Closes today', icon: Clock, accentClass: 'text-gold-mid' },
  { id: 'allot', label: 'Allotment', sub: 'Today', icon: CheckCircle2, accentClass: 'text-primary' },
  { id: 'listing', label: 'Listing', sub: 'Today', icon: TrendingUp, accentClass: 'text-emerald-mid' },
];

const getCounts = () => {
  const counts: Record<string, number> = { open: 0, lastday: 0, allot: 0, listing: 0 };
  currentIPOs.forEach((ipo) => {
    if (ipo.status === 'upcoming') counts.open++;
    else if (counts[ipo.status] !== undefined) counts[ipo.status]++;
  });
  return counts;
};

export function StatusBar() {
  const counts = getCounts();

  return (
    <div className="bg-card border-b border-border px-4 sm:px-5">
      <div className="max-w-[1440px] mx-auto">
        {/* Stats Row - 2x2 grid on mobile, 4 columns on tablet+ */}
        <div className="py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-0">
            {statusNodes.map((node, index) => {
              const Icon = node.icon;
              const count = counts[node.id] || 0;
              
              return (
                <button
                  key={node.id}
                  className="group flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-2 cursor-pointer transition-all hover:bg-secondary/50 rounded-lg relative"
                >
                  {/* Icon */}
                  <div className={`${node.accentClass} opacity-70 group-hover:opacity-100 transition-opacity`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.75} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex flex-col items-start min-w-0">
                    <div className="flex items-baseline gap-1 sm:gap-1.5">
                      <span className={`font-[family-name:var(--font-sora)] text-lg sm:text-xl md:text-2xl font-extrabold leading-none ${node.accentClass}`}>
                        {count}
                      </span>
                      <span className="text-[10px] sm:text-[11px] md:text-[12px] font-semibold text-ink2 truncate">
                        {node.label}
                      </span>
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-ink4 font-medium truncate">
                      {node.sub}
                    </span>
                  </div>
                  
                  {/* Divider - only show on md+ between items */}
                  {index < statusNodes.length - 1 && (
                    <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-px h-8 bg-border" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
