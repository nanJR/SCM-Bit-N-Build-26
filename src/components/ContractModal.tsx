import React, { useState } from 'react';
import { CircularPurchaseOrder, EWayBill, HazardousManifestForm10 } from '../types';
import {
  FileText,
  Truck,
  ShieldAlert,
  X,
  Printer,
  CheckCircle,
  Copy,
  Check,
  Building2,
  Calendar,
  DollarSign,
  AlertTriangle,
  QrCode,
  ShieldCheck,
} from 'lucide-react';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract?: CircularPurchaseOrder;
  ewayBill?: EWayBill;
  hazardManifest?: HazardousManifestForm10;
}

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  contract,
  ewayBill,
  hazardManifest,
}) => {
  const [activeTab, setActiveTab] = useState<'po' | 'eway' | 'hazard'>('po');
  const [copied, setCopied] = useState(false);

  if (!isOpen || (!contract && !ewayBill)) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-orange-200/80 shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border-b border-orange-200/80 p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff5d02] text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#ea580c]">
                LEGAL & STATUTORY DISPATCH DOCUMENTATION
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight">
                Circular Purchase Order & GST E-Way Bill
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition"
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-stone-200 px-6 pt-3 bg-stone-50 shrink-0 gap-2">
          {contract && (
            <button
              onClick={() => setActiveTab('po')}
              className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
                activeTab === 'po'
                  ? 'border-[#ff5d02] text-[#ff5d02]'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Purchase Order & Tax Invoice</span>
            </button>
          )}

          {ewayBill && (
            <button
              onClick={() => setActiveTab('eway')}
              className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
                activeTab === 'eway'
                  ? 'border-[#ff5d02] text-[#ff5d02]'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>GST E-Way Bill (INS-01)</span>
            </button>
          )}

          {hazardManifest && (
            <button
              onClick={() => setActiveTab('hazard')}
              className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
                activeTab === 'hazard'
                  ? 'border-[#ff5d02] text-[#ff5d02]'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Hazardous Manifest (Form 10)</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-stone-800">
          {activeTab === 'po' && contract && (
            <div className="space-y-6 font-sans">
              {/* PO Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-3">
                <div>
                  <div className="text-xs text-stone-400 font-mono uppercase">PO Identifier</div>
                  <div className="text-base font-extrabold text-stone-900 font-mono flex items-center gap-2">
                    <span>{contract.po_number}</span>
                    <button
                      onClick={() => handleCopy(contract.po_number)}
                      className="p-1 text-stone-400 hover:text-stone-700 transition"
                      title="Copy PO Number"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-stone-500 font-mono">
                  <span>Issued Date: </span>
                  <strong className="text-stone-900">{contract.date_issued}</strong>
                </div>
              </div>

              {/* Bilateral Parties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 block mb-1">
                    SUPPLIER / SELLER (DISPATCHING UNIT)
                  </span>
                  <h4 className="font-bold text-stone-900 text-sm">{contract.seller_name}</h4>
                  <div className="text-xs font-mono text-stone-600 mt-1">
                    GSTIN: <span className="font-bold text-[#ea580c]">{contract.seller_gstin}</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">State: 29 - Karnataka (CGST & SGST Applicable)</div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 block mb-1">
                    BUYER / OFF-TAKER (VALORIZATION UNIT)
                  </span>
                  <h4 className="font-bold text-stone-900 text-sm">{contract.buyer_name}</h4>
                  <div className="text-xs font-mono text-stone-600 mt-1">
                    GSTIN: <span className="font-bold text-[#ea580c]">{contract.buyer_gstin}</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">State: 29 - Karnataka (Intra-state Supply)</div>
                </div>
              </div>

              {/* Line Item Table */}
              <div className="rounded-2xl border border-stone-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200 font-mono">
                    <tr>
                      <th className="p-3">Description of Secondary Good</th>
                      <th className="p-3">HSN Code</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Rate / Ton</th>
                      <th className="p-3 text-right">Taxable Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono">
                    <tr>
                      <td className="p-3 font-sans font-medium text-stone-900">
                        {contract.material_description}
                        <div className="text-[10px] text-stone-500 mt-0.5">
                          Assay Ref: {contract.quality_assay_ref}
                        </div>
                      </td>
                      <td className="p-3 text-stone-600">{contract.hsn_sac_code}</td>
                      <td className="p-3 text-right font-bold text-stone-900">{contract.quantity_tons} Tons</td>
                      <td className="p-3 text-right font-bold text-stone-900">₹{contract.unit_price_inr}</td>
                      <td className="p-3 text-right font-bold text-stone-900">₹{contract.subtotal_inr.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tax Calculations */}
              <div className="flex flex-col md:flex-row md:justify-end">
                <div className="w-full md:w-80 space-y-2 p-4 rounded-2xl bg-orange-50/50 border border-orange-200 text-xs font-mono">
                  <div className="flex justify-between text-stone-600">
                    <span>Taxable Subtotal:</span>
                    <span>₹{contract.subtotal_inr.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>CGST ({contract.gst_rate_pct / 2}%):</span>
                    <span>₹{contract.cgst_inr.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>SGST ({contract.gst_rate_pct / 2}%):</span>
                    <span>₹{contract.sgst_inr.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-orange-200 text-stone-900 font-bold text-sm">
                    <span>Total Invoice Value:</span>
                    <span className="text-[#ea580c]">₹{contract.total_invoice_inr.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Freight Line Item (Logistics/Carrier Negotiation Agent) */}
              {contract.freight_line_item && (
                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200 text-xs space-y-3">
                  <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-sky-600" />
                    <span>Freight & Logistics Line Item</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-stone-500 block">Carrier</span>
                      <span className="font-bold text-stone-900">
                        {contract.freight_line_item.carrier_name} ({contract.freight_line_item.vehicle_type})
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">Rate & Distance</span>
                      <span className="font-bold text-stone-900 font-mono">
                        ₹{contract.freight_line_item.rate_inr_per_ton_km}/ton-km × {contract.freight_line_item.distance_km} km
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5 font-mono pt-2 border-t border-sky-200">
                    <div className="flex justify-between text-stone-600">
                      <span>Freight Subtotal:</span>
                      <span>₹{contract.freight_line_item.freight_subtotal_inr.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>CGST ({contract.freight_line_item.freight_gst_rate_pct / 2}%):</span>
                      <span>₹{contract.freight_line_item.freight_cgst_inr.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>SGST ({contract.freight_line_item.freight_gst_rate_pct / 2}%):</span>
                      <span>₹{contract.freight_line_item.freight_sgst_inr.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-sky-200 text-stone-900 font-bold text-sm">
                      <span>Freight Total:</span>
                      <span className="text-sky-700">₹{contract.freight_line_item.freight_total_inr.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Legal Terms & Demurrage */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-2 text-stone-700">
                <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Statutory Terms & Demurrage Clauses</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed">
                  <div>
                    <span className="font-semibold text-stone-900">Payment & Weighbridge: </span>
                    {contract.payment_terms}
                  </div>
                  <div>
                    <span className="font-semibold text-stone-900">Demurrage Policy: </span>
                    {contract.demurrage_clause}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'eway' && ewayBill && (
            <div className="space-y-5 font-sans">
              {/* E-Way Bill Barcode Header */}
              <div className="p-4 rounded-2xl bg-stone-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                    GOVERNMENT OF INDIA • GST E-WAY BILL SYSTEM
                  </div>
                  <div className="text-xl font-mono font-extrabold text-white mt-0.5 tracking-wider">
                    {ewayBill.eway_bill_number}
                  </div>
                  <div className="text-[11px] text-stone-300 mt-1">
                    Generated Date: {ewayBill.generated_date} • Valid Until: {ewayBill.valid_until}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-800 border border-stone-700 flex items-center gap-2 self-start sm:self-auto font-mono text-[11px] text-emerald-300">
                  <QrCode className="w-6 h-6 text-white shrink-0" />
                  <span>GST-29-INS-01 VALIDATED</span>
                </div>
              </div>

              {/* Transportation Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Vehicle Number</span>
                  <span className="text-sm font-extrabold text-stone-900 font-mono mt-0.5 block">
                    {ewayBill.vehicle_number}
                  </span>
                  <span className="text-[11px] text-stone-500">Commercial Multi-Axle</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Transporter Name</span>
                  <span className="text-xs font-bold text-stone-900 mt-0.5 block">
                    {ewayBill.transporter_name}
                  </span>
                  <span className="text-[11px] font-mono text-stone-500">{ewayBill.transporter_id}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Dispatch Window</span>
                  <span className="text-xs font-bold text-[#ea580c] font-mono mt-0.5 block">
                    {ewayBill.dispatch_window}
                  </span>
                  <span className="text-[11px] text-stone-500">Peak Traffic Compliant</span>
                </div>
              </div>

              {/* Road Corridor & Toll Gate Path */}
              <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200 text-xs space-y-2">
                <div className="font-bold text-stone-900 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#ea580c]" />
                  <span>Designated Industrial Road Corridor: {ewayBill.corridor_name}</span>
                </div>
                <div className="text-[11px] text-stone-600 leading-relaxed font-mono">
                  <strong>Origin → Destination: </strong>
                  {ewayBill.origin_cluster} Industrial Area → {ewayBill.destination_cluster} Industrial Area ({ewayBill.distance_km} km)
                </div>
                <div className="text-[11px] text-stone-600 leading-relaxed font-mono">
                  <strong>Toll Gates Traversed: </strong>
                  {ewayBill.toll_route}
                </div>
              </div>

              {/* Digital Barcode Data */}
              <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 text-[10px] font-mono text-stone-600 break-all">
                <span className="font-bold text-stone-800">2D Encoded Barcode Payload: </span>
                {ewayBill.digital_barcode_data}
              </div>
            </div>
          )}

          {activeTab === 'hazard' && hazardManifest && (
            <div className="space-y-4 font-sans">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">
                    KSPCB Form 10 - Hazardous Waste Manifest (Rule 19)
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Governed under the Hazardous and Other Wastes (Management and Transboundary Movement) Rules, 2016. Required for all inter-facility movements of Category II & IV industrial residues.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Manifest Number</span>
                  <span className="text-sm font-extrabold text-stone-900 font-mono mt-0.5 block">
                    {hazardManifest.manifest_number}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Sender KSPCB Authorization</span>
                  <span className="text-xs font-bold text-stone-900 font-mono mt-0.5 block">
                    {hazardManifest.sender_authorization}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Receiver / TSDF Authorization</span>
                  <span className="text-xs font-bold text-stone-900 font-mono mt-0.5 block">
                    {hazardManifest.receiver_authorization}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] font-mono text-stone-400 uppercase font-bold block">Hazardous Carrier Vehicle</span>
                  <span className="text-xs font-bold text-stone-900 font-mono mt-0.5 block">
                    {hazardManifest.transporter_vehicle}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-2">
                <span className="font-bold text-stone-900 block">Emergency TREM Card & Spillage Response:</span>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {hazardManifest.emergency_procedure_guide}
                </p>
                <div className="pt-2 border-t border-stone-200 text-[11px] text-stone-500 font-mono">
                  Color Routing: {hazardManifest.color_code}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-stone-500 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Cryptographically anchored in Digital Waste Passport</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition"
          >
            Close Document
          </button>
        </div>
      </div>
    </div>
  );
};
