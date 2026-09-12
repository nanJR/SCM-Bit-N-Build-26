import React, { useState } from 'react';
import { DigitalWastePassport, LedgerVerification } from '../types';
import { ContractModal } from './ContractModal';
import {
  ShieldCheck,
  Hash,
  Link as LinkIcon,
  AlertTriangle,
  FileCode,
  CheckCircle2,
  RotateCw,
  Lock,
  FileText,
  Truck,
  Compass,
} from 'lucide-react';

interface LedgerTabProps {
  passports: DigitalWastePassport[];
  verification: LedgerVerification | null;
  onVerify: () => Promise<void>;
  verifying: boolean;
}

export const LedgerTab: React.FC<LedgerTabProps> = ({
  passports,
  verification,
  onVerify,
  verifying,
}) => {
  const [viewJsonIndex, setViewJsonIndex] = useState<number | null>(null);
  const [selectedContractPassport, setSelectedContractPassport] = useState<DigitalWastePassport | null>(null);

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <section className="bg-white rounded-2xl sm:rounded-3xl border border-orange-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="text-[11px] font-extrabold tracking-wider text-[#ea580c] uppercase mb-1 font-mono">
              CRYPTO IMMUTABILITY LEDGER
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
              <span>Digital Waste Passport Ledger (SHA-256 Hash-Chained)</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
              Tamper-evident distributed audit trail: each minted passport cryptographically binds to the previous transaction hash, certifying KSPCB clearance, transport manifest, and carbon avoidance.
            </p>
          </div>

          <button
            id="verify-ledger-btn"
            onClick={onVerify}
            disabled={verifying}
            className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300 transition shrink-0 active:scale-95 disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 text-[#ea580c] ${verifying ? 'animate-spin' : ''}`} />
            {verifying ? 'Validating Chain...' : 'Re-verify Hash Chain'}
          </button>
        </div>

        {/* Verification Status Banner */}
        {verification && (
          <div
            className={`mt-6 p-4 rounded-2xl border text-xs flex items-center justify-between gap-4 ${
              verification.valid
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {verification.valid ? (
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="font-bold text-sm">
                  {verification.valid ? 'Cryptographic Integrity Confirmed' : 'Ledger Integrity Warning'}
                </div>
                <div className="text-xs opacity-90">{verification.message}</div>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 shadow-2xs">
              {passports.length} Verified Blocks
            </span>
          </div>
        )}
      </section>

      {/* Passports List */}
      {passports.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-orange-200 bg-white">
          <Hash className="w-12 h-12 mx-auto text-orange-300 mb-3" />
          <h3 className="text-base font-bold text-stone-800">No Passports Issued Yet</h3>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-md mx-auto leading-relaxed">
            Execute the circular symbiosis pipeline in the "Run Pipeline" tab. When a trade is agreed and approved by the KSPCB Regulatory Agent, a SHA-256 Digital Waste Passport block is chained here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">
              Immutable Waste Blocks ({passports.length})
            </h2>
            <span className="text-xs font-mono text-stone-500">
              Algorithm: SHA-256 Chained
            </span>
          </div>

          {passports.map((p, idx) => {
            const isGenesis = p.prev_hash === '0'.repeat(64);
            const isJsonOpen = viewJsonIndex === idx;

            return (
              <div
                key={p.record_hash}
                className="bg-white rounded-2xl sm:rounded-3xl border border-orange-200/80 p-6 shadow-xs space-y-4 transition"
              >
                {/* Block Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3.5 gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-orange-100 text-[#ea580c] border border-orange-200">
                      Block #{idx + 1}
                    </span>
                    <span className="text-sm font-bold text-stone-900 capitalize">
                      Waste Passport ({p.deal.material.replace(/_/g, ' ')})
                    </span>
                    {isGenesis && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-bold uppercase">
                        Genesis Block
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-stone-500 font-mono">
                    Timestamp: {new Date(p.issued_at).toLocaleString()}
                  </div>
                </div>

                {/* Deal Context Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-stone-50/70 p-3.5 rounded-2xl border border-stone-200">
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase tracking-wider font-mono">Seller ID</span>
                    <span className="font-bold text-stone-800 font-mono">{p.deal.seller_id}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase tracking-wider font-mono">Buyer ID</span>
                    <span className="font-bold text-stone-800 font-mono">{p.deal.buyer_id}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase tracking-wider font-mono">Agreed Volume</span>
                    <span className="font-bold text-stone-800 font-mono">{p.deal.volume_tons} tons/mo</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] font-bold uppercase tracking-wider font-mono">Final Price</span>
                    <span className="font-bold text-emerald-700 font-mono text-sm">
                      ₹{p.deal.agreed_price_per_ton}/ton
                    </span>
                  </div>
                </div>

                {/* Statutory PO & E-Way Bill Badges if present */}
                {(p.deal.contract || p.deal.eway_bill) && (
                  <div className="p-3.5 rounded-2xl bg-orange-50/40 border border-orange-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 flex-wrap">
                      {p.deal.contract && (
                        <div className="flex items-center gap-1.5 font-mono text-stone-700">
                          <FileText className="w-4 h-4 text-[#ea580c]" />
                          <span className="text-stone-500">PO:</span>
                          <span className="font-bold text-stone-900">{p.deal.contract.po_number}</span>
                        </div>
                      )}
                      {p.deal.eway_bill && (
                        <div className="flex items-center gap-1.5 font-mono text-stone-700">
                          <Truck className="w-4 h-4 text-blue-600" />
                          <span className="text-stone-500">E-Way Bill:</span>
                          <span className="font-bold text-stone-900">{p.deal.eway_bill.eway_bill_number}</span>
                        </div>
                      )}
                      {p.deal.hazard_manifest && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-300">
                          Form 10 Hazardous Manifest
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedContractPassport(p)}
                      className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                    >
                      <FileText className="w-3.5 h-3.5 text-orange-400" />
                      <span>Inspect Legal Documents</span>
                    </button>
                  </div>
                )}

                {/* Hash Chain Links */}
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-stone-600">
                      <LinkIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-medium text-stone-500">Previous Block Hash:</span>
                    </div>
                    <span className="text-stone-600 break-all text-[11px]">
                      {p.prev_hash}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-200 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[#ea580c]">
                      <Hash className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-bold">Minted Record Hash (SHA-256):</span>
                    </div>
                    <span className="text-[#ea580c] font-bold break-all text-[11px]">
                      {p.record_hash}
                    </span>
                  </div>
                </div>

                {/* Footer and Raw JSON Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-stone-500 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>KSPCB Status: </span>
                    <strong className="text-emerald-700 font-semibold">Approved & Cryptographically Signed</strong>
                  </div>

                  <button
                    onClick={() => setViewJsonIndex(isJsonOpen ? null : idx)}
                    className="inline-flex items-center gap-1 text-xs text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3.5 py-1.5 rounded-lg font-semibold transition"
                  >
                    <FileCode className="w-3.5 h-3.5 text-[#ea580c]" />
                    {isJsonOpen ? 'Hide Block Payload' : 'Inspect Block Payload'}
                  </button>
                </div>

                {/* Raw JSON inspection view */}
                {isJsonOpen && (
                  <div className="mt-3 p-4 rounded-xl bg-stone-900 border border-stone-800 overflow-x-auto text-[11px] font-mono text-emerald-400">
                    <pre>{JSON.stringify(p, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Contract & E-Way Bill Modal */}
      {selectedContractPassport && (
        <ContractModal
          isOpen={Boolean(selectedContractPassport)}
          onClose={() => setSelectedContractPassport(null)}
          contract={selectedContractPassport.deal.contract}
          ewayBill={selectedContractPassport.deal.eway_bill}
          hazardManifest={selectedContractPassport.deal.hazard_manifest}
        />
      )}
    </div>
  );
};
