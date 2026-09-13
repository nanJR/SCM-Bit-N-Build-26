import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  CandidateMatch,
  Carrier,
  CircularPurchaseOrder,
  DigitalWastePassport,
  EWayBill,
  Facility,
  FreightNegotiationResult,
  FreightNegotiationRound,
  HazardousManifestForm10,
  LedgerVerification,
  LogisticsCorridor,
  MonthlyQuotaCheck,
  NegotiationResult,
  NegotiationRound,
  PassportDealData,
  PipelineItemResult,
  PooledMember,
  QualityToleranceCheck,
  RegulatoryDecision,
  RouteFeasibility,
  SettlementRecord,
} from '../src/types';
import { getDefaultCarriers, getDefaultFacilities, MATERIAL_TAXONOMY } from './data';
import { askGemini } from './gemini';
import {
  syncFacilitiesWithFirestore,
  saveFacilityToFirestore,
  logTelemetryToFirestore,
  savePassportsToFirestore,
} from './firebase';

const MAX_FEASIBLE_RADIUS_KM = 60;
const TRUCK_COST_PER_KM_PER_TON = 8.0;
const CO2_EMISSION_KG_PER_TON_KM = 0.1;

// Aggregator / Micro-Lot Pooling Agent: same-material sellers in the same
// cluster with individual volume below this threshold get merged into one
// pooled virtual seller before matchmaking, so fragmented MSME micro-lots
// (a few tons each) can clear the same freight/regulatory pipeline as a
// single viable consignment instead of being ignored one-by-one.
const POOLING_VOLUME_THRESHOLD_TONS = 3.0;

// Fixed per-shipment overhead (loading, paperwork, minimum-trip charge) that
// a single small shipment must absorb in full, but that a pooled consignment
// splits proportionally across its members -- this is what actually makes
// pooling pay off, not just convenience.
const FIXED_DISPATCH_FEE_INR = 800;

// A carrier already running a route this pipeline run gets a discount on
// its next quote in the same run, modeling a cheaper backhaul/return leg
// instead of an empty return trip.
const BACKHAUL_DISCOUNT_FACTOR = 0.85;

const SETTLEMENT_ADVANCE_PCT = 60;
const KATOTI_DEDUCTION_CAP_PCT = 2;

const CO2_VIRGIN_MATERIAL_KG_PER_TON: Record<string, number> = {
  steel_slag: 1800,
  fly_ash: 900,
  metal_scrap: 1500,
  plastic_scrap: 2000,
  rubber_waste: 1200,
  recycled_concrete_aggregate: 850,
  demolition_rubble: 450,
  chrome_sludge: 0,
  used_oil: 400,
  dye_sludge: 0,
};

// CSTEP 2022 Emission Inventory avoided factors per ton of secondary material valorized
const PM10_AVOIDED_KG_PER_TON: Record<string, number> = {
  recycled_concrete_aggregate: 14.5, // Avoids quarrying & aggregate blasting dust (CSTEP Eq. 1.2 t/acre-month)
  demolition_rubble: 8.0,
  fly_ash: 6.2, // Avoids cement clinker crushing & kiln particulate dust
  steel_slag: 5.0,
  metal_scrap: 3.5,
  plastic_scrap: 2.1,
  used_oil: 1.2,
};

const SO2_AVOIDED_KG_PER_TON: Record<string, number> = {
  fly_ash: 4.8, // Replaces thermal fuel oil/coke in cement clinker production
  steel_slag: 3.2,
  metal_scrap: 2.5,
  used_oil: 1.8,
  recycled_concrete_aggregate: 0.9,
};

const MOCK_HAZARD_RULES: Record<string, string> = {
  chrome_sludge: 'KSPCB HW Rules 2016 (Sched. II): Requires KSPCB Authorized CETP (e.g. VIWA Eco-Club) or TSDF (KWMP Dabaspet) manifest Form-10.',
  used_oil: 'KSPCB HW Rules 2016 (Sched. IV): Requires KSPCB Authorized Rerefiner under CPCB Centralized EPR Portal.',
  dye_sludge: 'KSPCB Water & Air Act: Requires authorized effluent treatment/TSDF disposal clearance.',
  recycled_concrete_aggregate: 'CPCB 2017 & C&D Waste Rules 2016: Governed by BIS IS:383:2016 for Recycled Concrete Aggregate (max 20% in RCC M25; 100% in lean concrete).',
  fly_ash: 'MoEFCC SO 5481(E): Mandatory 100% ash utilization mandate for cement, RMC, and bricks within 300km.',
  steel_slag: 'IRC & National Building Code 2005 Part 11: Granular Sub-Base (GSB) replacement for road pavements.',
};

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function calculateLogisticsCorridor(seller: Facility, buyer: Facility, straightKm: number): LogisticsCorridor {
  const roadDistanceKm = Math.round(straightKm * 1.25 * 10) / 10;

  if (
    (seller.cluster === 'Peenya' && buyer.cluster === 'Dobaspet') ||
    (seller.cluster === 'Dobaspet' && buyer.cluster === 'Peenya')
  ) {
    return {
      corridor_name: 'NH-48 / Tumkur Road Industrial Corridor',
      highway_number: 'NH-48 (Bengaluru - Pune Highway)',
      road_circuity_factor: 1.25,
      tolls: [
        { name: 'Nelamangala Expressway Toll Plaza (NHAI)', fee_inr: 145, expressway: 'NH-48' },
      ],
      total_toll_inr: 145,
      bbmp_peak_restriction: {
        restricted: true,
        window: '08:00 - 11:00 & 16:00 - 20:00 IST',
        advisory: 'BBMP Traffic Police entry restriction for 3+ axle trucks at Goraguntepalya / 8th Mile Junction.',
      },
      recommended_dispatch_window: 'OFFPEAK_DAY_1100_1600',
      est_transit_minutes: Math.round(roadDistanceKm * 2.2),
    };
  }

  if (
    (seller.cluster === 'Whitefield' && buyer.cluster === 'Chikkajala') ||
    (seller.cluster === 'Chikkajala' && buyer.cluster === 'Whitefield')
  ) {
    return {
      corridor_name: 'SH-104 / Budigere Cross Outer Airport Bypass Link',
      highway_number: 'SH-104 / STRR Radial Link',
      road_circuity_factor: 1.22,
      tolls: [
        { name: 'Budigere Cross Infrastructure Toll', fee_inr: 85, expressway: 'SH-104' },
      ],
      total_toll_inr: 85,
      bbmp_peak_restriction: {
        restricted: false,
        window: 'None (Circumnavigates BBMP Bruhat limits)',
        advisory: 'Outer arterial bypass; free 24x7 heavy commercial vehicle transit permitted.',
      },
      recommended_dispatch_window: 'ANYTIME_OUTER_BYPASS',
      est_transit_minutes: Math.round(roadDistanceKm * 1.8),
    };
  }

  if (
    (seller.cluster === 'Peenya' && buyer.cluster === 'Bidadi') ||
    (seller.cluster === 'Bidadi' && buyer.cluster === 'Peenya')
  ) {
    return {
      corridor_name: 'NICE Peripheral Ring Expressway Corridor',
      highway_number: 'NICE Expressway (NH-48 to Mysore Road NH-275)',
      road_circuity_factor: 1.28,
      tolls: [
        { name: 'NICE Somapura Toll Plaza', fee_inr: 140, expressway: 'NICE Expressway' },
        { name: 'NICE Cloverleaf Junction Toll', fee_inr: 140, expressway: 'NICE Expressway' },
      ],
      total_toll_inr: 280,
      bbmp_peak_restriction: {
        restricted: false,
        window: 'Exempt on Expressway Right-of-Way',
        advisory: 'Access-controlled private expressway bypass avoids Bengaluru city limits.',
      },
      recommended_dispatch_window: 'ANYTIME_OUTER_BYPASS',
      est_transit_minutes: Math.round(roadDistanceKm * 1.9),
    };
  }

  if (
    (seller.cluster === 'Harohalli' && buyer.cluster === 'Peenya') ||
    (seller.cluster === 'Peenya' && buyer.cluster === 'Harohalli')
  ) {
    return {
      corridor_name: 'Kanakapura Road (NH-948) & NICE South Corridor',
      highway_number: 'NH-948 & NICE Link',
      road_circuity_factor: 1.30,
      tolls: [
        { name: 'NICE South Kanakapura Road Toll', fee_inr: 240, expressway: 'NICE Expressway' },
      ],
      total_toll_inr: 240,
      bbmp_peak_restriction: {
        restricted: true,
        window: '08:00 - 11:00 & 16:00 - 20:00 IST',
        advisory: 'City traffic bottleneck at Banashankari / Kanakapura Road junction.',
      },
      recommended_dispatch_window: 'NIGHT_CORRIDOR_2200_0600',
      est_transit_minutes: Math.round(roadDistanceKm * 2.4),
    };
  }

  return {
    corridor_name: 'Karnataka State Highway & Industrial Feeder Network',
    highway_number: 'State Arterial Corridor',
    road_circuity_factor: 1.25,
    tolls: [],
    total_toll_inr: 0,
    bbmp_peak_restriction: {
      restricted: false,
      window: 'Standard Intra-Cluster Movement',
      advisory: 'Local industrial estate transit under Karnataka Motor Vehicles Rules.',
    },
    recommended_dispatch_window: 'OFFPEAK_DAY_1100_1600',
    est_transit_minutes: Math.round(roadDistanceKm * 2.0),
  };
}

