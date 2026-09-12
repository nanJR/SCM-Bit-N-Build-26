import React, { useState, useEffect, useRef } from 'react';
import { PipelineItemResult } from '../types';
import { formatMaterialTitleCase, getMaterialBadgeStyles } from '../utils/materials';
import { GoogleMapsTruckTracker } from './GoogleMapsTruckTracker';
import {
  Truck,
  Play,
  Pause,
  RotateCcw,
  Compass,
  Navigation,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Gauge,
  Layers,
  Fuel,
  TrendingDown,
  Maximize2,
  Minimize2,
  ChevronRight,
  Radio,
  Map as MapIcon,
  Activity,
} from 'lucide-react';

interface TruckRouteSimulatorProps {
  results: PipelineItemResult[];
  initialSelectedDealIndex?: number;
}

// Projected coordinate bounds for South Karnataka Industrial Corridor
// Lon: 77.05 - 77.75 (West to East)
// Lat: 12.60 - 13.40 (South to North)
const SVG_WIDTH = 840;
const SVG_HEIGHT = 520;
const MIN_LON = 77.05;
const MAX_LON = 77.75;
const MIN_LAT = 12.60;
const MAX_LAT = 13.40;

function projectGeo(lat: number, lon: number): [number, number] {
  const clampedLon = Math.max(MIN_LON, Math.min(MAX_LON, lon));
  const clampedLat = Math.max(MIN_LAT, Math.min(MAX_LAT, lat));

  const x = ((clampedLon - MIN_LON) / (MAX_LON - MIN_LON)) * (SVG_WIDTH - 80) + 40;
  const y = ((MAX_LAT - clampedLat) / (MAX_LAT - MIN_LAT)) * (SVG_HEIGHT - 80) + 40;
  return [Math.round(x), Math.round(y)];
}

// Known Karnataka industrial hubs coordinates
const INDUSTRIAL_HUBS: Array<{
  id: string;
  name: string;
  cluster: string;
  lat: number;
  lon: number;
  type: 'hub' | 'toll' | 'checkpoint';
}> = [
  { id: 'TUM', name: 'Tumkur Industrial Zone', cluster: 'Tumkur', lat: 13.34, lon: 77.10, type: 'hub' },
  { id: 'DOB', name: 'Dobaspet KIADB Phase II', cluster: 'Dobaspet', lat: 13.22, lon: 77.33, type: 'hub' },
  { id: 'NEL_TOLL', name: 'Nelamangala Toll Plaza (NH-48)', cluster: 'Nelamangala', lat: 13.10, lon: 77.39, type: 'toll' },
  { id: 'PEE', name: 'Peenya Industrial Area Stage I-IV', cluster: 'Peenya', lat: 13.028, lon: 77.52, type: 'hub' },
  { id: 'YEL', name: 'Yelahanka Aerospace Park', cluster: 'Yelahanka', lat: 13.10, lon: 77.58, type: 'hub' },
  { id: 'CHK', name: 'Chikkajala / Airport Logistics Hub', cluster: 'Chikkajala', lat: 13.175, lon: 77.63, type: 'hub' },
  { id: 'WHI', name: 'Whitefield Industrial Export Zone', cluster: 'Whitefield', lat: 12.97, lon: 77.70, type: 'hub' },
  { id: 'BID', name: 'Bidadi Smart Industrial Park', cluster: 'Bidadi', lat: 12.794, lon: 77.389, type: 'hub' },
  { id: 'HAR', name: 'Harohalli KIADB Corridor', cluster: 'Harohalli', lat: 12.655, lon: 77.43, type: 'hub' },
  { id: 'BOM', name: 'Bommasandra / Electronic City', cluster: 'Bommasandra', lat: 12.81, lon: 77.69, type: 'hub' },
  { id: 'JIG', name: 'Jigani Industrial Area (Granite Hub)', cluster: 'Jigani', lat: 12.78, lon: 77.63, type: 'hub' },
  { id: 'RAJ', name: 'Rajajinagar Light Manufacturing', cluster: 'Rajajinagar', lat: 12.998, lon: 77.553, type: 'hub' },
  { id: 'NICE_TOLL', name: 'NICE Cloverleaf Toll Gate', cluster: 'NICE Expressway', lat: 12.89, lon: 77.48, type: 'toll' },
];

