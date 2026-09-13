import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { FacilitiesTab } from './components/FacilitiesTab';
import { FleetTab } from './components/FleetTab';
import { PipelineTab } from './components/PipelineTab';
import { TranscriptsTab } from './components/TranscriptsTab';
import { LedgerTab } from './components/LedgerTab';
import { ArchitectureStandardsModal } from './components/ArchitectureStandardsModal';
import { HonestLimitationsModal } from './components/HonestLimitationsModal';
import { GlossaryModal } from './components/GlossaryModal';
import { Carrier, DigitalWastePassport, Facility, LedgerVerification, PipelineItemResult } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<'facilities' | 'fleet' | 'pipeline' | 'transcripts' | 'ledger'>(
    (new URLSearchParams(window.location.search).get('tab') as any) || 'facilities'
  );
  const [isStandardsModalOpen, setIsStandardsModalOpen] = useState<boolean>(false);
  const [isLimitationsModalOpen, setIsLimitationsModalOpen] = useState<boolean>(false);
  const [isGlossaryModalOpen, setIsGlossaryModalOpen] = useState<boolean>(false);
  const [facilities, setFacilities] = useState<Record<string, Facility>>({});
  const [carriers, setCarriers] = useState<Record<string, Carrier>>({});
  const [results, setResults] = useState<PipelineItemResult[]>([]);
  const [passports, setPassports] = useState<DigitalWastePassport[]>([]);
  const [verification, setVerification] = useState<LedgerVerification | null>(null);
  const [hasUserVerified, setHasUserVerified] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [selectedTranscriptIndex, setSelectedTranscriptIndex] = useState<number>(0);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (window.location.hash === '#dark') return true;
    try {
      return localStorage.getItem('scm-dark-mode') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem('scm-dark-mode', darkMode ? '1' : '0');
    } catch {
      // ignore
    }
  }, [darkMode]);

  // Fetch initial facilities and ledger state
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [facRes, carRes, pipeRes, ledRes] = await Promise.all([
        fetch('/api/facilities'),
        fetch('/api/carriers'),
        fetch('/api/pipeline/results'),
        fetch('/api/ledger'),
      ]);

      if (facRes.ok) {
        const facData = await facRes.json();
        setFacilities(facData.facilities || {});
      }

      if (carRes.ok) {
        const carData = await carRes.json();
        setCarriers(carData.carriers || {});
      }

      if (pipeRes.ok) {
        const pipeData = await pipeRes.json();
        setResults(pipeData.results || []);
      }

      if (ledRes.ok) {
        const ledData = await ledRes.json();
        setPassports(ledData.passports || []);
        setVerification(ledData.verification || null);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleUpdateSensor = async (
    facilityId: string,
    moisture: number,
    contamination: boolean
  ) => {
    const res = await fetch('/api/facilities/sensor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facilityId,
        moisture_pct: moisture,
        contamination_flag: contamination,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setFacilities((prev) => ({
        ...prev,
        [facilityId]: data.facility,
      }));
    } else {
      throw new Error('Failed to update sensor reading');
    }
  };

  const handleDescribeFacility = async (id: string): Promise<string> => {
    const res = await fetch(`/api/facilities/${id}/describe`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      return data.description || 'No description returned.';
    }
    return 'Facility assessment unavailable.';
  };

  const handleAddFacility = async (facilityData: Partial<Facility>) => {
    const res = await fetch('/api/facilities/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(facilityData),
    });
    if (res.ok) {
      const data = await res.json();
      setFacilities(data.facilities || {});
      setResults([]);
      setPassports([]);
      setVerification(null);
      setHasUserVerified(false);
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to onboard facility');
    }
  };

  const handleRunPipeline = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setPassports(data.passports || []);
        setVerification(data.verification || null);
        setHasUserVerified(false);
        setSelectedTranscriptIndex(0);
      } else {
        console.error('Pipeline execution failed on server');
      }
    } catch (err) {
      console.error('Error running pipeline:', err);
    } finally {
      setRunning(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setFacilities(data.facilities || {});
        setResults([]);
        setPassports([]);
        setVerification(null);
        setHasUserVerified(false);
      }
    } catch (err) {
      console.error('Failed to reset:', err);
    } finally {
      setResetting(false);
    }
  };

  const handleVerifyLedger = async () => {
    setVerifying(true);
    try {
      const res = await fetch('/api/ledger/verify');
      if (res.ok) {
        const data = await res.json();
        setVerification(data);
        if (data.valid) {
          setHasUserVerified(true);
        }
      }
    } catch (err) {
      console.error('Verification error:', err);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-dot-pattern text-foreground flex flex-col font-sans selection:bg-[#ff5d02] selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onReset={handleReset}
        resetting={resetting}
        onOpenStandards={() => setIsStandardsModalOpen(true)}
        onOpenLimitations={() => setIsLimitationsModalOpen(true)}
        onOpenGlossary={() => setIsGlossaryModalOpen(true)}
        results={results}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground text-sm font-medium">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ea580c] mr-3"></div>
            Loading Karnataka industrial symbiosis network & real entity models...
          </div>
        ) : (
          <>
            {activeTab === 'facilities' && (
              <FacilitiesTab
                facilities={facilities}
                onUpdateSensor={handleUpdateSensor}
                onDescribeFacility={handleDescribeFacility}
                onAddFacility={handleAddFacility}
                onRunPipelineNav={() => setActiveTab('pipeline')}
                onOpenStandards={() => setIsStandardsModalOpen(true)}
              />
            )}

            {activeTab === 'fleet' && <FleetTab carriers={carriers} />}

            {activeTab === 'pipeline' && (
              <PipelineTab
                results={results}
                onRunPipeline={handleRunPipeline}
                running={running}
                onSelectTranscript={(idx) => {
                  setSelectedTranscriptIndex(idx);
                  setActiveTab('transcripts');
                }}
                onViewPassport={() => setActiveTab('ledger')}
              />
            )}

            {activeTab === 'transcripts' && (
              <TranscriptsTab
                results={results}
                selectedIndex={selectedTranscriptIndex}
                onSelectIndex={setSelectedTranscriptIndex}
              />
            )}

            {activeTab === 'ledger' && (
              <LedgerTab
                passports={passports}
                verification={verification}
                onVerify={handleVerifyLedger}
                verifying={verifying}
                hasUserVerified={hasUserVerified}
                onNavigateMatchDeals={() => setActiveTab('pipeline')}
              />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-orange-200/70 dark:border-orange-800/60 bg-card/90 backdrop-blur-xs py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground/70 font-medium">
            <div>
              SCM - Swalpa Circular Maadi • Industrial Byproduct Symbiosis Network across Karnataka
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsLimitationsModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-muted hover:bg-orange-100 dark:hover:bg-orange-950/40 text-muted-foreground hover:text-orange-950 dark:hover:text-orange-300 font-semibold border border-border transition"
              >
                Honest Limitations (Simulated vs Production)
              </button>
              <button
                onClick={() => setIsStandardsModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-muted hover:bg-orange-100 dark:hover:bg-orange-950/40 text-muted-foreground hover:text-orange-950 dark:hover:text-orange-300 font-semibold border border-border transition"
              >
                Regulatory Rules (KSPCB / CPCB)
              </button>
              <button
                onClick={() => setIsGlossaryModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-muted hover:bg-orange-100 dark:hover:bg-orange-950/40 text-muted-foreground hover:text-orange-950 dark:hover:text-orange-300 font-semibold border border-border transition"
              >
                Glossary
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground/70">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-muted-foreground">Cloud Firestore Powered</span>
              <span className="text-stone-300">•</span>
              <span>Persistent storage for factory registry, IoT telemetry & digital waste passports</span>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground/70">
              Database: <span className="text-muted-foreground font-semibold">ai-studio-bitnbuild-5551f14b-01d5-42ac-a55e-e81c35b3926f</span>
            </div>
          </div>
        </div>
      </footer>

      <ArchitectureStandardsModal
        isOpen={isStandardsModalOpen}
        onClose={() => setIsStandardsModalOpen(false)}
      />

      <HonestLimitationsModal
        isOpen={isLimitationsModalOpen}
        onClose={() => setIsLimitationsModalOpen(false)}
      />

      <GlossaryModal
        isOpen={isGlossaryModalOpen}
        onClose={() => setIsGlossaryModalOpen(false)}
      />
    </div>
  );
}

export default App;
