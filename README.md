# SCM - Swalpa Circular Maadi (Make it circular, eh?)

> **Karnataka Industrial Byproduct Symbiosis & Autonomous Waste-to-Resource Negotiation Network**  
> *Built for Bit N Build '26 — Supply Chain Circularity & Industrial Symbiosis*

---

##  Overview

Karnataka is drafting India’s first state-level circular economy framework. However, on the ground across major Karnataka MSME industrial estates (Peenya, Bidadi, Dobaspet, Harohalli, Tumkur, Bommasandra, Whitefield), thousands of factories generate hazardous and non-hazardous byproducts—such as fly ash, steel slag, used lubricants, electroplating chrome sludge, demolition rubble, and cotton yarn waste.

Currently, factory owners lack an automated, compliant, and geographically feasible mechanism to exchange byproducts with nearby industrial buyers before they become costly disposal burdens or pollution hazards.

**SCM (Swalpa Circular Maadi)** solves this with a **hierarchical multi-agent system**:
- **Autonomous Matching**: Geospatial radius filtering (≤60 km) and material compatibility matching.
- **Monotonic Concession Negotiations**: Deadline-bound bilateral bargaining with private cost floors/ceilings.
- **KSPCB Supervisory Veto**: Automated compliance checks against Karnataka State Pollution Control Board (KSPCB) and CPCB environmental guidelines.
- **Digital Waste Passports**: Immutable, tamper-evident SHA-256 hash-chained ledger storing audited transaction blocks.
- **Statutory Paperwork Generation**: GST E-Way Bills (INS-01), Purchase Orders (PO), and Hazardous Waste Manifests (Form 10).

---

##  Architecture & Multi-Agent Flow

```
┌────────────────────────────────────────────────────────┐
│   Karnataka MSME Factories Directory & IoT Telemetry    │
│   (Peenya, Bidadi, Dobaspet, Harohalli, Tumkur, etc.)  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             Autonomous Matchmaker Agent                │
│  - Geodesic distance (≤60km corridor filter)           │
│  - Cross-industry byproduct-to-input matrix            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            Bilateral Negotiation Agents                │
│  - Monotonic Concession Protocol (Rounds 1–5)          │
│  - Strict private seller floor & buyer ceiling         │
│  - Natural-language reasoning powered by Gemini 2.5    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               KSPCB Regulatory Agent                   │
│  - Supervisory veto power over all agreed deals        │
│  - Hazardous Waste Rules 2016 & C&D Waste Rules 2016   │
└─────────────┬───────────────────────────┬──────────────┘
              │ APPROVED                  │ VETOED
              ▼                           ▼
┌───────────────────────────┐   ┌────────────────────────┐
│   Digital Waste Passport  │   │  Audit Flag Recorded   │
│   - SHA-256 Hash Chain    │   │  - Veto Reason Logged  │
│   - PO & GST E-Way Bill   │   │  - No Deal Executed    │
│   - Form 10 Haz-Manifest  │   └────────────────────────┘
└───────────────────────────┘
```

---

##  Key Features

### 1.  Factory Directory & Live IoT Hopper Telemetry
- Pre-seeded with authentic Karnataka industrial clusters across Bengaluru Urban, Bengaluru Rural, Ramanagara, and Tumkur districts.
- **Simulated IoT Sensors**: Real-time toggles for material moisture percentage (`%`) and foreign contamination flags.
- Sensor changes trigger dynamic recalculations of seller cost floors and net usable volume.
- **AI Facility Assessment**: On-demand environmental audits powered by Gemini.
- **Factory Onboarding**: Dynamic registration modal for adding new MSME facilities with byproduct specifications and cluster coordinates.

### 2.  Autonomous Deal Matching & Carbon Offsets
- Evaluates candidate pairs against material taxonomy:
  - *Fly Ash (Class F)* → Cement blending & brick kilns
  - *Recycled Concrete Aggregate / Rubble* → Base course & non-structural paving
  - *Used Industrial Lubricant* → Certified re-refineries
  - *Electroplating Chrome Sludge* → TSDF stabilization / cement co-processing
  - *Foundry Slag* → High-strength concrete aggregates
