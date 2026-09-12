import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary,
  MapControl,
  ControlPosition,
} from '@vis.gl/react-google-maps';
import { PipelineItemResult } from '../types';
import { formatMaterialTitleCase } from '../utils/materials';
import {
  Truck,
  Layers,
  Crosshair,
  Compass,
  Radio,
  ExternalLink,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  Fuel,
  TrendingDown,
  Navigation,
} from 'lucide-react';

// Source: Google Maps Platform Code Assist
// Attribution ID required for AI Studio Agent Platform integration
const GMP_ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';
const DEFAULT_MAP_ID = 'DEMO_MAP_ID';

export interface GoogleMapsTruckTrackerProps {
  activeDeal: PipelineItemResult | null;
  progress: number; // 0.0 to 1.0
  speedKmH: number;
  etaMinutes: number;
  currentKm: string;
  totalDistanceKm: number;
  activeWaypoint: string;
  accumulatedCo2: string;
}

interface LatLng {
  lat: number;
  lng: number;
}

// Known Karnataka highway coordinates for fallback realistic corridor interpolation
function generateCorridorPoints(
  origin: LatLng,
  destination: LatLng,
  corridorName: string
): LatLng[] {
  // If points are very close, direct interpolation
  const numSteps = 50;
  const points: LatLng[] = [];

  // Intermediate highway waypoints based on Karnataka geography
  // Calculate curved deflection toward major highway arteries (NH-48, NICE Road, NH-44)
  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;

  // Slight realistic curvature to mimic Bangalore ring/highway arcs
  const deflectionLng = corridorName.includes('NICE') ? -0.04 : 0.025;
  const deflectionLat = corridorName.includes('Tumkur') ? 0.015 : -0.02;

  const ctrlLat = midLat + deflectionLat;
  const ctrlLng = midLng + deflectionLng;

  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    // Quadratic Bezier curve interpolation in Lat/Lng space
    const lat = (1 - t) * (1 - t) * origin.lat + 2 * (1 - t) * t * ctrlLat + t * t * destination.lat;
    const lng = (1 - t) * (1 - t) * origin.lng + 2 * (1 - t) * t * ctrlLng + t * t * destination.lng;
    points.push({ lat, lng });
  }

  return points;
}

/**
 * Inner Map Layer Manager:
 * Handles Route polyline drawing, DirectionsService computation,
 * Traffic layer toggling, and Map camera bounds.
 */
// Source: Google Maps Platform Code Assist
const MapRouteAndTrafficLayer: React.FC<{
  origin: LatLng;
  destination: LatLng;
  routePoints: LatLng[];
  progress: number;
  showTraffic: boolean;
  followTruck: boolean;
  truckPos: LatLng;
  onDirectionsLoaded?: (points: LatLng[]) => void;
}> = ({
  origin,
  destination,
  routePoints,
  progress,
  showTraffic,
  followTruck,
  truckPos,
  onDirectionsLoaded,
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const coreLib = useMapsLibrary('core');
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const polylinesRef = useRef<{
    remaining: google.maps.Polyline | null;
    completed: google.maps.Polyline | null;
  }>({ remaining: null, completed: null });

  // 1. Directions calculation via official Maps JS SDK wrapper
  useEffect(() => {
    if (!routesLib || !map) return;

    try {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: new google.maps.LatLng(origin.lat, origin.lng),
          destination: new google.maps.LatLng(destination.lat, destination.lng),
          travelMode: google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: google.maps.TrafficModel.BEST_GUESS,
          },
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result?.routes[0]?.overview_path) {
            const pathPoints = result.routes[0].overview_path.map((p) => ({
              lat: p.lat(),
              lng: p.lng(),
            }));
            if (pathPoints.length > 5 && onDirectionsLoaded) {
              onDirectionsLoaded(pathPoints);
            }
          }
        }
      );
    } catch {
      // In case directions service is not active, fallback corridor points are already used
    }
  }, [routesLib, map, origin.lat, origin.lng, destination.lat, destination.lng, onDirectionsLoaded]);

  // 2. Render multi-tone Polylines (Completed: Green, Remaining: Vibrant Orange)
  useEffect(() => {
    if (!map || routePoints.length === 0) return;

    // Clean up previous polylines
    if (polylinesRef.current.remaining) {
      polylinesRef.current.remaining.setMap(null);
    }
    if (polylinesRef.current.completed) {
      polylinesRef.current.completed.setMap(null);
    }

    const currentIndex = Math.min(
      routePoints.length - 1,
      Math.max(0, Math.floor(progress * (routePoints.length - 1)))
    );

    const completedPath = routePoints.slice(0, currentIndex + 1);
    const remainingPath = routePoints.slice(currentIndex);

    // Completed Path Polyline (Emerald)
    if (completedPath.length > 1) {
      const completedLine = new google.maps.Polyline({
        path: completedPath,
        geodesic: true,
        strokeColor: '#10b981',
        strokeOpacity: 0.9,
        strokeWeight: 5,
        map: map,
      });
      polylinesRef.current.completed = completedLine;
    }

    // Remaining Path Polyline (Orange with subtle glow)
    if (remainingPath.length > 1) {
      const remainingLine = new google.maps.Polyline({
        path: remainingPath,
        geodesic: true,
        strokeColor: '#f97316',
        strokeOpacity: 0.85,
        strokeWeight: 4,
        map: map,
      });
      polylinesRef.current.remaining = remainingLine;
    }

    return () => {
      if (polylinesRef.current.remaining) polylinesRef.current.remaining.setMap(null);
      if (polylinesRef.current.completed) polylinesRef.current.completed.setMap(null);
    };
  }, [map, routePoints, progress]);

  // 3. Traffic Layer toggle
  useEffect(() => {
    if (!map) return;

    if (showTraffic) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = new google.maps.TrafficLayer();
      }
      trafficLayerRef.current.setMap(map);
    } else if (trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null);
    }

    return () => {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    };
  }, [map, showTraffic]);

  // 4. Follow truck camera pan
  useEffect(() => {
    if (map && followTruck && truckPos) {
      map.panTo(truckPos);
    }
  }, [map, followTruck, truckPos]);

  return null;
};

