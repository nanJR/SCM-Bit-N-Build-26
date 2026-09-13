import React from 'react';
import { RotateCcw, Factory, Play, MessageSquareText, BookOpen, ShieldCheck, AlertCircle, HelpCircle, TrendingDown, Droplets, Truck } from 'lucide-react';
import { PipelineItemResult } from '../types';

interface NavbarProps {
  activeTab: 'facilities' | 'fleet' | 'pipeline' | 'transcripts' | 'ledger';
  setActiveTab: (tab: 'facilities' | 'fleet' | 'pipeline' | 'transcripts' | 'ledger') => void;
  onReset: () => void;
  resetting: boolean;
  onOpenStandards?: () => void;
  onOpenLimitations?: () => void;
  onOpenGlossary?: () => void;
  results?: PipelineItemResult[];
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onReset,
  resetting,
  onOpenStandards,
  onOpenLimitations,
  onOpenGlossary,
  results = [],
}) => {
  const approvedDeals = results.filter(
    (r) => r.negotiation.outcome === 'DEAL' && r.regulatory?.decision === 'APPROVED'
  );
  const totalCo2Kg = approvedDeals.reduce(
    (acc, r) => acc + (r.negotiation.logistics.net_co2_impact_kg || 0),
    0
  );
  const sandSavedTons = approvedDeals
    .filter((r) =>
      ['recycled_concrete_aggregate', 'demolition_rubble', 'steel_slag'].includes(
        r.match.material
      )
    )
    .reduce((acc, r) => acc + (r.negotiation.volume_tons || 0), 0);
  const sandSavedLiters = sandSavedTons * 625;

  return (
    <header className="sticky top-2.5 z-50 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto bg-white/95 backdrop-blur-md border border-orange-200/80 rounded-2xl sm:rounded-full shadow-[0_4px_20px_rgba(234,88,12,0.06)] px-3.5 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Minimalistic App Brand */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col leading-tight">
            <span id="nav-brand-title" className="font-extrabold text-sm sm:text-base text-stone-900 tracking-tight">
              SCM - Swalpa Circular Maadi
            </span>
            <span className="text-[11px] sm:text-xs text-orange-600 font-semibold italic">
              Make it circular, eh?
            </span>
          </div>
        </div>

        {/* Center: Live Ecological Counter (Visible when deals approved) */}
        {approvedDeals.length > 0 && (
          <button
            onClick={() => setActiveTab('pipeline')}
            className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-[11px] font-mono font-bold transition shadow-2xs group"
            title="Click to view full Karnataka Carbon & Resource Telematics"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-emerald-600" />
              {(totalCo2Kg / 1000).toFixed(1)} t CO₂ Avoided
            </span>
            <span className="text-emerald-300">•</span>
            <span className="flex items-center gap-1 text-blue-800">
              <Droplets className="w-3 h-3 text-blue-600" />
              {sandSavedLiters >= 1000 ? `${(sandSavedLiters / 1000).toFixed(0)}k` : sandSavedLiters} L Sand Saved
            </span>
          </button>
        )}

        {/* Right: Nav Tabs & Reset Action grouped together at rightmost */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 bg-stone-100/90 p-1 rounded-xl sm:rounded-full border border-stone-200/60 text-xs">
            <button
              id="nav-facilities-tab"
              onClick={() => setActiveTab('facilities')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg sm:rounded-full transition-all ${
                activeTab === 'facilities'
                  ? 'bg-[#ff5d02] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
              }`}
            >
              <Factory className="w-3.5 h-3.5" />
              <span>Factories</span>
            </button>

            <button
              id="nav-fleet-tab"
              onClick={() => setActiveTab('fleet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg sm:rounded-full transition-all ${
                activeTab === 'fleet'
                  ? 'bg-[#ff5d02] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Fleet</span>
            </button>

            <button
              id="nav-pipeline-tab"
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg sm:rounded-full transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-[#ff5d02] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Match Deals</span>
            </button>

            <button
              id="nav-transcripts-tab"
              onClick={() => setActiveTab('transcripts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg sm:rounded-full transition-all ${
                activeTab === 'transcripts'
                  ? 'bg-[#ff5d02] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
              }`}
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>Negotiations</span>
            </button>

            <button
              id="nav-ledger-tab"
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg sm:rounded-full transition-all ${
                activeTab === 'ledger'
                  ? 'bg-[#ff5d02] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Passports</span>
            </button>
          </nav>

          <button
            id="reset-state-btn"
            onClick={onReset}
            disabled={resetting}
            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full border border-stone-200 transition disabled:opacity-50"
            title="Reset simulation data to default"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin text-orange-600' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