- Calculates real-time carbon offsets (kg CO₂ avoided), sand conservation (liters of river sand saved), and dust mitigation (kg PM10 avoided) based on CSTEP environmental research.

### 3.  Bilateral Negotiation Engine & Transcripts
- Runs an autonomous **Monotonic Concession Protocol** over a 5-round deadline limit.
- Buyer and seller maintain confidential cost boundaries never revealed to the counterpart.
- Transparently demonstrates all three realistic market outcomes:
  - **DEAL**: Concession paths intersect before deadline.
  - **NO DEAL**: Genuine private floor-ceiling price mismatch with clear conclusion reasoning.
  - **VETOED**: Commercial agreement reached, but supervisory KSPCB agent vetos uncertified transport.

### 4.  Digital Waste Passports & Cryptographic Ledger
- Each approved industrial deal issues a certified **Digital Waste Passport**.
- Records are chained using **SHA-256 hashing**, referencing the preceding block’s hash (initiating from a Genesis Block).
- Built-in cryptographic integrity audit button that traverses the block chain live to verify zero record tampering.
- Inspectable block payloads and raw JSON state.

### 5.  Statutory Compliance & Document Generation
- Direct inspection modals for statutory B2B compliance documents:
  - **GST E-Way Bill (INS-01)** with Karnataka Commercial Taxes Department validation format.
  - **Standardized B2B Purchase Order (PO)** with unit price, freight split, and payment terms.
  - **Hazardous Waste Manifest (Form 10)** with mandatory yellow-copy consignment notes and authorized TSDF handler signatures.

---

##  Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 6, Tailwind CSS v4, Framer Motion, Lucide React |
| **Backend** | Node.js 22, Express 4, TypeScript, tsx, esbuild |
| **Database** | Google Cloud Firestore (Firebase SDK) with persistent storage |
| **Generative AI** | Google Gemini 2.5 Flash via `@google/genai` TypeScript SDK (Server-Side) |
| **Cryptography** | Node.js `crypto` (SHA-256 chain verification) |


---


##  Project Structure

```
├── data/
│   └── waste_passports.json      # Initial seed ledger records
├── server/
│   ├── data.ts                   # Seed industrial facilities & materials database
│   ├── engine.ts                 # Multi-agent matching, negotiation & KSPCB rules
│   ├── firebase.ts               # Cloud Firestore persistence layer
│   └── gemini.ts                 # Gemini 2.5 Flash server-side integration
├── src/
│   ├── components/
│   │   ├── AddFacilityModal.tsx           # MSME factory onboarding modal
│   │   ├── ArchitectureStandardsModal.tsx # KSPCB / CPCB standards reference
│   │   ├── CarbonOffsetCounter.tsx        # Real-time CSTEP emission counters
│   │   ├── ContractModal.tsx              # PO, GST E-Way Bill & Form 10 viewer
│   │   ├── FacilitiesTab.tsx              # Factory cards & IoT sensor controllers
│   │   ├── GlossaryModal.tsx              # Karnataka circular economy dictionary
│   │   ├── HonestLimitationsModal.tsx     # Simulated vs production analysis
│   │   ├── LedgerTab.tsx                  # SHA-256 waste passport audit ledger
│   │   ├── Navbar.tsx                     # Header with live ecological telemetry
│   │   ├── PipelineTab.tsx                # Autonomous matchmaker & deal pipeline
│   │   └── TranscriptsTab.tsx             # 5-round negotiation transcripts viewer
│   ├── utils/
│   │   └── materials.ts          # Material categorization & badge styling
│   ├── App.tsx                   # Main SPA state controller
│   ├── main.tsx                  # React DOM entry point
│   ├── types.ts                  # Shared TypeScript interfaces & types
│   └── index.css                 # Tailwind CSS v4 styling rules
├── server.ts                     # Express server & Vite middleware
├── firebase-blueprint.json       # Database schema & entity definitions
├── firestore.rules               # Security rules for Firestore collections
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript compiler configuration
└── vite.config.ts                # Vite frontend bundler configuration
```

---

##  License & Acknowledgements

Created for **Bit N Build '26** under the Supply Chain Circularity theme. Inspired by the circular industrial ecosystems of Peenya Industrial Estate and the draft Karnataka State Circular Economy Policy.