export function checkMaterialChemistryAssay(
  seller: Facility,
  buyer: Facility,
  _material: string
): QualityToleranceCheck {
  if (seller.lab_assay) {
    const cert = seller.lab_assay;
    let penaltyDiscountPct = 0;
    let note = `Lab Assay ${cert.certificate_id} (${cert.lab_name}) verified. Overall Grade: ${cert.overall_grade}.`;

    // Sensor adjustment penalty if moisture is high
    if (seller.sensor_adjustment?.moisture_pct && seller.sensor_adjustment.moisture_pct > 15) {
      penaltyDiscountPct += 5;
      note += ` Live IoT moisture alert (${seller.sensor_adjustment.moisture_pct}%): 5% quality penalty applied.`;
    }

    // Buyer specific quality checks
    if (buyer.quality_requirements) {
      if (buyer.quality_requirements.max_loi_pct) {
        const loiParam = cert.parameters.find((p) => p.name.includes('Loss on Ignition'));
        if (loiParam && loiParam.value > buyer.quality_requirements.max_loi_pct) {
          return {
            compatible: false,
            assay_certificate: cert,
            penalty_discount_pct: 0,
            technical_note: `LOI assay (${loiParam.value}%) exceeds buyer cement clinker tolerance (${buyer.quality_requirements.max_loi_pct}%).`,
          };
        }
      }

      if (buyer.quality_requirements.max_water_absorption_pct) {
        const waParam = cert.parameters.find((p) => p.name.includes('Water Absorption'));
        if (waParam && waParam.value > buyer.quality_requirements.max_water_absorption_pct) {
          return {
            compatible: false,
            assay_certificate: cert,
            penalty_discount_pct: 0,
            technical_note: `Water absorption (${waParam.value}%) exceeds max allowable threshold (${buyer.quality_requirements.max_water_absorption_pct}%).`,
          };
        }
      }
    }

    return {
      compatible: true,
      assay_certificate: cert,
      penalty_discount_pct: penaltyDiscountPct,
      technical_note: note,
    };
  }

  // Fallback if no lab assay
  return {
    compatible: true,
    assay_certificate: {
      certificate_id: 'STD-ASSAY-VERIFIED',
      lab_name: 'KSPCB Empanelled Environmental Laboratory',
      sample_date: new Date().toISOString().split('T')[0],
      batch_id: 'BATCH-DEFAULT',
      parameters: [
        { name: 'Standard Purity Index', unit: '%', value: 95.0, test_standard: 'IS Standard', status: 'COMPLIANT' },
      ],
      overall_grade: 'Standard Commercial Grade',
      usable_in_production: true,
    },
    penalty_discount_pct: 0,
    technical_note: 'Standard commercial grade verified against BIS/CPCB specification.',
  };
}

export function validateRoute(
  seller: Facility,
  buyer: Facility,
  volumeTons: number
): RouteFeasibility {
  const distKm = haversineKm(seller.lat, seller.lon, buyer.lat, buyer.lon);
  const feasible = distKm <= MAX_FEASIBLE_RADIUS_KM;

  const corridor = calculateLogisticsCorridor(seller, buyer, distKm);
  const totalToll = corridor.total_toll_inr;

  const freightBase = distKm * TRUCK_COST_PER_KM_PER_TON * volumeTons;
  const transportCostTotal = Math.round((freightBase + totalToll) * 100) / 100;
  const transportCostPerTon = volumeTons > 0 ? Math.round((transportCostTotal / volumeTons) * 100) / 100 : 0;

  const co2TransportKg = Math.round(distKm * CO2_EMISSION_KG_PER_TON_KM * volumeTons * 100) / 100;
  const co2AvoidedKg = Math.round((CO2_VIRGIN_MATERIAL_KG_PER_TON[seller.material] || 0) * volumeTons * 100) / 100;
  const netCo2ImpactKg = Math.round((co2AvoidedKg - co2TransportKg) * 100) / 100;
  const pm10AvoidedKg = Math.round((PM10_AVOIDED_KG_PER_TON[seller.material] || 0) * volumeTons * 100) / 100;
  const so2AvoidedKg = Math.round((SO2_AVOIDED_KG_PER_TON[seller.material] || 0) * volumeTons * 100) / 100;

  return {
    distance_km: Math.round(distKm * 100) / 100,
    feasible,
    max_radius_km: MAX_FEASIBLE_RADIUS_KM,
    transport_cost_total_inr: transportCostTotal,
    transport_cost_per_ton_inr: transportCostPerTon,
    co2_avoided_kg: co2AvoidedKg,
    co2_transport_kg: co2TransportKg,
    net_co2_impact_kg: netCo2ImpactKg,
    pm10_avoided_kg: pm10AvoidedKg,
    so2_avoided_kg: so2AvoidedKg,
    reason: feasible
      ? `Route within ${MAX_FEASIBLE_RADIUS_KM}km cluster radius via ${corridor.corridor_name}.`
      : `Distance ${Math.round(distKm * 10) / 10}km exceeds ${MAX_FEASIBLE_RADIUS_KM}km feasibility radius.`,
    corridor,
  };
}

export interface PoolMembership {
  facility_id: string;
  volume_tons: number;
  cost_floor_inr_per_ton: number;
}

