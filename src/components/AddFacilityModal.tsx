import React, { useState } from 'react';
import { Facility } from '../types';
import {
  X,
  Building2,
  PlusCircle,
  ShieldAlert,
  MapPin,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Sliders,
  Scale,
} from 'lucide-react';
import { formatMaterialTitleCase, getMaterialBadgeStyles } from '../utils/materials';

interface AddFacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (facilityData: Partial<Facility>) => Promise<void>;
}

export const AddFacilityModal: React.FC<AddFacilityModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'seller' | 'buyer'>('seller');
  const [cluster, setCluster] = useState('Peenya');
  const [material, setMaterial] = useState('recycled_concrete_aggregate');
  const [volume, setVolume] = useState<number>(300);
  const [priceThreshold, setPriceThreshold] = useState<number>(550);
  const [hazardous, setHazardous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a facility name.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await onAdd({
        name: name.trim(),
        role,
        cluster,
        material,
        volume_tons_per_month: Number(volume) || 100,
        cost_floor_inr_per_ton: role === 'seller' ? Number(priceThreshold) : null,
        cost_ceiling_inr_per_ton: role === 'buyer' ? Number(priceThreshold) : null,
        hazardous,
      });

      onClose();
      // Reset form
      setName('');
      setVolume(300);
      setPriceThreshold(550);
      setHazardous(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to onboard facility.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-orange-200/80 shadow-2xl overflow-hidden my-6 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border-b border-orange-200/80 p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff5d02] text-white flex items-center justify-center shadow-xs">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#ea580c] flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-orange-600" />
                <span>DYNAMIC ONBOARDING • KARNATAKA INDUSTRIAL NETWORK</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight">
                Add Karnataka Industrial Facility
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Company Name */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Facility / Legal Entity Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. UltraTech Concrete Works, Peenya Plant #4"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#ff5d02]/30 focus:border-[#ff5d02] bg-stone-50/50"
            />
          </div>

          {/* Role & Cluster */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Symbiosis Role *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRole('seller');
                    if (priceThreshold > 700) setPriceThreshold(500);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                    role === 'seller'
                      ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  Byproduct Seller
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('buyer');
                    if (priceThreshold < 600) setPriceThreshold(800);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                    role === 'buyer'
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900 shadow-2xs'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  Off-taker (Buyer)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Karnataka Industrial Cluster *
              </label>
              <select
                value={cluster}
                onChange={(e) => setCluster(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#ff5d02]/30 focus:border-[#ff5d02] bg-stone-50/50 font-medium"
              >
                <option value="Peenya">Peenya Industrial Area (NH-48)</option>
                <option value="Dobaspet">Dobaspet Industrial Area (Tumkur Rd)</option>
                <option value="Bidadi">Bidadi Industrial Area (Mysore Rd)</option>
                <option value="Whitefield">Whitefield / EPIP Zone</option>
                <option value="Bommasandra">Bommasandra Industrial Area (Hosur Rd)</option>
                <option value="Jigani">Jigani Industrial Estate</option>
                <option value="Rajajinagar">Rajajinagar Industrial Suburb</option>
                <option value="Veerasandra">Veerasandra Industrial Area</option>
              </select>
            </div>
          </div>

          {/* Material Stream & Monthly Volume */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Material Byproduct Stream *
              </label>
              <select
                value={material}
                onChange={(e) => {
                  const val = e.target.value;
                  setMaterial(val);
                  if (val === 'chrome_sludge' || val === 'used_oil' || val === 'dye_sludge') {
                    setHazardous(true);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#ff5d02]/30 focus:border-[#ff5d02] bg-stone-50/50 font-medium"
              >
                <option value="recycled_concrete_aggregate">Recycled Concrete Aggregate (C&D)</option>
                <option value="fly_ash">Fly Ash (Thermal / Clinker)</option>
                <option value="used_oil">Used Oil (Lube / Hydraulic)</option>
                <option value="steel_slag">Steel Slag (Foundry Byproduct)</option>
                <option value="plastic_scrap">Plastic Scrap (Post-Industrial)</option>
                <option value="metal_scrap">Metal Scrap (Ferrous Shavings)</option>
                <option value="chrome_sludge">Chrome Sludge (Electroplating)</option>
                <option value="dye_sludge">Dye Sludge (Textile Effluent)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Monthly Available Volume (Tons) *
              </label>
              <input
                type="number"
                min="10"
                max="10000"
                step="10"
                required
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#ff5d02]/30 focus:border-[#ff5d02] bg-stone-50/50 font-mono"
              />
            </div>
          </div>

          {/* Pricing Threshold & Hazardous Profile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                {role === 'seller' ? 'Minimum Acceptable Price (₹/ton)' : 'Maximum Ceiling Price (₹/ton)'} *
              </label>
              <input
                type="number"
                min="50"
                max="10000"
                step="25"
                required
                value={priceThreshold}
                onChange={(e) => setPriceThreshold(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#ff5d02]/30 focus:border-[#ff5d02] bg-stone-50/50 font-mono"
              />
              <span className="text-[11px] text-stone-500 mt-1 block">
                {role === 'seller' ? 'Agent will not settle below this floor price.' : 'Agent will negotiate down from this ceiling price.'}
              </span>
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border border-stone-200 hover:bg-stone-50 transition">
                <input
                  type="checkbox"
                  checked={hazardous}
                  onChange={(e) => setHazardous(e.target.checked)}
                  className="w-4 h-4 text-[#ff5d02] rounded border-stone-300 focus:ring-[#ff5d02]"
                />
                <div className="text-xs">
                  <span className="font-bold text-stone-800 block">Hazardous Waste Stream</span>
                  <span className="text-stone-500 text-[11px]">Enforces KSPCB Form 10 & GPS tracking</span>
                </div>
              </label>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
            <div className="text-[10px] uppercase font-mono font-bold text-stone-400 mb-1">
              Live Agent Model Profile Preview
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-stone-900">
                {name || 'New Facility'} ({cluster})
              </span>
              <span className={`px-2 py-0.5 rounded-full font-semibold border ${getMaterialBadgeStyles(material)}`}>
                {formatMaterialTitleCase(material)}
              </span>
              <span className="font-mono text-stone-600 font-semibold">
                {volume} t/mo @ {role === 'seller' ? `≥ ₹${priceThreshold}/t` : `≤ ₹${priceThreshold}/t`}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff5d02] hover:bg-[#ea580c] text-white text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                  <span>Onboarding Facility...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Onboard Facility</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