export const GoogleMapsTruckTracker: React.FC<GoogleMapsTruckTrackerProps> = ({
  activeDeal,
  progress,
  speedKmH,
  etaMinutes,
  currentKm,
  totalDistanceKm,
  activeWaypoint,
  accumulatedCo2,
}) => {
  // Configured or demo API key
  const envKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const [apiKey, setApiKey] = useState<string>(envKey);
  const [isKeyInputOpen, setIsKeyInputOpen] = useState<boolean>(false);
  const [customKeyDraft, setCustomKeyDraft] = useState<string>('');

  // Map view configuration
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [showTraffic, setShowTraffic] = useState<boolean>(false);
  const [followTruck, setFollowTruck] = useState<boolean>(false);

  // InfoWindow states
  const [selectedInfo, setSelectedInfo] = useState<'truck' | 'seller' | 'buyer' | 'toll' | null>(null);

  // Facility coordinates (fallback to Peenya and Dobaspet)
  const origin: LatLng = useMemo(() => {
    if (activeDeal?.seller?.lat && activeDeal?.seller?.lon) {
      return { lat: activeDeal.seller.lat, lng: activeDeal.seller.lon };
    }
    return { lat: 13.028, lng: 77.52 }; // Peenya Industrial Area
  }, [activeDeal]);

  const destination: LatLng = useMemo(() => {
    if (activeDeal?.buyer?.lat && activeDeal?.buyer?.lon) {
      return { lat: activeDeal.buyer.lat, lng: activeDeal.buyer.lon };
    }
    return { lat: 13.22, lng: 77.33 }; // Dobaspet KIADB
  }, [activeDeal]);

  const corridorName = activeDeal?.negotiation?.logistics?.corridor?.corridor_name || 'NH-48 Industrial Freight Corridor';
  const highwayNumber = activeDeal?.negotiation?.logistics?.corridor?.highway_number || 'NH-48';
  const tolls = activeDeal?.negotiation?.logistics?.corridor?.tolls || [
    { name: 'Nelamangala Toll Plaza', fee_inr: 165, expressway: 'NH-48' },
  ];

  // Default computed path points along corridor
  const [routePoints, setRoutePoints] = useState<LatLng[]>(() =>
    generateCorridorPoints(origin, destination, corridorName)
  );

  // Regenerate points when origin/destination changes
  useEffect(() => {
    setRoutePoints(generateCorridorPoints(origin, destination, corridorName));
  }, [origin, destination, corridorName]);

  const handleDirectionsLoaded = useCallback((points: LatLng[]) => {
    setRoutePoints(points);
  }, []);

  // Compute current truck location along the route
  const { truckPos, truckHeading } = useMemo(() => {
    if (!routePoints || routePoints.length === 0) {
      return { truckPos: origin, truckHeading: 0 };
    }

    const maxIdx = routePoints.length - 1;
    const floatIdx = Math.max(0, Math.min(maxIdx, progress * maxIdx));
    const baseIdx = Math.floor(floatIdx);
    const remainder = floatIdx - baseIdx;

    const p1 = routePoints[baseIdx];
    const p2 = routePoints[Math.min(maxIdx, baseIdx + 1)];

    const curLat = p1.lat + (p2.lat - p1.lat) * remainder;
    const curLng = p1.lng + (p2.lng - p1.lng) * remainder;

    // Heading in degrees
    const dLng = p2.lng - p1.lng;
    const dLat = p2.lat - p1.lat;
    const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;

    return {
      truckPos: { lat: curLat, lng: curLng },
      truckHeading: angle >= 0 ? angle : angle + 360,
    };
  }, [routePoints, progress, origin]);

  // Center point
  const mapCenter = useMemo(() => {
    return {
      lat: (origin.lat + destination.lat) / 2,
      lng: (origin.lng + destination.lng) / 2,
    };
  }, [origin, destination]);

  // Toll plaza position (approximated midpoint on highway)
  const tollPosition: LatLng = useMemo(() => {
    if (routePoints.length > 10) {
      const idx = Math.floor(routePoints.length * 0.45);
      return routePoints[idx];
    }
    return {
      lat: (origin.lat * 0.6 + destination.lat * 0.4),
      lng: (origin.lng * 0.6 + destination.lng * 0.4),
    };
  }, [routePoints, origin, destination]);

  const sellerName = activeDeal?.seller?.name || 'Sri Lakshmi Electroplating (Peenya)';
  const buyerName = activeDeal?.buyer?.name || 'UltraTech ReadyMix (Dobaspet)';
  const material = activeDeal?.match?.material || 'recycled_concrete_aggregate';
  const volumeTons = activeDeal?.negotiation?.volume_tons || 80;

  return (
    <div className="relative w-full h-[440px] sm:h-[500px] rounded-2xl overflow-hidden bg-stone-950 border border-stone-800 shadow-inner flex flex-col">
      {/* Google Maps API Provider */}
      <APIProvider apiKey={apiKey} libraries={['routes', 'geometry', 'marker']}>
        {/* Map Container with explicit CSS height (CF2 compliance) */}
        <div className="w-full h-full relative">
          <Map
            id="karnataka-freight-google-map"
            mapId={DEFAULT_MAP_ID}
            defaultCenter={mapCenter}
            defaultZoom={10}
            mapTypeId={mapTypeId}
            gestureHandling="greedy"
            disableDefaultUI={false}
            zoomControl={true}
            streetViewControl={false}
            mapTypeControl={false}
            fullscreenControl={false}
            internalUsageAttributionIds={[GMP_ATTRIBUTION_ID]}
            className="w-full h-full"
          >
            {/* Map Route Engine & Traffic Layer */}
            <MapRouteAndTrafficLayer
              origin={origin}
              destination={destination}
              routePoints={routePoints}
              progress={progress}
              showTraffic={showTraffic}
              followTruck={followTruck}
              truckPos={truckPos}
              onDirectionsLoaded={handleDirectionsLoaded}
            />

            {/* 1. SELLER / CONSIGNOR ADVANCED MARKER */}
            <AdvancedMarker
              position={origin}
              title={`Consignor: ${sellerName}`}
              onClick={() => setSelectedInfo('seller')}
            >
              <div className="group flex flex-col items-center cursor-pointer transition-transform hover:scale-110">
                <span className="bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-orange-400 whitespace-nowrap mb-1">
                  SELLER: {activeDeal?.seller?.cluster || 'Origin'}
                </span>
                <Pin background="#ea580c" borderColor="#7c2d12" glyphColor="#ffffff" scale={1.2}>
                  🏭
                </Pin>
              </div>
            </AdvancedMarker>

            {/* 2. BUYER / CONSIGNEE ADVANCED MARKER */}
            <AdvancedMarker
              position={destination}
              title={`Consignee: ${buyerName}`}
              onClick={() => setSelectedInfo('buyer')}
            >
              <div className="group flex flex-col items-center cursor-pointer transition-transform hover:scale-110">
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-emerald-400 whitespace-nowrap mb-1">
                  BUYER: {activeDeal?.buyer?.cluster || 'Destination'}
                </span>
                <Pin background="#059669" borderColor="#064e3b" glyphColor="#ffffff" scale={1.2}>
                  🏗️
                </Pin>
              </div>
            </AdvancedMarker>

            {/* 3. HIGHWAY TOLL PLAZA WAYPOINT */}
            {tolls.length > 0 && (
              <AdvancedMarker
                position={tollPosition}
                title={tolls[0].name}
                onClick={() => setSelectedInfo('toll')}
              >
                <div className="cursor-pointer bg-amber-950/90 text-amber-400 border border-amber-500/80 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shadow-md hover:scale-105 transition flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>TOLL • FASTag</span>
                </div>
              </AdvancedMarker>
            )}

            {/* 4. DYNAMIC LIVE DELIVERY TRUCK MARKER */}
            <AdvancedMarker
              position={truckPos}
              title={`KA-04-E-8924 (${speedKmH} km/h)`}
              onClick={() => setSelectedInfo('truck')}
            >
              <div className="relative flex flex-col items-center cursor-pointer select-none">
                {/* Status Badge */}
                <div className="bg-stone-900/95 text-white border border-orange-500/80 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-xl flex items-center gap-1 mb-1 whitespace-nowrap backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>KA-04-E-8924</span>
                  <span className="text-orange-400 font-semibold">{speedKmH} km/h</span>
                </div>

                {/* Truck Visual Body with Heading Rotation */}
                <div
                  className="relative transition-transform duration-100 ease-linear"
                  style={{ transform: `rotate(${truckHeading}deg)` }}
                >
                  {/* Radar Wave Pulse */}
                  <div className="absolute -inset-2 rounded-full bg-orange-500/20 animate-ping pointer-events-none"></div>

                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 border-2 border-white shadow-2xl flex items-center justify-center text-white">
                    <Truck className="w-5 h-5 text-white drop-shadow-md" />
                  </div>

                  {/* Directional Heading Pointer */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-t border-l border-orange-600"></div>
                </div>
              </div>
            </AdvancedMarker>

            {/* INFOWINDOWS FOR INTERACTIVE INSPECTION */}
            {selectedInfo === 'truck' && (
              <InfoWindow
                position={truckPos}
                maxWidth={300}
                onCloseClick={() => setSelectedInfo(null)}
              >
                <div className="p-1 text-stone-900 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="font-extrabold text-orange-600 text-sm font-mono flex items-center gap-1">
                      <Truck className="w-4 h-4 text-orange-600" />
                      KA-04-E-8924
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      GPS Online
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Current Speed:</span>
                      <span className="font-mono font-bold text-stone-900">{speedKmH} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Distance Travelled:</span>
                      <span className="font-mono font-bold text-stone-900">{currentKm} / {totalDistanceKm} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Est. Arrival (ETA):</span>
                      <span className="font-mono font-bold text-emerald-700">~{etaMinutes} mins</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Waypoint:</span>
                      <span className="font-semibold text-stone-800 truncate max-w-[140px]">{activeWaypoint}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Consignment:</span>
                      <span className="font-bold text-stone-900">{volumeTons}T {formatMaterialTitleCase(material)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-emerald-600" />
                        Carbon Logged:
                      </span>
                      <span className="font-mono font-bold text-emerald-700">+{accumulatedCo2} t CO₂</span>
                    </div>
                  </div>
                </div>
              </InfoWindow>
            )}

            {selectedInfo === 'seller' && (
              <InfoWindow
                position={origin}
                maxWidth={280}
                onCloseClick={() => setSelectedInfo(null)}
              >
                <div className="p-1 text-stone-900 text-xs space-y-1">
                  <div className="font-bold text-orange-600 text-xs">Origin Consignor Facility</div>
                  <div className="font-semibold text-stone-900 text-sm leading-tight">{sellerName}</div>
                  <div className="text-[11px] text-stone-600">
                    Industrial Cluster: <span className="font-semibold">{activeDeal?.seller?.cluster}</span>
                  </div>
                  <div className="text-[11px] text-stone-600">
                    Consent: <span className="font-mono font-bold">{activeDeal?.seller?.consent_type || 'Red-CFO'}</span>
                  </div>
                  <div className="text-[10px] text-stone-500 pt-1 border-t">
                    KSPCB XGN Gate Clearance Authorized.
                  </div>
                </div>
              </InfoWindow>
            )}

            {selectedInfo === 'buyer' && (
              <InfoWindow
                position={destination}
                maxWidth={280}
                onCloseClick={() => setSelectedInfo(null)}
              >
                <div className="p-1 text-stone-900 text-xs space-y-1">
                  <div className="font-bold text-emerald-600 text-xs">Destination Consignee Facility</div>
                  <div className="font-semibold text-stone-900 text-sm leading-tight">{buyerName}</div>
                  <div className="text-[11px] text-stone-600">
                    Cluster: <span className="font-semibold">{activeDeal?.buyer?.cluster}</span>
                  </div>
                  <div className="text-[11px] text-stone-600">
                    Acceptance Silo: <span className="font-semibold">Ready for QA Inflow</span>
                  </div>
                  <div className="text-[10px] text-stone-500 pt-1 border-t">
                    Digital Waste Passport recipient registered.
                  </div>
                </div>
              </InfoWindow>
            )}

            {selectedInfo === 'toll' && (
              <InfoWindow
                position={tollPosition}
                maxWidth={240}
                onCloseClick={() => setSelectedInfo(null)}
              >
                <div className="p-1 text-stone-900 text-xs space-y-1">
                  <div className="font-bold text-amber-600 flex items-center gap-1">
                    <span>{tolls[0]?.name || 'Highway Toll Plaza'}</span>
                  </div>
                  <div className="text-[11px] text-stone-600">
                    Highway: <span className="font-mono font-bold">{tolls[0]?.expressway || highwayNumber}</span>
                  </div>
                  <div className="text-[11px] text-stone-600">
                    FASTag Fee: <span className="font-mono font-bold text-stone-900">₹{tolls[0]?.fee_inr || 165}</span>
                  </div>
                  <div className="text-[10px] bg-emerald-50 text-emerald-800 p-1 rounded font-semibold border border-emerald-200">
                    Electronic Toll Auto-Cleared (E-Way Manifest Linked)
                  </div>
                </div>
              </InfoWindow>
            )}

            {/* TOP-LEFT HUD OVERLAY: Corridor & GPS Status */}
            <MapControl position={ControlPosition.TOP_LEFT}>
              <div className="m-2.5 bg-stone-950/90 backdrop-blur-md border border-stone-700/80 rounded-xl p-2.5 shadow-xl text-xs space-y-1.5 max-w-[280px]">
                <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-1">
                  <span className="flex items-center gap-1.5 font-bold text-emerald-400 font-mono text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    GOOGLE MAPS GPS
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono bg-stone-800 px-1.5 py-0.5 rounded">
                    {highwayNumber}
                  </span>
                </div>
                <div className="text-[11px] text-stone-300 font-medium leading-tight truncate">
                  {corridorName}
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-400 pt-0.5">
                  <span>Progress:</span>
                  <span className="font-mono font-bold text-orange-400">
                    {Math.round(progress * 100)}% ({currentKm} km)
                  </span>
                </div>
              </div>
            </MapControl>

            {/* TOP-RIGHT MAP CONTROLS */}
            <MapControl position={ControlPosition.TOP_RIGHT}>
              <div className="m-2.5 flex flex-col gap-1.5 items-end">
                {/* Map Type Toggle */}
                <div className="bg-stone-950/90 backdrop-blur-md border border-stone-700/80 rounded-xl p-1 shadow-xl flex items-center gap-1 text-[11px] font-medium text-stone-300">
                  <button
                    onClick={() => setMapTypeId('roadmap')}
                    className={`px-2 py-1 rounded-lg transition ${
                      mapTypeId === 'roadmap' ? 'bg-orange-600 text-white font-bold' : 'hover:bg-stone-800'
                    }`}
                  >
                    Road
                  </button>
                  <button
                    onClick={() => setMapTypeId('satellite')}
                    className={`px-2 py-1 rounded-lg transition ${
                      mapTypeId === 'satellite' ? 'bg-orange-600 text-white font-bold' : 'hover:bg-stone-800'
                    }`}
                  >
                    Satellite
                  </button>
                  <button
                    onClick={() => setMapTypeId('terrain')}
                    className={`px-2 py-1 rounded-lg transition ${
                      mapTypeId === 'terrain' ? 'bg-orange-600 text-white font-bold' : 'hover:bg-stone-800'
                    }`}
                  >
                    Terrain
                  </button>
                </div>

                {/* Layer Quick Toggles */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowTraffic(!showTraffic)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border shadow-md transition flex items-center gap-1 backdrop-blur-md ${
                      showTraffic
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-stone-900/90 text-stone-300 border-stone-700 hover:bg-stone-800'
                    }`}
                    title="Toggle Google Maps Live Traffic Layer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Traffic</span>
                  </button>

                  <button
                    onClick={() => setFollowTruck(!followTruck)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border shadow-md transition flex items-center gap-1 backdrop-blur-md ${
                      followTruck
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-stone-900/90 text-stone-300 border-stone-700 hover:bg-stone-800'
                    }`}
                    title="Keep camera centered on moving truck"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Follow</span>
                  </button>

                  {/* API Key Modal Button */}
                  <button
                    onClick={() => setIsKeyInputOpen(!isKeyInputOpen)}
                    className="p-1.5 rounded-xl bg-stone-900/90 border border-stone-700 text-stone-400 hover:text-white transition shadow-md"
                    title="Configure Google Maps API Key"
                  >
                    <Key className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </MapControl>

            {/* BOTTOM-LEFT: Telematics Strip */}
            <MapControl position={ControlPosition.BOTTOM_LEFT}>
              <div className="m-2.5 bg-stone-950/90 backdrop-blur-md border border-stone-700/80 rounded-xl px-3 py-1.5 shadow-xl text-[11px] font-mono text-stone-300 flex items-center gap-3">
                <div className="flex items-center gap-1 text-emerald-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>KSPCB GPS Validated</span>
                </div>
                <span className="text-stone-600">|</span>
                <div>ETA: <span className="text-amber-400 font-bold">~{etaMinutes} min</span></div>
                <span className="text-stone-600">|</span>
                <div>Speed: <span className="text-white font-bold">{speedKmH} km/h</span></div>
              </div>
            </MapControl>
          </Map>
        </div>
      </APIProvider>

      {/* Optional Google Maps API Key Config Drawer / Modal */}
      {isKeyInputOpen && (
        <div className="absolute inset-0 z-30 bg-stone-950/95 backdrop-blur-md p-6 flex flex-col justify-center items-center text-center">
          <div className="max-w-md w-full bg-stone-900 border border-stone-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Key className="w-4 h-4 text-orange-400" />
                <span>Google Maps Platform Integration</span>
              </div>
              <button
                onClick={() => setIsKeyInputOpen(false)}
                className="text-stone-400 hover:text-white text-xs font-bold px-2 py-1 bg-stone-800 rounded-lg"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-stone-300 text-left leading-relaxed">
              Google Maps Platform provides real-time satellite cartography, routing, and live traffic for Karnataka freight corridors. You can provide your Google Maps API key or use the built-in development setup.
            </p>

            <div className="text-left space-y-2">
              <label className="text-[11px] font-mono font-bold text-stone-400 uppercase">
                Custom API Key (or Demo Key)
              </label>
              <input
                type="text"
                value={customKeyDraft}
                onChange={(e) => setCustomKeyDraft(e.target.value)}
                placeholder="AIzaSy... (leave empty to use default)"
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  setApiKey(customKeyDraft.trim());
                  setIsKeyInputOpen(false);
                }}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white rounded-xl py-2 text-xs font-bold transition shadow-md"
              >
                Apply Key
              </button>

              <button
                onClick={() => {
                  setCustomKeyDraft('');
                  setApiKey('');
                  setIsKeyInputOpen(false);
                }}
                className="bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl px-4 py-2 text-xs font-semibold transition"
              >
                Reset Default
              </button>
            </div>

            <div className="text-[11px] text-stone-500 text-left pt-2 border-t border-stone-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Attribution tag: <code className="text-orange-400 font-mono">gmp_mcp_codeassist_v1_aistudio</code></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
