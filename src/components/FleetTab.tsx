import React from 'react';
import { Carrier } from '../types';
import { getVehicleBadgeStyles } from '../utils/materials';
import { Truck, ShieldCheck, ShieldAlert, MapPin, Package } from 'lucide-react';

interface FleetTabProps {
  carriers: Record<string, Carrier>;
}

export const FleetTab: React.FC<FleetTabProps> = ({ carriers }) => {
  const carrierList = Object.values(carriers);

  return (
    <div className="space-y-6">
      {/* Top Banner Box */}
      <section className="bg-white rounded-2xl sm:rounded-3xl border border-orange-200/80 p-5 sm:p-6 shadow-xs">
        <div className="text-[11px] font-extrabold tracking-wider text-[#ea580c] uppercase mb-1 font-mono">
          THE TRUCKER: LOGISTICS/CARRIER NEGOTIATION AGENT
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
          Registered Karnataka Logistics Fleet
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
          After a material price deal is struck, the Logistics Agent selects the most cost-efficient eligible carrier
          (matching vehicle capacity and, for hazardous cargo, a valid hazmat transport license) and negotiates a
          freight rate against the buyer's remaining budget headroom — using the same monotonic-concession protocol
          as material price negotiation.
        </p>
      </section>

      {/* Carrier Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {carrierList.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:shadow-sm transition space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ea580c] flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              {c.hazmat_transport_license ? (
                <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  HAZMAT LICENSED
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 border border-stone-200 font-bold">
                  <ShieldAlert className="w-3 h-3" />
                  STANDARD FLEET
                </span>
              )}
            </div>

            <div>
              <h3 className="font-bold text-stone-900 text-sm">{c.name}</h3>
              <div className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                <span>{c.cluster} Base Depot</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border shadow-2xs ${getVehicleBadgeStyles(c.vehicle_type)}`}>
                {c.vehicle_type}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-stone-600 pt-2 border-t border-stone-100">
              <Package className="w-3.5 h-3.5 text-stone-400" />
              <span>
                Capacity: <strong className="text-stone-800 font-mono">{c.capacity_tons} tons</strong>
              </span>
            </div>
          </div>
        ))}
      </div>

      {carrierList.length === 0 && (
        <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-orange-200 bg-white">
          <Truck className="w-12 h-12 mx-auto text-orange-300 mb-3" />
          <h3 className="text-base font-bold text-stone-800">No Carriers Registered</h3>
        </div>
      )}
    </div>
  );
};