// Merges same-material, same-cluster sellers whose individual volume falls
// below POOLING_VOLUME_THRESHOLD_TONS into a single synthetic pooled seller,
// so matchmaking/negotiation treats fragmented micro-lots as one viable
// consignment. Returns the transformed facility map (originals removed,
// non-qualifying facilities untouched) plus a membership index keyed by the
// pooled seller's id, used later to split payouts proportionally.
export function poolMicroLotSellers(
  facilities: Record<string, Facility>
): { pooledFacilities: Record<string, Facility>; poolMembership: Record<string, PoolMembership[]> } {
  const groups: Record<string, Facility[]> = {};

  for (const f of Object.values(facilities)) {
    if (f.role !== 'seller' || f.volume_tons_per_month >= POOLING_VOLUME_THRESHOLD_TONS) continue;
    const key = `${f.material}::${f.cluster}`;
    (groups[key] = groups[key] || []).push(f);
  }

  const pooledFacilities: Record<string, Facility> = { ...facilities };
  const poolMembership: Record<string, PoolMembership[]> = {};

  for (const [key, members] of Object.entries(groups)) {
    if (members.length < 2) continue; // nothing to pool

    const [material, cluster] = key.split('::');
    const totalVolume = Math.round(members.reduce((acc, m) => acc + m.volume_tons_per_month, 0) * 100) / 100;
    const weightedFloor =
      members.reduce((acc, m) => acc + (m.cost_floor_inr_per_ton || 0) * m.volume_tons_per_month, 0) / totalVolume;
    const avgLat = members.reduce((acc, m) => acc + m.lat, 0) / members.length;
    const avgLon = members.reduce((acc, m) => acc + m.lon, 0) / members.length;
    const template = members[0];
    const poolId = `POOL-${material}-${cluster}`.toUpperCase();

    for (const m of members) delete pooledFacilities[m.id];

    const aggregatedQuota = members.reduce(
      (acc, m) => ({
        authorized: acc.authorized + (m.xgn_details?.authorized_monthly_quota_tons || 0),
        consumed: acc.consumed + (m.xgn_details?.current_month_consumed_tons || 0),
      }),
      { authorized: 0, consumed: 0 }
    );

    pooledFacilities[poolId] = {
      ...template,
      id: poolId,
      name: `Pooled Micro-Lot Consignment: ${members.length} MSMEs (${cluster})`,
      cluster,
      lat: avgLat,
      lon: avgLon,
      material,
      volume_tons_per_month: totalVolume,
      cost_floor_inr_per_ton: Math.round(weightedFloor),
      lab_assay: undefined,
      sensor_adjustment: undefined,
      xgn_details: template.xgn_details
        ? {
            ...template.xgn_details,
            authorized_monthly_quota_tons: Math.round(aggregatedQuota.authorized * 100) / 100,
            current_month_consumed_tons: Math.round(aggregatedQuota.consumed * 100) / 100,
          }
        : undefined,
    };

    poolMembership[poolId] = members.map((m) => ({
      facility_id: m.id,
      volume_tons: m.volume_tons_per_month,
      cost_floor_inr_per_ton: m.cost_floor_inr_per_ton || 0,
    }));
  }

  return { pooledFacilities, poolMembership };
}

export function findCandidateMatches(facilities: Record<string, Facility>): CandidateMatch[] {
  const sellers = Object.values(facilities).filter((f) => f.role === 'seller');
  const buyers = Object.values(facilities).filter((f) => f.role === 'buyer');

  const candidates: CandidateMatch[] = [];

  for (const s of sellers) {
    for (const b of buyers) {
      if (s.material !== b.material) continue;
      const volume = Math.min(s.volume_tons_per_month, b.volume_tons_per_month);
      const route = validateRoute(s, b, volume);
      if (route.feasible) {
        const qualityCheck = checkMaterialChemistryAssay(s, b, s.material);
        candidates.push({
          seller_id: s.id,
          buyer_id: b.id,
          material: s.material,
          route,
          quality_check: qualityCheck,
        });
      }
    }
  }

  return candidates;
}

export async function rankCandidates(
  candidates: CandidateMatch[],
  facilities: Record<string, Facility>
): Promise<CandidateMatch[]> {
  if (candidates.length === 0) return [];

  // Sort by shortest distance first
  const ranked = [...candidates].sort((a, b) => a.route.distance_km - b.route.distance_km).slice(0, 8);

  const results = await Promise.all(
    ranked.map(async (c) => {
      const s = facilities[c.seller_id];
      const b = facilities[c.buyer_id];
      const system =
        'You are the Matchmaker Agent in an industrial symbiosis network. In one short sentence, explain why this pairing makes sense. Be concrete and factual.';
      const user = `Seller: ${s.name} produces ${s.material} (${s.volume_tons_per_month} tons/month). Buyer: ${b.name} needs ${b.material}. Distance: ${c.route.distance_km}km. CO2 impact estimate: ${c.route.net_co2_impact_kg}kg net. Corridor: ${c.route.corridor?.corridor_name}.`;

      const justification = await askGemini(system, user, 80);
      return { ...c, justification };
    })
  );

  return results;
}

export interface ConcessionRound {
  round: number;
  ask: number;
  bid: number;
}

export interface ConcessionOutcome {
  outcome: 'DEAL' | 'NO_DEAL';
  final_value: number | null;
  rounds: ConcessionRound[];
}

// Generic monotonic-concession negotiation mechanics, shared by material-price
// and freight-rate negotiations. Deliberately side-effect-free (no Gemini calls)
// so callers can attach their own domain-specific notes per round.
export function runConcessionNegotiation(
  floor: number,
  ceiling: number,
  openingAskMultiplier: number,
  openingBidMultiplier: number,
  maxRounds: number = 5
): ConcessionOutcome {
  let askPrice = floor * openingAskMultiplier;
  let bidPrice = ceiling * openingBidMultiplier;

  const initialGap = askPrice - bidPrice;
  const step = Math.max(initialGap, 0) / Math.max(maxRounds - 1, 1);

  const rounds: ConcessionRound[] = [];
  let outcome: 'DEAL' | 'NO_DEAL' = 'NO_DEAL';
  let finalValue: number | null = null;

  for (let r = 1; r <= maxRounds; r++) {
    const roundAsk = Math.round(askPrice);
    const roundBid = Math.round(bidPrice);

    if (bidPrice >= askPrice) {
      finalValue = Math.round((askPrice + bidPrice) / 2);
      outcome = 'DEAL';
      rounds.push({ round: r, ask: roundAsk, bid: roundBid });
      break;
    }

    rounds.push({ round: r, ask: roundAsk, bid: roundBid });

    // Monotonic concession
    askPrice = Math.max(floor, askPrice - step / 2);
    bidPrice = Math.min(ceiling, bidPrice + step / 2);
  }

  return { outcome, final_value: finalValue, rounds };
}

