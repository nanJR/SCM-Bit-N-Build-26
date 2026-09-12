import React from 'react';
import { RotateCcw, Factory, Play, FileText, BookOpen, ShieldCheck, Sparkles, Building2 } from 'lucide-react';

interface NavbarProps {
  activeTab: 'facilities' | 'pipeline' | 'transcripts' | 'ledger';
  setActiveTab: (tab: 'facilities' | 'pipeline' | 'transcripts' | 'ledger') => void;
  onReset: () => void;
  resetting: boolean;
  onOpenStandards?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onReset,
  resetting,
  onOpenStandards,
}) => {
  return (
    <header className="sticky top-3 z-50 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto bg-white/95 backdrop-blur-md border border-orange-200/80 rounded-full shadow-[0_4px_20px_rgba(234,88,12,0.06)] px-4 sm:px-6 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Organization Crest & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-400 p-0.5 shadow-sm flex items-center justify-center text-white">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <Building2 className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-stone-900 tracking-tight">
                Karnataka State Pollution Control Board
              </span>
              <span className="hidden md:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                XGN Portal • 2026
              </span>
            </div>
            <p className="text-[11px] text-stone-500 font-medium hidden sm:block">
              Industrial Symbiosis & Circular Byproduct Exchange Network
            </p>
          </div>
        </div>

        {/* Right: Pill Navigation & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <nav className="flex items-center gap-1 bg-stone-100/80 p-1 rounded-full border border-stone-200/60">
            <button
              id="nav-facilities-tab"
              onClick={() => setActiveTab('facilities')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                activeTab === 'facilities'
                  ? 'bg-[#ff5d02] text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
              }`}
            >
              <Factory className="w-3.5 h-3.5" />
              <span>Facilities</span>
            </button>

            <button
              id="nav-pipeline-tab"
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-[#ff5d02] text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Pipeline</span>
            </button>

            <button
              id="nav-transcripts-tab"
              onClick={() => setActiveTab('transcripts')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                activeTab === 'transcripts'
                  ? 'bg-[#ff5d02] text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Transcripts</span>
            </button>

            <button
              id="nav-ledger-tab"
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                activeTab === 'ledger'
                  ? 'bg-[#ff5d02] text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Ledger</span>
            </button>
          </nav>

          {onOpenStandards && (
            <button
              id="open-standards-btn"
              onClick={onOpenStandards}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-800 bg-orange-50 hover:bg-orange-100 rounded-full border border-orange-200 transition"
              title="View KSPCB, CPCB C&D 2017 and CSTEP Clean Air Framework"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
              <span>Standards</span>
            </button>
          )}

          <button
            id="reset-state-btn"
            onClick={onReset}
            disabled={resetting}
            className="inline-flex items-center justify-center p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full border border-stone-200/80 transition disabled:opacity-50"
            title="Reset facilities and clear ledger state"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin text-orange-600' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
