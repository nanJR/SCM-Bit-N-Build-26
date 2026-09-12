import React from 'react';
import { PipelineItemResult } from '../types';
import { formatMaterialTitleCase, getMaterialBadgeStyles } from '../utils/materials';
import { FileText, ArrowRight, Scale, CheckCircle2, XCircle, ShieldAlert, Sparkles, Building2 } from 'lucide-react';

interface TranscriptsTabProps {
  results: PipelineItemResult[];
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
}

export const TranscriptsTab: React.FC<TranscriptsTabProps> = ({
  results,
  selectedIndex,
  onSelectIndex,
}) => {
  const currentResult = results[selectedIndex] || results[0];

  if (results.length === 0) {
    return (
      <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-orange-200 bg-white">
        <FileText className="w-12 h-12 mx-auto text-orange-300 mb-3" />
        <h3 className="text-base font-bold text-stone-800">No Deal Negotiations Yet</h3>
        <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-md mx-auto leading-relaxed">
          Click "Match Deals" to run the matchmaker and see how factories negotiate fair prices round by round.
        </p>
      </div>
    );
  }

  const negotiation = currentResult?.negotiation;
  const seller = currentResult?.seller;
  const buyer = currentResult?.buyer;
  const match = currentResult?.match;

  return (
    <div className="space-y-6">
      {/* Top Banner Box */}
      <section className="bg-white rounded-2xl sm:rounded-3xl border border-orange-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-extrabold tracking-wider text-[#ea580c] uppercase mb-1 font-mono">
              FACTORY DEAL TALKS
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
              <span>Step-by-Step Price Negotiations</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
              Watch buyer and seller factories exchange bids, adjust for transport distances and moisture, and agree on a fair price in up to 5 rounds.
            </p>
          </div>

          {/* Pair selector dropdown */}
          <div className="w-full md:w-88 shrink-0">
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Select Factory Conversation:
            </label>
            <select
              id="transcript-pair-select"
              value={selectedIndex}
              onChange={(e) => onSelectIndex(Number(e.target.value))}
              className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-orange-400 focus:outline-none"
            >
              {results.map((r, i) => (
                <option key={i} value={i}>
                  {r.seller.name.slice(0, 24)} ↔ {r.buyer.name.slice(0, 24)} ({r.negotiation.outcome.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {currentResult && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-orange-200/80 p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Header Summary for Selected Pair */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-5 gap-4">
            <div>
              <div className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-stone-900 flex-wrap">
                <span>{seller.name}</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">Seller</span>
                <ArrowRight className="w-4 h-4 text-stone-400" />
                <span>{buyer.name}</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">Buyer</span>
              </div>
              <div className="text-xs text-stone-500 mt-1.5 flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span>Material:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getMaterialBadgeStyles(match.material)}`}>
                    {formatMaterialTitleCase(match.material)}
                  </span>
                </span>
                <span>•</span>
                <span>Volume: <strong className="text-stone-800 font-mono">{negotiation.volume_tons} t/month</strong></span>
                <span>•</span>
                <span>Logistics Distance: <strong className="text-stone-800 font-mono">{negotiation.logistics.distance_km} km</strong></span>
              </div>
            </div>

            <div>
              {negotiation.outcome === 'DEAL' ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>AGREED: ₹{negotiation.final_price_inr_per_ton}/ton</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>NO DEAL REACHED</span>
                </div>
              )}
            </div>
          </div>

          {/* Protocol Private Bounds Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-orange-50/40 p-4 rounded-2xl border border-orange-100">
            <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
              <span className="text-stone-500 block font-medium">Seller Private Cost Floor:</span>
              <span className="text-[#ea580c] font-mono font-bold text-base">₹{seller.cost_floor_inr_per_ton}/ton</span>
              <span className="text-[10px] text-stone-400 block mt-0.5">Private bound • Never revealed to buyer</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
              <span className="text-stone-500 block font-medium">Buyer Private Cost Ceiling:</span>
              <span className="text-emerald-700 font-mono font-bold text-base">₹{buyer.cost_ceiling_inr_per_ton}/ton</span>
              <span className="text-[10px] text-stone-400 block mt-0.5">Private bound • Never revealed to seller</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
              <span className="text-stone-500 block font-medium">Conclusion:</span>
              <span
                id="transcript-termination-reason"
                className={`font-mono font-bold text-sm ${
                  negotiation.outcome === 'NO_DEAL' ? 'text-rose-800' : 'text-emerald-800'
                }`}
              >
                {negotiation.outcome.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] text-stone-500 block mt-0.5">
                {negotiation.reason || 'Concession reached price overlap before Round 5 deadline'}
              </span>
            </div>
          </div>

          {/* Rounds List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#ea580c] font-mono">
                Bilateral Round Progression (1 - 5 Rounds)
              </h3>
              <span className="text-xs text-stone-400">
                Formula: Ask - (Round * Step) vs Bid + (Round * Step)
              </span>
            </div>

            {negotiation.rounds.map((round) => {
              const gap = round.seller_ask - round.buyer_bid;
              const isOverlapped = gap <= 0;

              return (
                <div
                  key={round.round}
                  className={`p-5 rounded-2xl border transition ${
                    isOverlapped
                      ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200'
                      : 'bg-white border-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800">
                        Round {round.round}
                      </span>
                      {isOverlapped && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                          ✓ Price Overlap Achieved (Deal Struck)
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono">
                      {isOverlapped ? (
                        <span className="text-emerald-700 font-bold">
                          Settlement Price: ₹{Math.round((round.seller_ask + round.buyer_bid) / 2)}/ton
                        </span>
                      ) : (
                        <span className="text-stone-500">
                          Spread Gap: <strong className="text-rose-600 font-bold">₹{gap}/ton</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Seller Side */}
                    <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-amber-900">Seller Offer</span>
                        <span className="font-mono text-[#ea580c] font-bold text-sm">
                          Ask: ₹{round.seller_ask}/ton
                        </span>
                      </div>
                      <p className="text-stone-700 italic text-xs mt-1.5 leading-relaxed bg-white/60 p-2 rounded-lg border border-amber-100">
                        "{round.seller_note}"
                      </p>
                    </div>

                    {/* Buyer Side */}
                    <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-emerald-900">Buyer Offer</span>
                        <span className="font-mono text-emerald-700 font-bold text-sm">
                          Bid: ₹{round.buyer_bid}/ton
                        </span>
                      </div>
                      <p className="text-stone-700 italic text-xs mt-1.5 leading-relaxed bg-white/60 p-2 rounded-lg border border-emerald-100">
                        "{round.buyer_note}"
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