export async function negotiate(
  seller: Facility,
  buyer: Facility,
  material: string,
  volumeTons: number
): Promise<NegotiationResult> {
  let floor = seller.cost_floor_inr_per_ton;
  let ceiling = buyer.cost_ceiling_inr_per_ton;

  const route = validateRoute(seller, buyer, volumeTons);
  const qualityCheck = checkMaterialChemistryAssay(seller, buyer, material);

  if (floor === null || ceiling === null) {
    return {
      seller_id: seller.id,
      buyer_id: buyer.id,
      material,
      volume_tons: volumeTons,
      outcome: 'NO_DEAL',
      final_price_inr_per_ton: null,
      reason: 'Missing private cost data for one party.',
      rounds: [],
      logistics: route,
    };
  }

  // If chemical assay has a penalty discount (e.g. moisture >15%), buyer demands price haircut
  let qualityAdjustment = 0;
  if (qualityCheck.penalty_discount_pct > 0) {
    qualityAdjustment = qualityCheck.penalty_discount_pct;
    floor = Math.round(floor * (1 - qualityAdjustment / 100));
    ceiling = Math.round(ceiling * (1 - qualityAdjustment / 100));
  }

  const MAX_ROUNDS = 5;
  const concession = runConcessionNegotiation(floor, ceiling, 1.4, 0.6, MAX_ROUNDS);

  const rounds: NegotiationRound[] = [];
  for (const cRound of concession.rounds) {
    const { round: r, ask: sAsk, bid: bBid } = cRound;
    const isSettleRound = concession.outcome === 'DEAL' && r === concession.rounds[concession.rounds.length - 1].round;

    let sellerNote = `Round ${r}: seller conceding to INR ${sAsk}/ton towards buyer bid while protecting operating margins.`;
    let buyerNote = `Round ${r}: buyer advancing bid to INR ${bBid}/ton to bridge spread against virgin material ceiling.`;

    // Generate LLM notes for the opening round and when reaching a deal or final round
    if (r === 1 || isSettleRound || r === MAX_ROUNDS) {
      const sellerNotePromise = askGemini(
        `You are the Seller agent in a B2B waste-material negotiation. In ONE short sentence, justify your price offer. Be concise and factual.`,
        `Round ${r}: offering INR ${sAsk}/ton for ${material}. Floor is INR ${floor}/ton.${qualityAdjustment > 0 ? ` Note: ${qualityAdjustment}% quality deduction applied.` : ''}`,
        60
      );

      const buyerNotePromise = askGemini(
        `You are the Buyer agent in a B2B waste-material negotiation. In ONE short sentence, justify your price offer. Be concise and factual.`,
        `Round ${r}: bidding INR ${bBid}/ton for ${material}. Ceiling is INR ${ceiling}/ton.`,
        60
      );

      const [sNote, bNote] = await Promise.all([sellerNotePromise, buyerNotePromise]);
      sellerNote = sNote;
      buyerNote = bNote;
    }

    rounds.push({
      round: r,
      seller_ask: sAsk,
      buyer_bid: bBid,
      seller_note: sellerNote,
      buyer_note: buyerNote,
    });
  }

  const outcome = concession.outcome;
  const finalPrice = concession.final_value;

  let reason: string | null = null;
  if (outcome === 'NO_DEAL') {
    reason = `No overlap within ${MAX_ROUNDS} rounds (seller floor INR ${floor}/ton vs buyer ceiling INR ${ceiling}/ton too far apart).`;
  }

  return {
    seller_id: seller.id,
    buyer_id: buyer.id,
    material,
    volume_tons: volumeTons,
    outcome,
    final_price_inr_per_ton: finalPrice,
    reason,
    rounds,
    logistics: route,
    quality_adjustment_applied: qualityAdjustment > 0 ? qualityAdjustment : undefined,
  };
}

export function selectBestCarrier(
  carriers: Record<string, Carrier>,
  volumeTons: number,
  isHazardous: boolean
): Carrier | null {
  const eligible = Object.values(carriers).filter(
    (c) => c.capacity_tons >= volumeTons && (!isHazardous || c.hazmat_transport_license)
  );
  if (eligible.length === 0) return null;
  // Smallest capacity that still fits is treated as the most cost-efficient match.
  return [...eligible].sort((a, b) => a.capacity_tons - b.capacity_tons)[0];
}

export async function negotiateFreight(
  carrier: Carrier | null,
  route: RouteFeasibility,
  buyerCeilingInrPerTon: number,
  agreedMaterialPriceInrPerTon: number,
  volumeTons: number,
  material: string,
  isBackhaul: boolean = false
): Promise<FreightNegotiationResult> {
  if (!carrier) {
    return {
      carrier_id: null,
      carrier_name: null,
      vehicle_type: null,
      outcome: 'NO_CARRIER',
      final_rate_inr_per_ton_km: null,
      total_freight_cost_inr: null,
      reason: 'No eligible carrier: no registered fleet operator has sufficient capacity (or hazmat transport license) for this consignment.',
      rounds: [],
    };
  }

  const distanceKm = route.distance_km;
  const headroomInrPerTon = buyerCeilingInrPerTon - agreedMaterialPriceInrPerTon;
  const headroomInrPerTonKm = distanceKm > 0 ? headroomInrPerTon / distanceKm : 0;

  const floor = isBackhaul
    ? Math.round(carrier.rate_floor_inr_per_ton_km * BACKHAUL_DISCOUNT_FACTOR * 100) / 100
    : carrier.rate_floor_inr_per_ton_km;
  const ceiling = headroomInrPerTonKm;

  if (ceiling <= floor) {
    return {
      carrier_id: carrier.id,
      carrier_name: carrier.name,
      vehicle_type: carrier.vehicle_type,
      outcome: 'NO_CARRIER',
      final_rate_inr_per_ton_km: null,
      total_freight_cost_inr: null,
      reason: `Buyer's remaining budget headroom (INR ${headroomInrPerTon.toFixed(2)}/ton over ${distanceKm}km, approx. INR ${headroomInrPerTonKm.toFixed(2)}/ton-km) cannot meet ${carrier.name}'s minimum freight rate (INR ${floor}/ton-km).`,
      rounds: [],
    };
  }

  const MAX_ROUNDS = 5;
  const concession = runConcessionNegotiation(floor, ceiling, 1.4, 0.6, MAX_ROUNDS);

  const rounds: FreightNegotiationRound[] = [];
  for (const cRound of concession.rounds) {
    const { round: r, ask: cAsk, bid: sBid } = cRound;
    const isSettleRound = concession.outcome === 'DEAL' && r === concession.rounds[concession.rounds.length - 1].round;

    let carrierNote = `Round ${r}: carrier holding at INR ${cAsk}/ton-km to cover fuel and vehicle utilization costs.`;
    let shipperNote = `Round ${r}: shipper bidding INR ${sBid}/ton-km, bounded by remaining material-price margin.`;

    if (r === 1 || isSettleRound || r === MAX_ROUNDS) {
      const carrierNotePromise = askGemini(
        `You are the Carrier agent in a B2B freight-rate negotiation. In ONE short sentence, justify your freight rate offer. Be concise and factual.`,
        `Round ${r}: quoting INR ${cAsk}/ton-km to move ${material} over ${distanceKm}km. Floor is INR ${floor}/ton-km.`,
        60
      );
      const shipperNotePromise = askGemini(
        `You are the Shipper / Logistics Coordinator agent in a B2B freight-rate negotiation. In ONE short sentence, justify your freight bid. Be concise and factual.`,
        `Round ${r}: bidding INR ${sBid}/ton-km for ${material} over ${distanceKm}km. Ceiling is INR ${ceiling.toFixed(2)}/ton-km.`,
        60
      );
      const [cNote, sNote] = await Promise.all([carrierNotePromise, shipperNotePromise]);
      carrierNote = cNote;
      shipperNote = sNote;
    }

    rounds.push({
      round: r,
      carrier_ask_inr_per_ton_km: cAsk,
      shipper_bid_inr_per_ton_km: sBid,
      carrier_note: carrierNote,
      shipper_note: shipperNote,
    });
  }

  if (concession.outcome === 'NO_DEAL') {
    return {
      carrier_id: carrier.id,
      carrier_name: carrier.name,
      vehicle_type: carrier.vehicle_type,
      outcome: 'NO_CARRIER',
      final_rate_inr_per_ton_km: null,
      total_freight_cost_inr: null,
      reason: `No freight rate overlap within ${MAX_ROUNDS} rounds (carrier floor INR ${floor}/ton-km vs shipper ceiling INR ${ceiling.toFixed(2)}/ton-km).`,
      rounds,
    };
  }

  const finalRate = concession.final_value!;
  const totalFreightCost = Math.round(finalRate * distanceKm * volumeTons + FIXED_DISPATCH_FEE_INR);

  return {
    carrier_id: carrier.id,
    carrier_name: carrier.name,
    vehicle_type: carrier.vehicle_type,
    outcome: 'DEAL',
    final_rate_inr_per_ton_km: finalRate,
    total_freight_cost_inr: totalFreightCost,
    reason: null,
    rounds,
  };
}

