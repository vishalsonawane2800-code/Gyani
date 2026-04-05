import { currentIPOs } from '@/lib/data';

const statusNodes = [
  { id: 'open', label: 'Open Soon', sub: 'Next 3 days', dotClass: 'bg-cobalt-mid shadow-[0_0_0_3px_rgba(59,130,246,.2)]' },
  { id: 'lastday', label: 'Last Day', sub: 'Closes today', dotClass: 'bg-gold-mid shadow-[0_0_0_3px_rgba(245,158,11,.2)] animate-pulse' },
  { id: 'allot', label: 'Allotment', sub: 'Today', dotClass: 'bg-primary-mid shadow-[0_0_0_3px_rgba(124,58,237,.2)]' },
  { id: 'listing', label: 'Listing', sub: 'Today', dotClass: 'bg-emerald-mid shadow-[0_0_0_3px_rgba(0,179,119,.2)] animate-pulse' },
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
    <div className="bg-card border-b-2 border-border px-5">
      <div className="max-w-[1440px] mx-auto flex items-center min-h-[72px] py-2">
        {/* Label */}
        <span className="text-[10.5px] font-extrabold tracking-wider uppercase text-ink4 whitespace-nowrap pr-5 border-r-[1.5px] border-border shrink-0 hidden sm:block">
          IPO Status
        </span>

        {/* Status Track */}
        <div className="flex items-stretch flex-1 overflow-x-auto">
          {statusNodes.map((node) => (
            <button
              key={node.id}
              className="flex flex-col items-center justify-center px-4 md:px-6 py-2 cursor-pointer transition-colors border-r border-border last:border-r-0 hover:bg-background shrink-0 gap-0.5"
            >
              <div className={`w-3 h-3 rounded-full ${node.dotClass}`} />
              <div className="font-[family-name:var(--font-sora)] text-lg font-extrabold leading-none mt-1">
                {counts[node.id] || 0}
              </div>
              <div className="text-[10px] font-semibold text-ink3 tracking-tight">{node.label}</div>
              <div className="text-[9px] text-ink4 font-medium">{node.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
