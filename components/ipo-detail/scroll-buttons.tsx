'use client';

export function ScrollButtons() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
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
      <button className="px-6 py-2 rounded-lg text-[12px] font-semibold bg-secondary text-ink2 border border-border transition-colors hover:bg-border ml-auto">
        Check Allotment
      </button>
    </div>
  );
}