export async function reviewDeal(
  seller: Facility,
  buyer: Facility,
  negotiationResult: NegotiationResult,
  carrier?: Carrier | null
): Promise<RegulatoryDecision> {
  const material = negotiationResult.material;
  const isHazardous = seller.hazardous;

  if (negotiationResult.outcome !== 'DEAL') {
    return {
      decision: 'NOT_APPLICABLE',
      reason: 'No price agreement was reached; nothing to review.',
    };
  }

  // 1. Hazardous Waste Certification Check
  if (isHazardous && !buyer.certified_hazard_handler) {
    const rule = MOCK_HAZARD_RULES[material] || 'Requires certified hazardous waste handler.';
    const explanation = await askGemini(
      'You are the KSPCB Regulatory Agent. In one short sentence, explain why this trade is being vetoed on compliance grounds.',
      `Material: ${material}. Rule: ${rule}. Buyer ${buyer.name} is not certified.`,
      80
    );
    return {
      decision: 'VETOED',
      rule_applied: rule,
      explanation,
    };
  }

  // 1b. Hazardous Waste Transport Authorization Check (defense-in-depth; carrier
  // selection already filters for this, so this should be nearly unreachable)
  if (isHazardous && carrier && !carrier.hazmat_transport_license) {
    const rule = 'KSPCB Hazardous and Other Wastes (Management & Transboundary Movement) Rules 2016: Transporter must hold hazmat transport authorization.';
    const explanation = await askGemini(
      'You are the KSPCB Regulatory Agent. In one short sentence, explain why this trade is being vetoed on compliance grounds.',
      `Material: ${material}. Rule: ${rule}. Carrier ${carrier.name} lacks hazmat transport license.`,
      80
    );
    return {
      decision: 'VETOED',
      rule_applied: rule,
      explanation,
    };
  }

  // 2. KSPCB XGN Consent Status Check
  const currentDate = new Date('2026-09-12');
  if (seller.xgn_details) {
    const expiry = new Date(seller.xgn_details.valid_till);
    if (!seller.xgn_details.is_active || expiry < currentDate) {
      const rule = `KSPCB Water/Air Act Consent ${seller.xgn_details.consent_id} expired on ${seller.xgn_details.valid_till}.`;
      return {
        decision: 'VETOED',
        rule_applied: rule,
        explanation: `Trade rejected: Seller consent expired on ${seller.xgn_details.valid_till}. Operating without active CFO violates Section 25/26 of Water Act 1974.`,
        xgn_consent_status: {
          seller_valid: false,
          buyer_valid: true,
          seller_expiry: seller.xgn_details.valid_till,
          buyer_expiry: buyer.xgn_details?.valid_till || 'Active',
        },
      };
    }
  }

  // 3. KSPCB XGN Monthly Quota Check
  let sellerQuotaCheck: MonthlyQuotaCheck | undefined;
  let buyerQuotaCheck: MonthlyQuotaCheck | undefined;

  if (seller.xgn_details) {
    const authorized = seller.xgn_details.authorized_monthly_quota_tons;
    const consumed = seller.xgn_details.current_month_consumed_tons;
    const headroom = Math.max(0, authorized - consumed);
    const exceeded = negotiationResult.volume_tons > headroom;
    sellerQuotaCheck = {
      authorized_quota_tons: authorized,
      consumed_tons: consumed,
      requested_trade_tons: negotiationResult.volume_tons,
      remaining_headroom_tons: headroom,
      quota_exceeded: exceeded,
      warning: exceeded ? `Dispatch volume exceeds monthly permitted quota headroom by ${Math.round((negotiationResult.volume_tons - headroom) * 10) / 10} tons.` : undefined,
    };

    if (exceeded) {
      return {
        decision: 'VETOED',
        rule_applied: 'KSPCB Monthly Permitted Waste Generation Quota',
        explanation: `Trade vetoed: Requested ${negotiationResult.volume_tons} tons exceeds remaining monthly quota (${headroom} tons).`,
        xgn_quota_check: {
          seller_check: sellerQuotaCheck,
          buyer_check: {
            authorized_quota_tons: 9999,
            consumed_tons: 0,
            requested_trade_tons: negotiationResult.volume_tons,
            remaining_headroom_tons: 9999,
            quota_exceeded: false,
          },
        },
      };
    }
  }

  if (buyer.xgn_details) {
    const authorized = buyer.xgn_details.authorized_monthly_quota_tons;
    const consumed = buyer.xgn_details.current_month_consumed_tons;
    const headroom = Math.max(0, authorized - consumed);
    const exceeded = negotiationResult.volume_tons > headroom;
    buyerQuotaCheck = {
      authorized_quota_tons: authorized,
      consumed_tons: consumed,
      requested_trade_tons: negotiationResult.volume_tons,
      remaining_headroom_tons: headroom,
      quota_exceeded: exceeded,
      warning: exceeded ? `Receipt volume exceeds authorized intake quota.` : undefined,
    };

    if (exceeded) {
      return {
        decision: 'VETOED',
        rule_applied: 'KSPCB Monthly Permitted Industrial Intake Quota',
        explanation: `Trade vetoed: Buyer monthly capacity headroom (${headroom} tons) exceeded.`,
        xgn_quota_check: {
          seller_check: sellerQuotaCheck || {
            authorized_quota_tons: 9999,
            consumed_tons: 0,
            requested_trade_tons: negotiationResult.volume_tons,
            remaining_headroom_tons: 9999,
            quota_exceeded: false,
          },
          buyer_check: buyerQuotaCheck,
        },
      };
    }
  }

  const rule = MOCK_HAZARD_RULES[material] || 'Standard non-hazardous material handling under KSPCB rules.';
  const explanation = await askGemini(
    'You are the KSPCB Regulatory Agent. In one short sentence, confirm this trade is compliant and approved under Karnataka Environmental Rules.',
    `Material: ${material}, hazardous=${isHazardous}, buyer certified=${buyer.certified_hazard_handler}, XGN verified.`,
    60
  );

  return {
    decision: 'APPROVED',
    rule_applied: rule,
    explanation,
    xgn_quota_check: sellerQuotaCheck && buyerQuotaCheck ? {
      seller_check: sellerQuotaCheck,
      buyer_check: buyerQuotaCheck,
    } : undefined,
    xgn_consent_status: {
      seller_valid: true,
      buyer_valid: true,
      seller_expiry: seller.xgn_details?.valid_till || '2028-12-31',
      buyer_expiry: buyer.xgn_details?.valid_till || '2028-12-31',
    },
  };
}

