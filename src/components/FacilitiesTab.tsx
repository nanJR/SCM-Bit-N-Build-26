import React, { useState } from 'react';
import { Facility } from '../types';
import {
  Sliders,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Cpu,
  Sparkles,
  Search,
  Building2,
  ExternalLink,
  MapPin,
  Activity,
  Radio,
  FileCheck2,
  Flame,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  FileText,
} from 'lucide-react';

interface FacilitiesTabProps {
  facilities: Record<string, Facility>;
  onUpdateSensor: (
    facilityId: string,
    moisture: number,
    contamination: boolean
  ) => Promise<void>;
  onDescribeFacility: (id: string) => Promise<string>;
  onOpenStandards?: () => void;
  onRunPipelineNav?: () => void;
}

export const FacilitiesTab: React.FC<FacilitiesTabProps> = ({
  facilities,
  onUpdateSensor,
  onDescribeFacility,
  onOpenStandards,
  onRunPipelineNav,
}) => {
  const facilityList = Object.values(facilities);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(
    facilityList[0]?.id || 'F01'
  );
  const [moisture, setMoisture] = useState<number>(18);
  const [contamination, setContamination] = useState<boolean>(false);
  const [sensorSuccessMsg, setSensorSuccessMsg] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [descriptionMap, setDescriptionMap] = useState<Record<string, string>>({});
  const [expandedAssayMap, setExpandedAssayMap] = useState<Record<string, boolean>>({});

  const [filterRole, setFilterRole] = useState<'all' | 'seller' | 'buyer'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterHazardous, setFilterHazardous] = useState<boolean>(false);

  const handleApplySensor = async () => {
    setApplying(true);
    setSensorSuccessMsg(null);
    try {
      await onUpdateSensor(selectedFacilityId, moisture, contamination);
      const target = facilities[selectedFacilityId];
      setSensorSuccessMsg(
        `Telemetry synced for ${target?.name}: Moisture ${moisture}%, Contamination: ${
          contamination ? 'YES (Usable Volume halved)' : 'NO'
        }. Floor: ₹${target?.cost_floor_inr_per_ton ?? 'N/A'}/t, Vol: ${target?.volume_tons_per_month} t/mo.`
      );
    } catch (err: any) {
      console.error(err);
    } finally {
      setApplying(false);
    }
  };

  const handleDescribe = async (id: string) => {
    setExplainingId(id);
    try {
      const desc = await onDescribeFacility(id);
      setDescriptionMap((prev) => ({ ...prev, [id]: desc }));
    } catch (err) {
      console.error(err);
    } finally {
      setExplainingId(null);
    }
  };

  const filteredFacilities = facilityList.filter((f) => {
    if (filterRole !== 'all' && f.role !== filterRole) return false;
    if (filterHazardous && !f.hazardous) return false;
    if (filterCategory !== 'all' && f.material !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = f.name.toLowerCase().includes(q);
      const matchCluster = f.cluster.toLowerCase().includes(q);
      const matchMaterial = f.material.toLowerCase().includes(q);
      const matchConsent = (f.kspcb_consent_id || '').toLowerCase().includes(q);
      const matchId = f.id.toLowerCase().includes(q);
      if (!matchName && !matchCluster && !matchMaterial && !matchConsent && !matchId) {
        return false;
      }
    }
    return true;
  });

  const selectedFacility = facilities[selectedFacilityId];

  return (
    <div className="space-y-6">
      {/* Top Banner Box - Clean Warm Header matching reference image */}
      <section className="bg-gradient-to-r from-orange-50/90 via-amber-50/50 to-orange-50/80 rounded-2xl sm:rounded-3xl border border-orange-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-[11px] font-bold tracking-wider uppercase mb-2">
              <Building2 className="w-3.5 h-3.5 text-orange-600" />
              Karnataka State Pollution Control Board • Industrial Byproduct Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Industrial Symbiosis & Waste Exchange Dashboard
            </h1>
            <p className="text-sm text-stone-600 mt-2 max-w-3xl leading-relaxed">
              Autonomous multi-agent platform connecting registered industrial units across{' '}
              <strong className="text-stone-800">Peenya, Bidadi, Dobaspet, Harohalli, Whitefield, and Yelahanka</strong>. 
              Featuring real authorized recyclers (Rock Crystals C&D, Century Refineries, VIWA Eco-Club CETP) and KSPCB regulatory oversight under C&D Rules 2016 and Hazardous Waste Rules 2016.
            </p>
          </div>
          {onRunPipelineNav && (
            <div className="shrink-0">
              <button
                onClick={onRunPipelineNav}
                className="bg-[#ff5d02] hover:bg-[#e04f00] text-white font-semibold px-6 py-3 rounded-xl shadow-sm transition flex items-center gap-2 text-sm"
              >
                <span>Run Matchmaker & Pipeline</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Box 1: Search & Filter Box (matching "FIND MY DETAILS / Search by Student ID" in reference) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl border border-orange-200/80 p-6 shadow-sm">
        <div className="text-[11px] font-extrabold tracking-wider text-[#ea580c] uppercase mb-1 font-mono">
          DIRECTORY SEARCH
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-stone-900 mb-1">
          Search Registered Industries & Authorized Recyclers
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 mb-4">
          Search by company name, KSPCB XGN consent ID, byproduct category (e.g. Recycled Concrete Aggregate, Used Oil, Fly Ash), or industrial zone.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Rock Crystals, Peenya, C&D Aggregate, VIWA CETP, Fly Ash, XGN-2023..."
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50/70 border border-stone-200 rounded-xl text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition"
            />
          </div>
          <button
            onClick={() => {}}
            className="bg-[#ff5d02] hover:bg-[#e04f00] text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-sm transition"
          >
            Search
          </button>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2.5 text-xs text-stone-600 hover:text-stone-900 border border-stone-200 rounded-xl bg-stone-50 transition"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-stone-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-stone-500 mr-1">Role:</span>
            {(['all', 'seller', 'buyer'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition ${
                  filterRole === r
                    ? 'bg-[#ff5d02] text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {r === 'all' ? 'All Roles' : `${r}s`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs bg-stone-50 border border-stone-200 text-stone-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-400"
            >
              <option value="all">All Materials</option>
              <option value="recycled_concrete_aggregate">C&D Aggregate (RCA)</option>
              <option value="fly_ash">Fly Ash (SO 5481(E))</option>
              <option value="used_oil">Used Oil (Sched. IV)</option>
              <option value="chrome_sludge">Chrome Sludge (Sched. II)</option>
              <option value="steel_slag">Steel Slag</option>
              <option value="plastic_scrap">Plastic Scrap (PWM 2016)</option>
              <option value="metal_scrap">Metal Scrap</option>
              <option value="dye_sludge">Dye Sludge</option>
            </select>

            <button
              onClick={() => setFilterHazardous(!filterHazardous)}
              className={`text-xs px-3 py-1 rounded-full border flex items-center gap-1.5 transition font-medium ${
                filterHazardous
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold'
                  : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              <ShieldAlert className="w-3 h-3 text-amber-600" />
              Hazardous Only
            </button>
          </div>
        </div>
      </section>

      {/* Box 2: IoT Sensor Telemetry Card (matching "SIP FEEDBACK" in reference image) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl border border-orange-200/80 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <div className="text-[11px] font-extrabold tracking-wider text-[#ea580c] uppercase mb-1 font-mono">
              IOT TELEMETRY & CAAQMS TRIGGER
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900">
              Live Facility IoT Quality Sensor & Air-Shed Simulation
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              Simulate sensor events (moisture variations, contamination flags, or CAAQMS ambient spikes) to observe Facility Agents autonomously adjust cost floors and usable volumes.
            </p>
          </div>
          <button
            id="sensor-apply-btn"
            onClick={handleApplySensor}
            disabled={applying}
            className="bg-[#ff5d02] hover:bg-[#e04f00] text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-sm transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
          >
            <Sliders className="w-4 h-4" />
            {applying ? 'Transmitting Telemetry...' : 'Apply IoT Telemetry'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-orange-50/40 p-4 rounded-2xl border border-orange-100">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Target Industrial Facility
            </label>
            <select
              id="sensor-facility-select"
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="w-full bg-white border border-stone-200 text-stone-800 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-orange-400 focus:outline-none"
            >
              {facilityList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.id}: {f.name} ({f.cluster} - {f.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-stone-700">
                Moisture Content: <span className="text-[#ea580c] font-bold">{moisture}%</span>
              </label>
              <span className="text-[10px] text-stone-500">&gt;15% triggers 15% discount</span>
            </div>
            <input
              id="sensor-moisture-slider"
              type="range"
              min="0"
              max="40"
              value={moisture}
              onChange={(e) => setMoisture(Number(e.target.value))}
              className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#ff5d02]"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl bg-white border border-stone-200 hover:border-orange-300 w-full transition">
              <input
                id="sensor-contamination-checkbox"
                type="checkbox"
                checked={contamination}
                onChange={(e) => setContamination(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 accent-[#ff5d02]"
              />
              <span className="text-xs font-medium text-stone-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Contamination Alert (Halves usable volume)</span>
              </span>
            </label>
          </div>
        </div>

        {sensorSuccessMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{sensorSuccessMsg}</span>
          </div>
        )}
      </section>

      {/* Box 3: Regulatory & C&D Standards Card (matching "CIRCULARS / Important Circulars" in reference) */}
      <section className="bg-white rounded-2xl sm:rounded-3xl border border-orange-200/80 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-extrabold tracking-wider text-[#ea580c] uppercase mb-1 font-mono">
            COMPLIANCE & STATUTORY RULES
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-stone-900">
            KSPCB Authorizations & CPCB C&D Management Rules 2016
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-2xl mt-1">
            Governed by BIS IS:383:2016 (Recycled Concrete Aggregate), MoEFCC Fly Ash Notification SO 5481(E), and Hazardous Waste Rules 2016 (Schedule II & IV).
          </p>
        </div>
        {onOpenStandards && (
          <button
            onClick={onOpenStandards}
            className="bg-[#ff5d02] hover:bg-[#e04f00] text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-sm transition flex items-center justify-center gap-2 shrink-0"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>View Regulatory Standards</span>
          </button>
        )}
      </section>

      {/* Facility Grid Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">
            Verified Participating Facilities ({filteredFacilities.length})
          </h2>
          <span className="text-xs text-stone-500 font-mono">
            KSPCB XGN Database Records
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFacilities.map((f) => (
            <div
              key={f.id}
              className="bg-white rounded-2xl border border-orange-200/80 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                    {f.id}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      f.role === 'seller'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    }`}
                  >
                    {f.role}
                  </span>
                </div>

                <h3 className="font-bold text-base text-stone-900 leading-snug">
                  {f.name}
                </h3>

                <div className="flex items-center gap-1 text-xs text-stone-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#ff5d02]" />
                  <span>{f.cluster} Cluster</span>
                  <span className="text-stone-300">•</span>
                  <span className="font-mono text-[11px]">[{f.lat.toFixed(2)}, {f.lon.toFixed(2)}]</span>
                </div>

                {f.gstin && (
                  <div className="text-[11px] font-mono text-stone-500 mt-1">
                    GSTIN: <span className="text-[#ea580c] font-bold">{f.gstin}</span>
                  </div>
                )}

                {f.kspcb_consent_id && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-200 text-[11px] font-mono text-stone-700">
                    <FileCheck2 className="w-3 h-3 text-orange-600" />
                    <span>{f.kspcb_consent_id}</span>
                  </div>
                )}

                {/* KSPCB XGN Monthly Quota & Headroom Bar */}
                {f.xgn_details && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-orange-50/50 border border-orange-200/70 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-bold text-stone-700 uppercase">
                        XGN Quota ({f.xgn_details.category} Category)
                      </span>
                      <span className="text-stone-500">Exp: {f.xgn_details.valid_till}</span>
                    </div>

                    <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#ff5d02] h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.round((f.xgn_details.current_month_consumed_tons / f.xgn_details.authorized_monthly_quota_tons) * 100))}%`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] font-mono text-stone-600">
                      <span>Consumed: {f.xgn_details.current_month_consumed_tons} T</span>
                      <span className="font-bold text-emerald-700">
                        Headroom: {f.xgn_details.authorized_monthly_quota_tons - f.xgn_details.current_month_consumed_tons} T
                      </span>
                    </div>
                  </div>
                )}

                {/* Lab Assay Accordion */}
                {f.lab_assay && (
                  <div className="mt-2.5">
                    <button
                      onClick={() =>
                        setExpandedAssayMap((prev) => ({ ...prev, [f.id]: !prev[f.id] }))
                      }
                      className="w-full p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 flex items-center justify-between text-xs text-stone-700 transition"
                    >
                      <div className="flex items-center gap-1.5 font-medium">
                        <FlaskConical className="w-3.5 h-3.5 text-orange-600" />
                        <span>NABL Assay: {f.lab_assay.overall_grade}</span>
                      </div>
                      {expandedAssayMap[f.id] ? (
                        <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                      )}
                    </button>

                    {expandedAssayMap[f.id] && (
                      <div className="mt-2 p-2.5 rounded-xl bg-white border border-stone-200 space-y-1.5 text-[10px]">
                        <div className="text-stone-500 font-mono flex justify-between">
                          <span>{f.lab_assay.lab_name}</span>
                          <span className="font-bold text-stone-700">{f.lab_assay.certificate_id}</span>
                        </div>
                        <div className="space-y-1 pt-1 border-t border-stone-100">
                          {f.lab_assay.parameters.map((p) => (
                            <div key={p.name} className="flex justify-between font-mono text-stone-600">
                              <span>{p.name}:</span>
                              <span className="font-bold text-stone-800">
                                {p.value} {p.unit} ({p.test_standard})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Material Stream:</span>
                    <span className="font-semibold text-stone-800 capitalize">
                      {f.material.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Monthly Volume:</span>
                    <span className="font-bold text-stone-900 font-mono">
                      {f.volume_tons_per_month} tons/mo
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">
                      {f.role === 'seller' ? 'Cost Floor (Min):' : 'Cost Ceiling (Max):'}
                    </span>
                    <span className="font-bold font-mono text-[#ea580c]">
                      {f.role === 'seller'
                        ? f.cost_floor_inr_per_ton ? `₹${f.cost_floor_inr_per_ton}/t` : '—'
                        : f.cost_ceiling_inr_per_ton ? `₹${f.cost_ceiling_inr_per_ton}/t` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Hazard Profile:</span>
                    {f.hazardous ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-700 text-[11px]">
                        <AlertTriangle className="w-3 h-3" />
                        Hazardous
                      </span>
                    ) : (
                      <span className="text-emerald-700 text-[11px] font-medium">Non-Hazardous</span>
                    )}
                  </div>
                </div>

                {f.cepi_zone && (
                  <div className="mt-2.5 p-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-800 font-medium flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>{f.cepi_zone}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100">
                {descriptionMap[f.id] ? (
                  <div className="p-2.5 rounded-xl bg-orange-50/70 border border-orange-200 text-xs text-stone-800 italic leading-relaxed mb-2">
                    "{descriptionMap[f.id]}"
                  </div>
                ) : null}

                <button
                  onClick={() => handleDescribe(f.id)}
                  disabled={explainingId === f.id}
                  className="w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-orange-100 text-stone-800 hover:text-orange-950 font-semibold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                  <span>{explainingId === f.id ? 'Consulting Agent...' : 'Consult Facility Agent'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
