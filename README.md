# Karnataka Industrial Symbiosis — Multi-Agent Waste-to-Resource Negotiation System

**Bit N Build '26 — Internal Round**
Theme: Supply Chain Circularity & Industrial Symbiosis

## Problem

Karnataka is drafting India's first state-level circular economy policy, but on
the ground, MSME clusters like Peenya Industrial Area (~12,000 units) generate
byproducts (chrome sludge, used oil, metal scrap, fly ash, steel slag, plastics)
with no efficient way to find a compliant, geographically feasible buyer before
it becomes a disposal cost or a regulatory risk.

This system automates **matching, price negotiation, regulatory compliance
checking, and auditable record-keeping** for byproduct-to-input exchanges
between MSMEs, using a hierarchical multi-agent architecture.

## Architecture

```
Facility Agents (Sellers & Buyers)
        │
        ▼
Matchmaker Agent  ── rule-based material + geographic radius filter (≤60km)
        │              + LLM-generated match justification
        ▼
Negotiation Agents ── Monotonic Concession Protocol (bilateral, deadline-bound)
   (Seller / Buyer)     private cost floor/ceiling never revealed directly
        │
        ▼
KSPCB Regulatory Agent ── supervisory veto power over hazardous-material deals
        │                  (checked against a mocked compliance ruleset)
        ▼
Digital Waste Passport ── SHA-256 hash-chained JSON ledger entry per approved deal
```

All agents read/write through a **shared state object** (`state.py`) rather
than passing raw text between each other — this is what lets negotiation
rounds stay consistent and lets the Regulatory Agent inspect a deal after
the fact without re-deriving context.

## Why this design

- **Hierarchical, not flat**: the Regulatory Agent sits *above* the negotiation
  layer and can veto an already-agreed deal and send it back — this models
  real KSPCB oversight of hazardous waste handling, not just a linear pipeline.
- **Hybrid LLM + deterministic negotiation**: the accept/reject/concession math
  is deterministic (so a live demo can never hang or wander in circles); the
  LLM is used only to generate natural-language justification for each offer.
  This also guarantees the negotiation always terminates within a fixed round
  cap, either in a DEAL or an explicit NO_DEAL with a stated reason.
- **Auditability without needing real blockchain infrastructure**: the Digital
  Waste Passport hash-chains each approved deal to the previous one, so any
  tampering with a past record would break the chain — the same core property
  blockchains provide, honestly scoped to what's buildable in 24 hours.
- **Simulated IoT sensor input**: a facility's material-quality parameters
  (moisture/contamination) can be updated live via the dashboard, and the
  Facility Agent adjusts its own cost floor / usable volume in response
  before the next matching round.

## What's real vs. simulated (stated upfront, on purpose)

| Component | Status |
|---|---|
| Facility/material data | Synthetic, modeled on real Karnataka industrial clusters (Peenya, Bidadi, Dobaspet, Harohalli, Tumkur) and real byproduct types |
| Negotiation logic | Real, running Monotonic Concession Protocol with genuine private constraints |
| KSPCB compliance rules | Mocked ruleset, not a live regulatory database integration |
| Waste Passport ledger | Real hash-chaining logic, stored as local JSON files (not a deployed blockchain) |
| IoT sensor input | Simulated via a manual dashboard trigger, not real hardware |

## Running it

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY="your-key-here"

python3 data/generate_facilities.py   # generate synthetic facility data
python3 main.py                       # run the full pipeline in the terminal

streamlit run dashboard/app.py        # run the interactive dashboard
```

If `ANTHROPIC_API_KEY` is not set, the system runs in **mock mode** — all
matching/negotiation/regulatory logic still executes for testing, with
placeholder text instead of real LLM-generated language.

## Demo flow (what we show)

1. A facility gets a live sensor reading (moisture spike) → its cost floor adjusts.
2. Run the pipeline: Matchmaker finds candidate pairs within a 60km radius.
3. One negotiation **fails** (genuine floor/ceiling mismatch) — shown transparently.
4. One negotiation **succeeds but gets vetoed** by the KSPCB Regulatory Agent
   (hazardous material routed to an uncertified buyer) — proving the
   hierarchy has real teeth, not just a rubber-stamp.
5. Two negotiations **succeed and get approved** — a Digital Waste Passport is
   issued and the ledger's hash chain is verified live.