export function generateCircularContractAndEWayBill(
  deal: PassportDealData,
  seller: Facility,
  buyer: Facility
): { contract: CircularPurchaseOrder; eway_bill: EWayBill; hazard_manifest?: HazardousManifestForm10 } {
  const taxonomy = MATERIAL_TAXONOMY[deal.material] || {
    hsnCode: '9988',
    defaultGstRate: 18,
  };

  const unitPrice = deal.agreed_price_per_ton || 1000;
  const subtotal = Math.round(unitPrice * deal.volume_tons);
  const gstRate = taxonomy.defaultGstRate;
  const totalGst = Math.round((subtotal * gstRate) / 100);
  const cgst = Math.round(totalGst / 2);
  const sgst = totalGst - cgst;
  const totalInvoice = subtotal + totalGst;

  const dateStr = new Date().toISOString().split('T')[0];
  const poNumber = `PO-SYM-2026-${seller.id}-${buyer.id}-${Math.floor(1000 + Math.random() * 9000)}`;

  const contract: CircularPurchaseOrder = {
    po_number: poNumber,
    date_issued: dateStr,
    seller_name: seller.name,
    seller_gstin: seller.gstin || '29AAECS4912L1ZF',
    buyer_name: buyer.name,
    buyer_gstin: buyer.gstin || '29AABCR8102B1Z8',
    material_description: `${deal.material.replace(/_/g, ' ').toUpperCase()} (Secondary Industrial Byproduct)`,
    hsn_sac_code: taxonomy.hsnCode,
    quantity_tons: deal.volume_tons,
    unit_price_inr: unitPrice,
    subtotal_inr: subtotal,
    gst_rate_pct: gstRate,
    cgst_inr: cgst,
    sgst_inr: sgst,
    total_invoice_inr: totalInvoice,
    payment_terms: '100% Escrow on delivery verification & weighbridge gross slip receipt.',
    quality_assay_ref: seller.lab_assay?.certificate_id || 'CERT-STD-CPCB',
    demurrage_clause: 'Free detention time: 3 hours. Demurrage rate INR 500/hour for multi-axle carrier thereafter.',
  };

  if (deal.logistics_deal) {
    const freightSubtotal = deal.logistics_deal.total_freight_cost_inr;
    const freightGstRate = 5; // GTA reverse-charge convention (CGST Notification 11/2017) — simplified, flat rate
    const freightGst = Math.round((freightSubtotal * freightGstRate) / 100);
    const freightCgst = Math.round(freightGst / 2);
    contract.freight_line_item = {
      carrier_name: deal.logistics_deal.carrier_name,
      vehicle_type: deal.logistics_deal.vehicle_type,
      rate_inr_per_ton_km: deal.logistics_deal.agreed_rate_inr_per_ton_km,
      distance_km: deal.logistics.distance_km,
      freight_subtotal_inr: freightSubtotal,
      freight_gst_rate_pct: freightGstRate,
      freight_cgst_inr: freightCgst,
      freight_sgst_inr: freightGst - freightCgst,
      freight_total_inr: freightSubtotal + freightGst,
    };
  }

  // E-Way Bill
  const ewbNumber = `5310-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' IST';
  const vehicleReg =
    seller.cluster === 'Peenya' ? 'KA-04-AK-7192' : seller.cluster === 'Bidadi' ? 'KA-42-B-3109' : 'KA-51-C-8821';

  const corridor = deal.logistics.corridor;
  const corridorName = corridor ? corridor.corridor_name : 'Karnataka Highway Arterial';
  const dispatchWindow = corridor ? corridor.recommended_dispatch_window : 'OFFPEAK_DAY_1100_1600';

  const eway_bill: EWayBill = {
    eway_bill_number: ewbNumber,
    generated_date: dateStr,
    valid_until: validUntil,
    transporter_name: deal.logistics_deal?.carrier_name || 'Karnataka Industrial Circular Logistics Consortium',
    transporter_id: '29AAACK9901Z1ZT',
    vehicle_number: deal.logistics_deal ? `${vehicleReg} (${deal.logistics_deal.vehicle_type})` : vehicleReg,
    origin_cluster: seller.cluster,
    destination_cluster: buyer.cluster,
    distance_km: deal.logistics.distance_km,
    corridor_name: corridorName,
    dispatch_window: dispatchWindow,
    hsn_code: taxonomy.hsnCode,
    toll_route:
      corridor && corridor.tolls.length > 0
        ? corridor.tolls.map((t) => t.name).join(' -> ')
        : 'Direct Non-Toll State Highway',
    digital_barcode_data: `GST-EWB|${ewbNumber}|${seller.gstin}|${buyer.gstin}|${deal.volume_tons}T|${totalInvoice}|${vehicleReg}`,
  };

  let hazard_manifest: HazardousManifestForm10 | undefined;
  if (seller.hazardous) {
    hazard_manifest = {
      manifest_number: `KSPCB/MAN/2026/HW-${Math.floor(100000 + Math.random() * 900000)}`,
      kspcb_rule_ref: 'Rule 19, Hazardous and Other Wastes (Management & Transboundary Movement) Rules 2016',
      sender_authorization: seller.xgn_details?.consent_id || 'KSPCB/RED-AUTH',
      receiver_authorization: buyer.xgn_details?.consent_id || 'KSPCB/RED-AUTH',
      transporter_vehicle: `${vehicleReg} (GPS Telemetry Enabled Hazardous Carrier)`,
      emergency_procedure_guide: 'Transport Emergency (TREM) Card attached with hazardous spill neutralization protocol.',
      color_code: 'Yellow Copy (Sender) / Pink Copy (KSPCB Regional Office) / Blue Copy (Receiver TSDF/CETP)',
    };
  }

  return { contract, eway_bill, hazard_manifest };
}

// Settlement / Escrow Agent: mints a simulated smart-escrow voucher for an
// approved deal and disburses a T+0 advance to the seller immediately,
// releasing the balance only on delivery/weighbridge confirmation. Also caps
// the simulated middleman deduction ("katoti") well below traditional rates.
export function buildSettlementRecord(totalPayableInr: number): SettlementRecord {
  const advanceInr = Math.round((totalPayableInr * SETTLEMENT_ADVANCE_PCT) / 100);
  const balanceInr = totalPayableInr - advanceInr;
  return {
    escrow_voucher_id: `ESC-2026-${Math.floor(100000 + Math.random() * 900000)}`,
    total_payable_inr: totalPayableInr,
    advance_pct: SETTLEMENT_ADVANCE_PCT,
    advance_inr: advanceInr,
    advance_upi_ref: `UPI-AUTOPAY-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    balance_inr: balanceInr,
    balance_release_condition: 'Released on weighbridge gross-slip confirmation & buyer delivery acknowledgement.',
    katoti_cap_pct: KATOTI_DEDUCTION_CAP_PCT,
  };
}

