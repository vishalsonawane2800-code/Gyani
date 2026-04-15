'use client';

import { useEffect, useState } from 'react';
import type { IPO } from '@/lib/data';
import { TrendingUp } from 'lucide-react';

interface SubscriptionData {
  category: string;
  applied: number;
  times: number;
  updated_at?: string;
}

interface LiveSubscriptionTrackerProps {
  ipo: IPO;
}

export function LiveSubscriptionTracker({ ipo }: LiveSubscriptionTrackerProps) {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Color coding for different categories
  const categoryConfig: Record<string, { bg: string; border: string; text: string; label: string }> = {
    retail: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      label: 'Retail'
    },
    nii: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      label: 'NII (HNI)'
    },
    qib: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      label: 'QIB'
    },
    total: {
      bg: 'bg-primary-mid/10',
      border: 'border-primary-mid/30',
      text: 'text-primary-mid',
      label: 'Total'
    }
  };

  useEffect(() => {
    // Try to fetch subscription live data from API
    const fetchSubscriptionData = async () => {
      try {
        const response = await fetch(`/api/admin/ipos/${ipo.id}/subscription-live`);
        if (response.ok) {
          const data = await response.json();
          setSubscriptionData(data);
          setIsLive(true);
          setLastUpdated(new Date());
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        // Fall back to data from IPO object if available
        if (ipo.subscriptionLive && Array.isArray(ipo.subscriptionLive)) {
          setSubscriptionData(ipo.subscriptionLive);
          setIsLive(true);
          setLastUpdated(new Date(ipo.subscriptionLastUpdated || new Date()));
        }
      }
    };

    if (ipo.id && (ipo.status === 'open' || ipo.status === 'closing')) {
      fetchSubscriptionData();
      
      // Poll every 30 seconds if IPO is open
      const interval = setInterval(fetchSubscriptionData, 30000);
      return () => clearInterval(interval);
    }
  }, [ipo.id, ipo.status, ipo.subscriptionLive, ipo.subscriptionLastUpdated]);

  // If IPO hasn't opened for subscription yet, show placeholder
  if (!isLive || !subscriptionData || subscriptionData.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700 p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-slate-700/50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Live Subscription Tracker</h3>
            <p className="text-xs text-slate-400">Real-time subscription data</p>
          </div>
        </div>
        
        <div className="bg-slate-900/50 rounded-lg p-4 text-center">
          <p className="text-slate-400 text-sm mb-2">Subscription data will appear when IPO opens</p>
          <p className="text-xs text-slate-500">Current IPO Status: <span className="capitalize font-semibold">{ipo.status}</span></p>
        </div>
      </div>
    );
  }

  // Filter and organize subscription data
  const categories = ['retail', 'nii', 'qib', 'total'];
  const filteredData = subscriptionData.filter(item => 
    categories.includes(item.category.toLowerCase())
  );

  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700 p-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Live Subscription Tracker</h3>
            <p className="text-xs text-slate-400">Day {ipo.subscriptionDay || '1'} • Real-time updates</p>
          </div>
        </div>
        
        {lastUpdated && (
          <div className="text-right">
            <p className="text-xs font-mono text-emerald-400">
              Updated {new Date(lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </p>
          </div>
        )}
      </div>

      {/* Subscription Blocks Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {filteredData.map((item) => {
          const config = categoryConfig[item.category.toLowerCase()] || categoryConfig.retail;
          
          // Calculate multiplier for display
          const multiplier = item.times?.toFixed(2) || '0.00';
          const trend = item.times >= 1 ? '+' : '';
          
          return (
            <div 
              key={item.category}
              className={`${config.bg} ${config.border} border rounded-xl p-4 relative overflow-hidden group hover:border-opacity-100 transition-all duration-300`}
            >
              {/* Gradient background on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br from-white via-transparent to-transparent transition-opacity duration-300" />
              
              {/* Content */}
              <div className="relative z-10">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {config.label}
                </p>
                
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-black ${config.text}`}>
                    {multiplier}
                  </span>
                  <span className="text-lg font-bold text-slate-400">x</span>
                </div>
                
                {item.applied && (
                  <p className="text-xs text-slate-500 mt-2">
                    Applied: {item.applied.toLocaleString('en-IN')} shares
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <p className="text-xs text-slate-500">
          * Subscription data updates during IPO period. Shown as &quot;Times Oversubscribed&quot; (x). Auto-refreshes every 30 seconds.
        </p>
      </div>
    </div>
  );
}
