import React from 'react';
import { X, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Scale, Compass, FileText } from 'lucide-react';

interface HonestLimitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HonestLimitationsModal: React.FC<HonestLimitationsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const limitations = [
    {
      dimension: 'Material Chemistry Compatibility',
      icon: Scale,
      currentState: 'Material matching is categorical (e.g., recycled concrete aggregate, fly ash, used oil).',
      productionReality:
        'In reality, two batches of fly ash (Class F vs Class C) or steel slag have varying LOI (loss on ignition), unburnt carbon, silica ratio, and heavy metal leachability. A chemical specification sheet parser (XRF/XRD lab analysis) would be required.',
      impact: 'Categorical matching verifies bulk compatibility, but enterprise deployments require continuous chemical batch testing.',
    },
    {
      dimension: 'Transport Routing',
      icon: Compass,
      currentState: 'Straight-line geodesic distance (Haversine × 1.25 road circuity factor).',
      productionReality:
        'Heavy commercial vehicles in Bengaluru face NICE Road toll gates, BBMP peak-hour truck entry restrictions, and bridge weight load limits. A live fleet API (Google Maps Routes API / OSRM) with truck routing parameters would be required for live dispatch.',
      impact: 'Straight-line distance gives an initial distance estimate, but real trucks must route around city entry curbs and toll plazas.',
    },
    {
      dimension: 'Contractual Execution',
      icon: FileText,
      currentState: 'Mints a Digital Waste Passport JSON payload with SHA-256 hash chaining.',
      productionReality:
        'Real B2B transactions require purchase order (PO) generation, GST invoice compliance (E-way bills via Karnataka Commercial Taxes Portal), and binding escrow/payment settlement.',
      impact: 'The digital passport proves data authenticity and environmental clearance, but enterprise ERP and tax invoicing systems handle payment settlement.',
    },
    {
      dimension: 'Regulatory Data Source',
      icon: ShieldCheck,
      currentState: 'Embedded ruleset referencing KSPCB CFO consents and C&D Waste Rules 2016.',
      productionReality:
        "Real KSPCB integration would need live API polling against Karnataka's XGN (Extended Green Node) portal to check real-time consent validity dates.",
      impact: 'Rules are faithfully modeled on actual Karnataka pollution control regulations, but live government databases require official API credentials.',
    },
  ];

  return (
    <div
      id="honest-limitations-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white border border-orange-200 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto text-stone-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-[#ea580c]">
              <AlertCircle className="w-5 h-5" />
              <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
                Honest Transparency & Production Reality
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 mt-1">
              Where the App Falls Short of Production (What's Simulated)
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              To be completely transparent, here is where this interactive working system diverges from a live enterprise rollout.
            </p>
          </div>
          <button
            id="close-limitations-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Limitations Table */}
        <div className="overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-stone-100 text-stone-700 border-b border-stone-200 font-mono text-xs">
                <th className="py-3.5 px-4 font-bold uppercase w-1/4">Dimension</th>
                <th className="py-3.5 px-4 font-bold uppercase w-1/3 text-stone-600">Current App State</th>
                <th className="py-3.5 px-4 font-bold uppercase w-5/12 text-[#ea580c]">Real-World Production Reality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white">
              {limitations.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <tr key={idx} className="hover:bg-orange-50/30 transition">
                    <td className="py-3.5 px-4 font-bold text-stone-900 align-top">
                      <div className="flex items-start gap-2">
                        <IconComponent className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <span>{item.dimension}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-stone-600 align-top leading-relaxed text-xs">
                      <div className="p-2 rounded-lg bg-stone-50 border border-stone-200">
                        {item.currentState}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-stone-800 align-top leading-relaxed text-xs">
                      <div className="p-2 rounded-lg bg-orange-50/60 border border-orange-200 text-stone-900 font-medium">
                        {item.productionReality}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Note */}
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">What IS completely functional in this app:</strong> Deterministic price negotiations that resolve within 5 rounds without hanging, dynamic adjustments when you change moisture and contamination readings, official KSPCB hazardous waste veto logic, and cryptographic SHA-256 chaining that proves records cannot be modified after the fact.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-500">
          <span>SCM • Swalpa Circular Maadi</span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#ff5d02] hover:bg-[#e04f00] text-white font-bold rounded-xl transition"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