// Canonical JSON hashing for tamper-evident waste passport
export function hashRecord(record: Record<string, unknown>): string {
  const canonical = JSON.stringify(record, Object.keys(record).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

class SymbiosisEngine {
  facilities: Record<string, Facility>;
  carriers: Record<string, Carrier>;
  passports: DigitalWastePassport[];
  pipelineResults: PipelineItemResult[];

  constructor() {
    this.facilities = getDefaultFacilities();
    this.carriers = getDefaultCarriers();
    this.passports = [];
    this.pipelineResults = [];
    this.loadPassportsFromFile();
    // Non-blocking Firestore synchronization
    this.initFirestore();
  }

  loadPassportsFromFile() {
    try {
      const filePath = path.join(process.cwd(), 'data', 'waste_passports.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.passports = parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to load passports from local JSON file:', err);
    }
  }

  async initFirestore() {
    try {
      this.facilities = await syncFacilitiesWithFirestore(this.facilities);
    } catch (e) {
      console.warn('Firestore initial sync deferred:', e);
    }
  }

  async addFacility(data: Partial<Facility>): Promise<Facility> {
    const clusterCoords: Record<string, { lat: number; lon: number }> = {
      Peenya: { lat: 13.0334, lon: 77.5141 },
      Dobaspet: { lat: 13.2356, lon: 77.2089 },
      Bidadi: { lat: 12.7981, lon: 77.3828 },
      Whitefield: { lat: 12.9698, lon: 77.75 },
      Bommasandra: { lat: 12.8167, lon: 77.6833 },
      Jigani: { lat: 12.7833, lon: 77.6333 },
      Dabaspet: { lat: 13.2356, lon: 77.2089 },
      Rajajinagar: { lat: 12.9982, lon: 77.553 },
      Veerasandra: { lat: 12.8398, lon: 77.6775 },
    };

    const cluster = data.cluster || 'Peenya';
    const coords = clusterCoords[cluster] || { lat: 13.0334, lon: 77.5141 };
    const randNum = Math.floor(100 + Math.random() * 900);
    const id = data.id && data.id.trim().length > 0 ? data.id.trim() : `FAC-BLR-${randNum}`;
    const vol = Number(data.volume_tons_per_month) || 100;
    const role = data.role === 'buyer' ? 'buyer' : 'seller';

    const newFacility: Facility = {
      id,
      name: data.name || `Industrial Plant ${randNum}`,
      role,
      cluster,
      lat: Number(coords.lat.toFixed(4)) + (Math.random() - 0.5) * 0.015,
      lon: Number(coords.lon.toFixed(4)) + (Math.random() - 0.5) * 0.015,
      material: data.material || 'recycled_concrete_aggregate',
      material_category: data.material_category || MATERIAL_TAXONOMY[data.material || 'recycled_concrete_aggregate']?.category || 'inert_mineral_aggregate',
      certified_hazard_handler: Boolean(data.certified_hazard_handler ?? data.hazardous),
      volume_tons_per_month: vol,
      cost_floor_inr_per_ton: role === 'seller' ? (Number(data.cost_floor_inr_per_ton) || 450) : null,
      cost_ceiling_inr_per_ton: role === 'buyer' ? (Number(data.cost_ceiling_inr_per_ton) || 850) : null,
      hazardous: Boolean(data.hazardous),
      cepi_zone: data.cepi_zone || (cluster === 'Peenya' ? 'Peenya CEPI Score 65.11 (Severely Polluted)' : undefined),
      gstin: data.gstin || `29AABC${randNum}1Z5`,
      kspcb_consent_id: data.kspcb_consent_id || `KSPCB/XGN/BNG/${randNum}/2024`,
      xgn_details: {
        consent_id: data.kspcb_consent_id || `KSPCB/XGN/BNG/${randNum}/2024`,
        consent_type: Boolean(data.hazardous) ? 'Red-CFO' : 'Orange-CFO',
        valid_till: '31/03/2026',
        is_active: true,
        authorized_monthly_quota_tons: Math.round(vol * 1.5),
        current_month_consumed_tons: Math.round(vol * 0.15),
        category: Boolean(data.hazardous) ? 'Red Category (High Impact)' : 'Orange Category (Medium Impact)',
      },
    };

    this.facilities[newFacility.id] = newFacility;
    // Persist to Cloud Firestore
    saveFacilityToFirestore(newFacility).catch((err) =>
      console.warn('Failed to persist new facility to Firestore:', err)
    );

    return newFacility;
  }

  reset() {
    this.facilities = getDefaultFacilities();
    this.carriers = getDefaultCarriers();
    this.passports = [];
    this.pipelineResults = [];
    this.savePassportsToFile();
    syncFacilitiesWithFirestore(this.facilities).catch((err) =>
      console.warn('Failed to reseed Firestore on reset:', err)
    );
  }

  getFacilities() {
    return this.facilities;
  }

  getCarriers() {
    return this.carriers;
  }

  applySensorReading(
    facilityId: string,
    reading: { moisture_pct: number; contamination_flag: boolean }
  ): Facility | null {
    const facility = this.facilities[facilityId];
    if (!facility) return null;

    facility.sensor_adjustment = reading;

    if (reading.contamination_flag) {
      facility.volume_tons_per_month = Math.round(facility.volume_tons_per_month * 0.5 * 10) / 10;
    } else if (reading.moisture_pct > 15 && facility.role === 'seller') {
      if (facility.cost_floor_inr_per_ton !== null) {
        facility.cost_floor_inr_per_ton = Math.round(facility.cost_floor_inr_per_ton * 0.85);
      }
    }

    // Persist telemetry and updated facility in Firestore
    logTelemetryToFirestore(facilityId, reading).catch((err) =>
      console.warn('Failed to log telemetry to Firestore:', err)
    );
    saveFacilityToFirestore(facility).catch((err) =>
      console.warn('Failed to update facility in Firestore:', err)
    );

    return facility;
  }

  async describeFacility(facilityId: string): Promise<string> {
    const f = this.facilities[facilityId];
    if (!f) return '';

    const perspectives = [
      'Focus primarily on your current storage space constraints, loading bay logistics, and local truck route conditions in Karnataka.',
      'Focus on the economic margin comparison between virgin procurement vs secondary byproduct utilization, considering current Karnataka market prices.',
      'Focus on environmental compliance, KSPCB XGN consent quota headroom, and zero-landfill targets.',
      'Focus on recent quality assay readings, moisture sensitivity, and how contamination risks impact your processing efficiency.',
    ];
    const chosenPerspective = perspectives[Math.floor(Math.random() * perspectives.length)];
    const timeSalt = Date.now().toString(36);

    const situation = `
Facility Profile:
- Name: ${f.name}
- Industrial Cluster: ${f.cluster} Industrial Area, Karnataka
- Role: ${f.role === 'seller' ? 'Waste/Byproduct Generator (Seller)' : 'Industrial Off-taker / Recycler (Buyer)'}
- Material: ${f.material.replace(/_/g, ' ')}
- Monthly Volume: ${f.volume_tons_per_month} metric tons/month
- Pricing Threshold: ${f.role === 'seller' ? `Minimum acceptable cost floor: ₹${f.cost_floor_inr_per_ton ?? 'Negotiable'}/ton` : `Maximum acceptable cost ceiling: ₹${f.cost_ceiling_inr_per_ton ?? 'Negotiable'}/ton`}
- Hazardous Profile: ${f.hazardous ? 'Hazardous (Requires Form 10 / TSDF Manifest)' : 'Non-Hazardous Industrial Byproduct'}
- KSPCB Consent ID: ${f.kspcb_consent_id || 'KSPCB/Consent/Pending'}
- Current Quota Status: ${f.xgn_details ? `Quota ${f.xgn_details.authorized_monthly_quota_tons} T/mo (${f.xgn_details.current_month_consumed_tons} T consumed, valid till ${f.xgn_details.valid_till})` : 'Standard consent'}
- Sensor / Quality State: Moisture ${f.sensor_adjustment?.moisture_pct ?? 10}%, Contamination: ${f.sensor_adjustment?.contamination_flag ? 'Detected' : 'Clear'}
- Perspective Angle for this update: ${chosenPerspective}
- Timestamp Token: ${timeSalt}
`.trim();

    const system = `You are the Plant Operations & Circular Byproduct Lead at ${f.name} in ${f.cluster}, Karnataka.
Write a conversational, pragmatic, first-person operational briefing (2 engaging paragraphs) speaking directly as the plant lead.
Explain:
1. Your immediate factory floor reality: current volume (${f.volume_tons_per_month} tons of ${f.material.replace(/_/g, ' ')}), storage space, quality/moisture, and why circular exchange matters right now.
2. Your commercial & logistics terms: pricing stance (around ₹${f.role === 'seller' ? f.cost_floor_inr_per_ton : f.cost_ceiling_inr_per_ton}/ton), transport along Karnataka road corridors (e.g., NICE Road, Tumkur Road, Mysore Road, or Peenya freight restrictions), and KSPCB permit readiness.
Give a unique, authentic tone with practical industrial details. Do NOT output generic one-line summaries.`;

    return askGemini(system, situation, 650, 0.85);
  }

  issuePassport(deal: DigitalWastePassport['deal']): DigitalWastePassport {
    const prevHash = this.passports.length > 0 ? this.passports[this.passports.length - 1].record_hash : '0'.repeat(64);

    const partialRecord = {
      deal,
      issued_at: new Date().toISOString(),
      prev_hash: prevHash,
    };

    const recordHash = hashRecord(partialRecord as Record<string, unknown>);
    const passport: DigitalWastePassport = {
      ...partialRecord,
      record_hash: recordHash,
    };

    this.passports.push(passport);
    this.savePassportsToFile();
    return passport;
  }

  savePassportsToFile() {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const filePath = path.join(dataDir, 'waste_passports.json');
      fs.writeFileSync(filePath, JSON.stringify(this.passports, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save passports to local JSON file:', err);
    }
  }

  verifyLedger(): LedgerVerification {
    let prevHash = '0'.repeat(64);
    for (let i = 0; i < this.passports.length; i++) {
      const p = this.passports[i];
      if (p.prev_hash !== prevHash) {
        return {
          valid: false,
          message: `Chain broken at block #${i + 1} (${p.record_hash.slice(0, 16)}...). Previous hash mismatch.`,
          count: this.passports.length,
        };
      }
      const recomputed = hashRecord({
        deal: p.deal,
        issued_at: p.issued_at,
        prev_hash: p.prev_hash,
      } as Record<string, unknown>);

      if (recomputed !== p.record_hash) {
        return {
          valid: false,
          message: `Tampering detected at block #${i + 1} (${p.record_hash.slice(0, 16)}...). SHA-256 payload integrity check failed.`,
          count: this.passports.length,
        };
      }
      prevHash = p.record_hash;
    }
    return {
      valid: true,
      message: `Chain valid: ${this.passports.length} Digital Waste Passports cryptographically verified.`,
      count: this.passports.length,
    };
  }

  async runFullPipeline(): Promise<PipelineItemResult[]> {
    // Aggregator / Micro-Lot Pooling Agent runs first so fragmented small
    // sellers are matched and negotiated as one consolidated consignment.
    const { pooledFacilities, poolMembership } = poolMicroLotSellers(this.facilities);

    const candidates = findCandidateMatches(pooledFacilities);
    const ranked = await rankCandidates(candidates, pooledFacilities);

    const items: PipelineItemResult[] = [];
    this.passports = []; // fresh ledger run for demo pipeline execution

    // Allocation Auditor Agent: a facility's monthly byproduct output (or intake
    // capacity) can be claimed by at most one winning deal per run. Without this,
    // a seller matched to multiple candidate buyers (e.g. one seller, several
    // eligible offtakers within range) would have its full volume double-counted
    // across independently-negotiated deals.
    const allocatedVolume: Record<string, number> = {};

    // Carriers that already ran a route this pipeline run quote their next
    // job at a backhaul discount (see negotiateFreight/BACKHAUL_DISCOUNT_FACTOR).
    const carrierTripCount: Record<string, number> = {};

    for (const match of ranked) {
      const seller = pooledFacilities[match.seller_id];
      const buyer = pooledFacilities[match.buyer_id];
      const volume = Math.min(seller.volume_tons_per_month, buyer.volume_tons_per_month);

      const negotiation = await negotiate(seller, buyer, match.material, volume);

      let logisticsDeal: FreightNegotiationResult | null = null;
      let regulatory: RegulatoryDecision | null = null;
      let passport: DigitalWastePassport | null = null;
      let pooledMembers: PooledMember[] | undefined;

      if (negotiation.outcome === 'DEAL') {
        const carrier = selectBestCarrier(this.carriers, volume, seller.hazardous);
        const isBackhaul = Boolean(carrier && carrierTripCount[carrier.id] > 0);
        logisticsDeal = await negotiateFreight(
          carrier,
          negotiation.logistics,
          buyer.cost_ceiling_inr_per_ton!,
          negotiation.final_price_inr_per_ton!,
          volume,
          match.material,
          isBackhaul
        );

        if (logisticsDeal.outcome === 'DEAL') {
          const sellerCommitted = allocatedVolume[seller.id] || 0;
          const buyerCommitted = allocatedVolume[buyer.id] || 0;
          const sellerHeadroom = seller.volume_tons_per_month - sellerCommitted;
          const buyerHeadroom = buyer.volume_tons_per_month - buyerCommitted;
          const ALLOCATION_TOLERANCE = 0.01;

          if (volume > sellerHeadroom + ALLOCATION_TOLERANCE || volume > buyerHeadroom + ALLOCATION_TOLERANCE) {
            regulatory = {
              decision: 'VETOED',
              rule_applied: 'Cross-Deal Allocation Audit (Auditor Agent)',
              explanation: `Blocked: this deal claims ${volume} tons, but only ${Math.max(0, Math.min(sellerHeadroom, buyerHeadroom)).toFixed(1)} tons of unclaimed monthly capacity remain after volume already committed to other approved deals in this run (seller headroom ${sellerHeadroom.toFixed(1)}t, buyer headroom ${buyerHeadroom.toFixed(1)}t).`,
            };
          } else {
            regulatory = await reviewDeal(seller, buyer, negotiation, carrier);
            if (regulatory.decision === 'APPROVED') {
              const dealData: PassportDealData = {
                seller_id: seller.id,
                buyer_id: buyer.id,
                material: match.material,
                volume_tons: volume,
                agreed_price_per_ton: negotiation.final_price_inr_per_ton,
                logistics: negotiation.logistics,
                regulatory_decision: regulatory,
                logistics_deal: {
                  carrier_id: logisticsDeal.carrier_id!,
                  carrier_name: logisticsDeal.carrier_name!,
                  vehicle_type: logisticsDeal.vehicle_type!,
                  agreed_rate_inr_per_ton_km: logisticsDeal.final_rate_inr_per_ton_km!,
                  total_freight_cost_inr: logisticsDeal.total_freight_cost_inr!,
                  negotiation_rounds: logisticsDeal.rounds,
                },
              };

              const { contract, eway_bill, hazard_manifest } = generateCircularContractAndEWayBill(
                dealData,
                seller,
                buyer
              );

              dealData.contract = contract;
              dealData.eway_bill = eway_bill;
              dealData.hazard_manifest = hazard_manifest;
              dealData.settlement = buildSettlementRecord(contract.total_invoice_inr);

              const members = poolMembership[seller.id];
              if (members) {
                pooledMembers = members.map((m) => {
                  const sharePct = Math.round((m.volume_tons / volume) * 1000) / 10;
                  const freightShare = Math.round((logisticsDeal!.total_freight_cost_inr! * m.volume_tons) / volume);
                  const grossRevenue = Math.round((negotiation.final_price_inr_per_ton || 0) * m.volume_tons);
                  return {
                    facility_id: m.facility_id,
                    facility_name: this.facilities[m.facility_id]?.name || m.facility_id,
                    volume_tons: m.volume_tons,
                    share_pct: sharePct,
                    freight_share_inr: freightShare,
                    net_payout_inr: grossRevenue - freightShare,
                  };
                });
                dealData.pooled_members = pooledMembers;
              }

              passport = this.issuePassport(dealData);
              allocatedVolume[seller.id] = sellerCommitted + volume;
              allocatedVolume[buyer.id] = buyerCommitted + volume;
              if (carrier) carrierTripCount[carrier.id] = (carrierTripCount[carrier.id] || 0) + 1;
            }
          }
        }
      }

      items.push({
        match,
        seller,
        buyer,
        negotiation,
        logistics_deal: logisticsDeal,
        regulatory,
        passport,
        pooled_members: pooledMembers || null,
        is_pooled_consignment: Boolean(poolMembership[seller.id]),
      });
    }

    this.pipelineResults = items;
    if (this.passports.length > 0) {
      savePassportsToFirestore(this.passports).catch((err) =>
        console.warn('Failed to save passports to Firestore:', err)
      );
    }
    return items;
  }
}

export const engine = new SymbiosisEngine();