export const TruckRouteSimulator: React.FC<TruckRouteSimulatorProps> = ({
  results,
  initialSelectedDealIndex = 0,
}) => {
  // Only deals or candidates
  const validDeals = results.length > 0 ? results : [];
  const [selectedIndex, setSelectedIndex] = useState<number>(initialSelectedDealIndex);
  const [viewMode, setViewMode] = useState<'google' | 'schematic'>('google');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0); // 0 to 1
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1); // 1x, 2x, 4x
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const activeDeal = validDeals[selectedIndex] || validDeals[0] || null;

  // Animation frame loop for continuous truck transit
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current !== null && isPlaying) {
        const delta = (time - lastTimeRef.current) / 1000;
        // Base transit duration ~ 14 seconds for one full transit cycle at 1x
        const step = (delta / 14) * speedMultiplier;
        setProgress((prev) => {
          const next = prev + step;
          return next >= 1 ? 0 : next;
        });
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, speedMultiplier]);

  // If no deals exist, provide fallback demo route (Peenya -> Dobaspet)
  const sellerCoords = activeDeal
    ? [activeDeal.seller.lat, activeDeal.seller.lon]
    : [13.028, 77.52];
  const buyerCoords = activeDeal
    ? [activeDeal.buyer.lat, activeDeal.buyer.lon]
    : [13.22, 77.33];

  const sellerName = activeDeal ? activeDeal.seller.name : 'Sri Lakshmi Electroplating (Peenya)';
  const buyerName = activeDeal ? activeDeal.buyer.name : 'UltraTech ReadyMix (Dobaspet)';
  const materialName = activeDeal ? activeDeal.match.material : 'recycled_concrete_aggregate';
  const distanceKm = activeDeal ? activeDeal.negotiation.logistics.distance_km : 34.2;
  const corridorName = activeDeal?.negotiation.logistics.corridor?.corridor_name || 'NH-48 / Tumkur Road Industrial Corridor';
  const highwayNumber = activeDeal?.negotiation.logistics.corridor?.highway_number || 'NH-48';
  const tollList = activeDeal?.negotiation.logistics.corridor?.tolls || [{ name: 'Nelamangala Toll Plaza', fee_inr: 165, expressway: 'NH-48' }];
  const volumeTons = activeDeal?.negotiation.volume_tons || 80;
  const netCo2Kg = activeDeal?.negotiation.logistics.net_co2_impact_kg || 1840;

  // Project origin and destination into SVG coordinates
  const [originX, originY] = projectGeo(sellerCoords[0], sellerCoords[1]);
  const [destX, destY] = projectGeo(buyerCoords[0], buyerCoords[1]);

  // Build a multi-segment road curve taking realistic highway corridors into account
  // Midpoint with curve deviation based on highway
  const midX = (originX + destX) / 2 + (originY < destY ? -20 : 25);
  const midY = (originY + destY) / 2 + 10;

  // Calculate truck current position along quadratic Bezier curve
  const t = progress;
  const truckX = (1 - t) * (1 - t) * originX + 2 * (1 - t) * t * midX + t * t * destX;
  const truckY = (1 - t) * (1 - t) * originY + 2 * (1 - t) * t * midY + t * t * destY;

  // Calculate truck angle for orientation
  const dx = 2 * (1 - t) * (midX - originX) + 2 * t * (destX - midX);
  const dy = 2 * (1 - t) * (midY - originY) + 2 * t * (destY - midY);
  const truckAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

  // Real-time telemetry calculations
  const currentKm = (progress * distanceKm).toFixed(1);
  const currentSpeedKmH = Math.round(38 + Math.sin(progress * Math.PI * 4) * 12);
  const transitMinutes = activeDeal?.negotiation.logistics.corridor?.est_transit_minutes || 48;
  const etaMinutes = Math.max(1, Math.round((1 - progress) * transitMinutes));
  const accumulatedCo2 = ((progress * netCo2Kg) / 1000).toFixed(2);

  // Active waypoint description
  let activeWaypoint = `${highwayNumber} Expressway Sector`;
  if (progress < 0.15) {
    activeWaypoint = `Departing Seller Loading Dock (${activeDeal?.seller.cluster || 'Peenya'})`;
  } else if (progress >= 0.40 && progress <= 0.60) {
    activeWaypoint = tollList.length > 0 ? `Approaching ${tollList[0].name} (Fastag Cleared)` : `Mid-Corridor Interchange (${highwayNumber})`;
  } else if (progress > 0.85) {
    activeWaypoint = `Approaching Buyer Unloading Silo (${activeDeal?.buyer.cluster || 'Dobaspet'})`;
  }

  return (
    <section
      id="truck-route-gis-simulator"
      className={`bg-stone-900 text-stone-100 rounded-3xl border border-stone-800 shadow-xl overflow-hidden transition-all duration-300 ${
        isExpanded ? 'p-6' : 'p-5 sm:p-7'
      }`}
    >
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-wider text-orange-400 uppercase font-mono bg-orange-950/80 px-2.5 py-0.5 rounded-full border border-orange-800/80">
              KARNATAKA FREIGHT GIS & TELEMATICS
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/60">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              GPS Active • KA-04-E-8924
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight mt-1.5 flex items-center gap-2">
            <span>Highway Truck Route & Live Corridor Telematics</span>
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Real-time transit simulation along {corridorName} ({highwayNumber}) complying with KSPCB Form 10 rules.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
          {/* View Mode Toggle: Google Maps vs Vector Schematic */}
          <div className="flex items-center bg-stone-800/90 rounded-xl border border-stone-700 p-0.5 text-xs">
            <button
              onClick={() => setViewMode('google')}
              className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                viewMode === 'google'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Interactive Google Maps GPS Navigation"
            >
              <MapIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Google Maps</span>
            </button>
            <button
              onClick={() => setViewMode('schematic')}
              className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                viewMode === 'schematic'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Vector Freight Corridor Schematic"
            >
              <Activity className="w-3.5 h-3.5 text-orange-400" />
              <span>Corridor CAD</span>
            </button>
          </div>

          {/* Deal selector dropdown if results available */}
          {validDeals.length > 1 && (
            <select
              value={selectedIndex}
              onChange={(e) => {
                setSelectedIndex(Number(e.target.value));
                setProgress(0);
              }}
              className="bg-stone-800 text-stone-200 border border-stone-700 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 max-w-[240px] truncate"
            >
              {validDeals.map((d, i) => (
                <option key={i} value={i}>
                  Deal {i + 1}: {d.seller.cluster} → {d.buyer.cluster} ({d.match.material.slice(0, 12)})
                </option>
              ))}
            </select>
          )}

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition"
            title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
          >
            {isPlaying ? <Pause className="w-4 h-4 text-orange-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Reset */}
          <button
            onClick={() => setProgress(0)}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition"
            title="Restart Route"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Speed Toggle */}
          <div className="flex items-center bg-stone-800 rounded-xl border border-stone-700 p-0.5 text-xs font-mono">
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setSpeedMultiplier(s)}
                className={`px-2 py-1 rounded-lg font-bold transition ${
                  speedMultiplier === s
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition"
            title={isExpanded ? 'Collapse' : 'Expand View'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Interactive Map & Telematics Canvas */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left: GIS Map Canvas (Google Maps or Schematic) (3 Cols) */}
        <div className="lg:col-span-3 bg-stone-950 rounded-2xl border border-stone-800 relative overflow-hidden flex flex-col">
          {viewMode === 'google' ? (
            <GoogleMapsTruckTracker
              activeDeal={activeDeal}
              progress={progress}
              speedKmH={currentSpeedKmH}
              etaMinutes={etaMinutes}
              currentKm={currentKm}
              totalDistanceKm={distanceKm}
              activeWaypoint={activeWaypoint}
              accumulatedCo2={accumulatedCo2}
            />
          ) : (
            <>
              {/* Map Controls & Status Overlay Bar */}
              <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
                <div className="bg-stone-900/90 backdrop-blur-sm border border-stone-800 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs font-mono shadow-md pointer-events-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-stone-300 font-bold">{corridorName}</span>
                  <span className="text-stone-500">•</span>
                  <span className="text-orange-400">{distanceKm} km</span>
                </div>

                <div className="bg-stone-900/90 backdrop-blur-sm border border-stone-800 rounded-xl px-3 py-1.5 text-[11px] font-mono text-stone-300 shadow-md pointer-events-auto hidden sm:flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5 text-blue-400" />
                  <span>Speed: {currentSpeedKmH} km/h</span>
                  <span className="text-stone-500">|</span>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>ETA: ~{etaMinutes} min</span>
                </div>
              </div>

              {/* Interactive SVG Canvas */}
              <div className="w-full relative h-[360px] sm:h-[440px] flex items-center justify-center p-2">
                <svg
                  viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                  className="w-full h-full select-none"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    {/* Grid Dot Pattern */}
                    <pattern id="gis-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#262626" strokeWidth="0.5" />
                      <circle cx="20" cy="20" r="0.8" fill="#404040" />
                    </pattern>

                    {/* Road Glow Filters */}
                    <filter id="road-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="truck-glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>

                    {/* Animated Dash Array for Active Route */}
                    <linearGradient id="route-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ff5d02" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>

                  {/* Background Map Canvas Grid */}
                  <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#gis-grid)" />

                  {/* Regional Districts Boundaries / Water Bodies Accent (Cauvery / Arkavathi basin contour) */}
                  <path
                    d="M 50 480 Q 200 420 350 450 T 650 490"
                    fill="none"
                    stroke="#1e3a5f"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    opacity="0.6"
                  />
                  <text x="350" y="475" fill="#3b82f6" opacity="0.4" fontSize="10" fontFamily="monospace">
                    Arkavathi / Cauvery Tributary Basin (Protected River Sand Zone)
                  </text>

                  {/* Major Karnataka Highway Arteries (Static Network) */}
                  {/* NH-48 Tumkur Road */}
                  <path
                    d="M 80 60 Q 280 130 520 240"
                    fill="none"
                    stroke="#3f3f46"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 80 60 Q 280 130 520 240"
                    fill="none"
                    stroke="#71717a"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />
                  <text x="210" y="115" fill="#a1a1aa" fontSize="9" fontFamily="monospace">
                    NH-48 (Bengaluru - Tumakuru Corridor)
                  </text>

                  {/* NICE Peripheral Expressway Loop */}
                  <path
                    d="M 520 240 Q 420 320 380 380 Q 480 430 670 380"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 520 240 Q 420 320 380 380 Q 480 430 670 380"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                  />
                  <text x="440" y="340" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                    NICE Peripheral Ring Road (Toll)
                  </text>

                  {/* NH-44 Hosur Road (Silk Board to Bommasandra) */}
                  <path
                    d="M 580 270 L 670 380 L 720 440"
                    fill="none"
                    stroke="#3f3f46"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <text x="680" y="360" fill="#a1a1aa" fontSize="9" fontFamily="monospace">
                    NH-44 (Hosur Road)
                  </text>

                  {/* Outer Airport Bypass / SH-104 */}
                  <path
                    d="M 700 280 Q 680 180 640 120"
                    fill="none"
                    stroke="#3f3f46"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <text x="670" y="210" fill="#a1a1aa" fontSize="9" fontFamily="monospace">
                    SH-104 (Airport Bypass)
                  </text>

                  {/* ACTIVE ROUTE BEZIER CORRIDOR */}
                  {/* Backlight glow */}
                  <path
                    d={`M ${originX} ${originY} Q ${midX} ${midY} ${destX} ${destY}`}
                    fill="none"
                    stroke="#ff5d02"
                    strokeWidth="8"
                    opacity="0.25"
                    filter="url(#road-glow)"
                  />
                  {/* Active Route Path */}
                  <path
                    d={`M ${originX} ${originY} Q ${midX} ${midY} ${destX} ${destY}`}
                    fill="none"
                    stroke="url(#route-gradient)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Animated pulses moving along active route */}
                  <path
                    d={`M ${originX} ${originY} Q ${midX} ${midY} ${destX} ${destY}`}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeDasharray="8 16"
                    strokeDashoffset={-progress * 120}
                    opacity="0.8"
                  />

                  {/* Render Industrial Hub Pins */}
                  {INDUSTRIAL_HUBS.map((hub) => {
                    const [hx, hy] = projectGeo(hub.lat, hub.lon);
                    const isSellerHub = activeDeal?.seller.cluster.toLowerCase() === hub.cluster.toLowerCase();
                    const isBuyerHub = activeDeal?.buyer.cluster.toLowerCase() === hub.cluster.toLowerCase();

                    if (hub.type === 'toll') {
                      return (
                        <g key={hub.id} transform={`translate(${hx}, ${hy})`}>
                          <rect
                            x="-10"
                            y="-7"
                            width="20"
                            height="14"
                            rx="3"
                            fill="#1e293b"
                            stroke="#f59e0b"
                            strokeWidth="1.2"
                          />
                          <text
                            x="0"
                            y="3"
                            fill="#fbbf24"
                            fontSize="8"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            TOLL
                          </text>
                          <text
                            x="0"
                            y="16"
                            fill="#94a3b8"
                            fontSize="8"
                            textAnchor="middle"
                            fontFamily="sans-serif"
                          >
                            {hub.name.split(' ')[0]}
                          </text>
                        </g>
                      );
                    }

                    return (
                      <g key={hub.id} transform={`translate(${hx}, ${hy})`}>
                        <circle
                          r={isSellerHub || isBuyerHub ? '6' : '3.5'}
                          fill={isSellerHub ? '#ea580c' : isBuyerHub ? '#10b981' : '#52525b'}
                          stroke="#18181b"
                          strokeWidth="1.5"
                        />
                        {(isSellerHub || isBuyerHub) && (
                          <circle
                            r="11"
                            fill="none"
                            stroke={isSellerHub ? '#ea580c' : '#10b981'}
                            strokeWidth="1.2"
                            opacity="0.6"
                          >
                            <animate
                              attributeName="r"
                              values="6;16"
                              dur="1.8s"
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.8;0"
                              dur="1.8s"
                              repeatCount="indefinite"
                            />
                          </circle>
                        )}
                        <text
                          x="0"
                          y={isSellerHub || isBuyerHub ? -10 : 12}
                          fill={isSellerHub ? '#fb923c' : isBuyerHub ? '#34d399' : '#a1a1aa'}
                          fontSize={isSellerHub || isBuyerHub ? '10' : '8'}
                          fontWeight={isSellerHub || isBuyerHub ? 'bold' : 'normal'}
                          textAnchor="middle"
                          fontFamily="sans-serif"
                        >
                          {hub.cluster}
                        </text>
                      </g>
                    );
                  })}

                  {/* Origin Plant Marker (Seller) */}
                  <g transform={`translate(${originX}, ${originY})`}>
                    <circle r="7" fill="#ea580c" stroke="#fff" strokeWidth="2" />
                    <text x="0" y="-12" fill="#ffedd5" fontSize="10" fontWeight="bold" textAnchor="middle">
                      SELLER: {activeDeal?.seller.cluster || 'Origin'}
                    </text>
                  </g>

                  {/* Destination Plant Marker (Buyer) */}
                  <g transform={`translate(${destX}, ${destY})`}>
                    <circle r="7" fill="#10b981" stroke="#fff" strokeWidth="2" />
                    <text x="0" y="-12" fill="#d1fae5" fontSize="10" fontWeight="bold" textAnchor="middle">
                      BUYER: {activeDeal?.buyer.cluster || 'Destination'}
                    </text>
                  </g>

                  {/* LIVE SIMULATED DELIVERY TRUCK */}
                  <g
                    transform={`translate(${truckX}, ${truckY}) rotate(${truckAngle})`}
                    filter="url(#truck-glow)"
                  >
                    {/* Truck Pulse Radar Wave */}
                    <circle r="18" fill="none" stroke="#ffedd5" strokeWidth="1" opacity="0.3" />
                    <circle r="26" fill="none" stroke="#ea580c" strokeWidth="0.8" opacity="0.2">
                      <animate attributeName="r" values="12;32" dur="1.2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.6;0" dur="1.2s" repeatCount="indefinite" />
                    </circle>

                    {/* Truck Vehicle Body (Top-down view) */}
                    {/* Cab */}
                    <rect x="-6" y="-7" width="12" height="14" rx="2" fill="#ffffff" stroke="#18181b" strokeWidth="1" />
                    {/* Windshield */}
                    <rect x="0" y="-5" width="4" height="10" rx="1" fill="#0284c7" />
                    {/* Cargo Bed (colored by material category) */}
                    <rect x="-24" y="-8" width="18" height="16" rx="2" fill="#ea580c" stroke="#fff" strokeWidth="1" />
                    {/* Headlight Beams */}
                    <polygon points="6,-4 22,-8 22,8 6,4" fill="#fef08a" opacity="0.45" />
                  </g>
                </svg>
              </div>
            </>
          )}

          {/* Interactive Route Progress Scrubber Bar */}
          <div className="p-3 bg-stone-900/95 border-t border-stone-800 flex items-center gap-3">
            <span className="text-[11px] font-mono text-stone-400 font-bold shrink-0">
              {sellerName.split(' ')[0]}
            </span>

            <div className="flex-1 relative flex items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.005"
                value={progress}
                onChange={(e) => {
                  setProgress(parseFloat(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full accent-[#ff5d02] cursor-pointer h-2 bg-stone-800 rounded-lg"
              />
            </div>

            <span className="text-[11px] font-mono text-emerald-400 font-bold shrink-0">
              {buyerName.split(' ')[0]}
            </span>
          </div>
        </div>

        {/* Right: Live Truck Telematics & Regulatory HUD (1 Col) */}
        <div className="space-y-3 flex flex-col justify-between">
          {/* Active Vehicle Card */}
          <div className="bg-stone-950 rounded-2xl border border-stone-800 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  TRUCK KA-04-E-8924
                </span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
                BS-VI Multi-Axle
              </span>
            </div>

            {/* Metric Rows */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-stone-300">
                <span className="text-stone-400">Current Waypoint:</span>
                <span className="font-semibold text-white truncate max-w-[150px] text-right">
                  {activeWaypoint}
                </span>
              </div>

              <div className="flex justify-between items-center text-stone-300">
                <span className="text-stone-400">Transit Distance:</span>
                <span className="font-mono font-bold text-orange-400">
                  {currentKm} km / {distanceKm} km
                </span>
              </div>

              <div className="flex justify-between items-center text-stone-300">
                <span className="text-stone-400">GPS Speed:</span>
                <span className="font-mono font-bold text-white">
                  {currentSpeedKmH} km/h
                </span>
              </div>

              <div className="flex justify-between items-center text-stone-300">
                <span className="text-stone-400">Est. Arrival (ETA):</span>
                <span className="font-mono font-bold text-emerald-400">
                  ~{etaMinutes} mins
                </span>
              </div>
            </div>
          </div>

          {/* Consignment & Cargo Card */}
          <div className="bg-stone-950 rounded-2xl border border-stone-800 p-4 space-y-2.5">
            <div className="text-[11px] font-mono text-stone-400 font-bold uppercase">
              CIRCULAR CONSIGNMENT
            </div>

            <div className="text-xs space-y-1.5">
              <div className="font-bold text-white flex items-center justify-between">
                <span>{formatMaterialTitleCase(materialName)}</span>
                <span className="font-mono text-orange-400">{volumeTons} Tons</span>
              </div>

              <div className="text-[11px] text-stone-400">
                Consignor: <span className="text-stone-200">{sellerName}</span>
              </div>
              <div className="text-[11px] text-stone-400">
                Consignee: <span className="text-stone-200">{buyerName}</span>
              </div>
            </div>

            {/* Real-time Accumulated Carbon Reduction */}
            <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs">
              <span className="text-stone-400 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                Offset Logged:
              </span>
              <span className="font-mono font-bold text-emerald-400">
                +{accumulatedCo2} t CO₂
              </span>
            </div>
          </div>

          {/* KSPCB Compliance Check Card */}
          <div className="bg-stone-950 rounded-2xl border border-stone-800 p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] uppercase font-mono">
              <ShieldCheck className="w-4 h-4" />
              <span>KSPCB Form 10 & E-Way Manifest</span>
            </div>
            <div className="text-[11px] text-stone-300 leading-snug">
              Manifest ID: <span className="font-mono text-stone-100 font-semibold">MFST-2026-KA-0982</span>. GPS continuous telemetry transmitted to KSPCB XGN gateway.
            </div>
            <div className="text-[10px] text-stone-400 flex items-center gap-1 font-mono pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>BBMP Heavy Vehicle Curfew Cleared (Outer Ring Bypass)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
