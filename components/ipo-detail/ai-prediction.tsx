'use client';

import { useState, useEffect } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import type { IPO } from '@/lib/data';

interface AIPredictionProps {
  ipo: IPO;
}

export function AIPrediction({ ipo }: AIPredictionProps) {
  const [refreshTimer, setRefreshTimer] = useState(858); // 14:18
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  useEffect(() => {
    // Set initial time on client only to avoid hydration mismatch
    setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    
    const interval = setInterval(() => {
      setRefreshTimer((prev) => (prev > 0 ? prev - 1 : 900));
      setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const aiPrediction = ipo.aiPrediction ?? 0;
  const aiConfidence = ipo.aiConfidence ?? 0;
  const sentimentScore = ipo.sentimentScore ?? 0;
  const subscriptionTotal = ipo.subscription?.total ?? 0;
  const sector = ipo.sector ?? 'N/A';

  const isPositive = aiPrediction > 0;
  const predRange = {
    min: Math.max(0, aiPrediction - 4),
    max: aiPrediction + 4,
  };

  const factors = [
    { label: 'GMP Trend', icon: '📈', color: '#93c5fd', bg: 'rgba(96,165,250,.15)' },
    { label: 'Anchor Quality', icon: '⚓', color: '#86efac', bg: 'rgba(134,239,172,.12)' },
    { label: `Sentiment ${sentimentScore}/100`, icon: '🧠', color: '#c4b5fd', bg: 'rgba(196,181,253,.12)' },
    { label: `Sub ${subscriptionTotal}x`, icon: '📊', color: '#fbbf24', bg: 'rgba(251,191,36,.12)' },
    { label: sector, icon: '🏭', color: '#6ee7b7', bg: 'rgba(52,211,153,.12)' },
  ];

  return (
    <div className="bg-foreground rounded-2xl p-6 mb-6 relative overflow-hidden">
      {/* Header Chip */}
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary bg-white/10 border border-white/20 px-3 py-1 rounded-full w-fit mb-4 relative">
        <Check className="w-3 h-3" />
        IPOGyani AI Engine - Live Prediction
      </div>

      <div className="flex flex-wrap gap-8 relative">
        {/* Left - Main Prediction */}
        <div className="min-w-[150px]">
          <div className={`font-[family-name:var(--font-sora)] text-5xl font-black ${isPositive ? 'text-emerald-mid' : 'text-destructive'}`}>
            {isPositive ? '+' : ''}{aiPrediction}%
          </div>
          <p className="text-[13px] text-white/50 mt-2">
            Range: <strong className="text-white">{isPositive ? '+' : ''}{predRange.min}% to {isPositive ? '+' : ''}{predRange.max}%</strong>
          </p>
          <p className="text-[13px] text-white/50">
            Confidence: <strong className={aiConfidence >= 70 ? 'text-[#86efac]' : 'text-[#fbbf24]'}>
              {aiConfidence >= 70 ? 'High' : 'Moderate'} - {aiConfidence}%
            </strong>
          </p>
        </div>

        {/* Right - Confidence Bar & Factors */}
        <div className="flex-1 min-w-[250px]">
          <div className="mb-4">
            <p className="text-[11px] text-white/50 mb-2">Confidence Score - {aiConfidence}%</p>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${aiConfidence}%` }}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {factors.map((factor, index) => (
              <span 
                key={index}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: factor.bg, color: factor.color }}
              >
                {factor.icon} {factor.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 mt-6 text-[11px] text-white/40 relative">
        <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
        Next refresh: <strong className="text-white/70">{formatTimer(refreshTimer)}</strong>
        <span className="mx-2">-</span>
        Updated: {currentTime ?? '--:--'} IST
        <span className="mx-2">-</span>
        Model: IPOGyani v2.1
      </div>
    </div>
  );
}
