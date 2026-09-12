import React from 'react';
import { RotateCcw, Factory, Play, MessageSquareText, BookOpen, ShieldCheck, AlertCircle, HelpCircle } from 'lucide-react';

interface NavbarProps {
  activeTab: 'facilities' | 'pipeline' | 'transcripts' | 'ledger';
  setActiveTab: (tab: 'facilities' | 'pipeline' | 'transcripts' | 'ledger') => void;
  onReset: () => void;
  resetting: boolean;
  onOpenStandards?: () => void;
  onOpenLimitations?: () => void;
  onOpenGlossary?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onReset,
  resetting,
  onOpenStandards,
  onOpenLimitations,
  onOpenGlossary,
}) => {
  return (
    <header className="sticky top-2.5 z-50 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto bg-white/95 backdrop-blur-md border border-orange-200/80 rounded-2xl sm:rounded-full shadow-[0_4px_20px_rgba(234,88,12,0.06)] px-3.5 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Minimalistic App Brand */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold text-sm sm:text-base text-stone-900 tracking-tight">
              Swalpa Circular Maadi
            </span>
            <span className="text-[11px] sm:text-xs text-orange-600 font-semibold italic">
              Make it circular, eh?
            </span>
          </div>
        </div>

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
