import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { FacilitiesTab } from './components/FacilitiesTab';
import { PipelineTab } from './components/PipelineTab';
import { TranscriptsTab } from './components/TranscriptsTab';
import { LedgerTab } from './components/LedgerTab';
import { ArchitectureStandardsModal } from './components/ArchitectureStandardsModal';
import { DigitalWastePassport, Facility, LedgerVerification, PipelineItemResult } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<'facilities' | 'pipeline' | 'transcripts' | 'ledger'>('facilities');
  const [isStandardsModalOpen, setIsStandardsModalOpen] = useState<boolean>(false);
  const [facilities, setFacilities] = useState<Record<string, Facility>>({});
  const [results, setResults] = useState<PipelineItemResult[]>([]);
  const [passports, setPassports] = useState<DigitalWastePassport[]>([]);
  const [verification, setVerification] = useState<LedgerVerification | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [selectedTranscriptIndex, setSelectedTranscriptIndex] = useState<number>(0);

  // Fetch initial facilities and ledger state
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [facRes, pipeRes, ledRes] = await Promise.all([
        fetch('/api/facilities'),
        fetch('/api/pipeline/results'),
        fetch('/api/ledger'),
      ]);

      if (facRes.ok) {
        const facData = await facRes.json();
        setFacilities(facData.facilities || {});
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
      }
    } catch (err) {
      console.error('Verification error:', err);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfaf6] bg-dot-pattern text-stone-900 flex flex-col font-sans selection:bg-[#ff5d02] selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onReset={handleReset}
        resetting={resetting}
        onOpenStandards={() => setIsStandardsModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-stone-600 text-sm font-medium">
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
              />
            )}

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
              />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-orange-200/70 bg-white/80 backdrop-blur-xs py-5 text-center text-xs text-stone-500 font-medium">
        Karnataka Industrial Symbiosis Multi-Agent Network • Peenya, Bidadi, Dobaspet, Harohalli, Tumkur & Vijayanagar Clusters • Aligned with KSPCB & CSTEP Clean Air Framework
      </footer>

      <ArchitectureStandardsModal
        isOpen={isStandardsModalOpen}
        onClose={() => setIsStandardsModalOpen(false)}
      />
    </div>
  );
}

export default App;
