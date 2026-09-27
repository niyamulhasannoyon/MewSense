'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { Navbar } from '../components/Navbar';
import { AudioEngineWorkspace } from '../components/AudioEngineWorkspace';
import { TelemetryDock } from '../components/TelemetryDock';
import { GovernanceDrawer } from '../components/GovernanceDrawer';
import { CatManager } from '../components/CatManager';
import { HistoryList } from '../components/HistoryList';
import { api } from '../lib/api-client';
import { CatEntity, AnalysisResultResponseData, AnalysisProgressEvent } from '@mewsense/shared-types';

export default function Home() {
  const { t } = useLanguage();

  // Application Data State
  const [cats, setCats] = useState<CatEntity[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | undefined>(undefined);

  // Audio & Behavioral Context State
  const [context, setContext] = useState({
    environment: 'indoor',
    activity: 'resting',
    foodPresent: false,
    otherAnimalsPresent: false,
    userNotes: ''
  });

  // Drawer & Modal States
  const [showCatManager, setShowCatManager] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showGovernanceDrawer, setShowGovernanceDrawer] = useState(false);

  // Analysis Pipeline Lifecycle State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgressEvent | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<AnalysisResultResponseData | null>(null);

  // Bootstrap session and load initial data
  useEffect(() => {
    async function initSession() {
      try {
        if (!api.getToken()) {
          // Auto-authenticate seed demo account for frictionless experience
          await api.login('guardian@mewsense.app', 'MewSense2026!');
        }
        await refreshCats();
        await refreshHistory();
      } catch (err) {
        console.warn('Initial session bootstrap fallback, re-authenticating demo account:', err);
        try {
          api.setToken(null);
          await api.login('guardian@mewsense.app', 'MewSense2026!');
          await refreshCats();
          await refreshHistory();
        } catch (retryErr) {
          console.error('Session bootstrap retry failed:', retryErr);
        }
      }
    }
    initSession();
  }, []);

  const refreshCats = async () => {
    try {
      const data = await api.listCats();
      setCats(data);
      if (data.length > 0 && !selectedCatId) {
        setSelectedCatId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load cat profiles:', err);
    }
  };

  const refreshHistory = async () => {
    try {
      const data = await api.getHistory(10);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load session history:', err);
    }
  };

  const handleStartAnalysis = async (blob: Blob, filename: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisProgress({
      analysisId: '',
      status: 'QUEUED' as any,
      stage: 'uploading' as any,
      percent: 15,
      message: 'Uploading acoustic sample to ingestion server...'
    });

    try {
      // 1. Direct upload audio sample with context
      const recording = await api.uploadAudioDirect(
        blob,
        filename,
        selectedCatId,
        context
      );

      // 2. Enqueue background bioacoustic analysis job
      const enqueued = await api.enqueueAnalysis(recording.id);

      // 3. Connect real-time Server-Sent Events stream
      api.subscribeAnalysis(
        enqueued.analysisId,
        (progressEvent) => {
          setAnalysisProgress(progressEvent);
        },
        (finalResult) => {
          setIsAnalyzing(false);
          setCurrentResult(finalResult);
          refreshHistory();
        },
        (err) => {
          setIsAnalyzing(false);
          setAnalysisError(err.message || 'Bioacoustic analysis encountered an error.');
        }
      );
    } catch (err: any) {
      setIsAnalyzing(false);
      setAnalysisError(err.message || 'Failed to initialize vocalization analysis.');
    }
  };

  const handleReset = () => {
    setCurrentResult(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
    setAnalysisProgress(null);
  };

  return (
    <div className="min-h-screen bg-dsp-bg text-dsp-text flex flex-col justify-between selection:bg-dsp-amber selection:text-black">
      <div>
        {/* Top Navbar Header */}
        <Navbar
          cats={cats}
          selectedCatId={selectedCatId}
          onSelectCatId={setSelectedCatId}
          onOpenCatManager={() => setShowCatManager(true)}
          onOpenHistory={() => setShowHistoryModal(true)}
          onOpenGovernance={() => setShowGovernanceDrawer(true)}
        />

        {/* Main Asymmetric Workstation Container */}
        <main className="mx-auto max-w-[1600px] p-4 lg:p-6">
          {/* Asymmetric 2-Pane Workstation Grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
            {/* Left/Main Pane: Audio Engine Workspace (7 or 8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <AudioEngineWorkspace
                onAudioReady={handleStartAnalysis}
                isAnalyzing={isAnalyzing}
                analysisProgress={analysisProgress}
                currentResult={currentResult}
                analysisError={analysisError}
                onReset={handleReset}
                onOpenAudit={() => setShowGovernanceDrawer(true)}
              />
            </div>

            {/* Right Pane: Telemetry Dock (4 cols) */}
            <div className="lg:col-span-4 h-full">
              <TelemetryDock
                currentResult={currentResult}
                isAnalyzing={isAnalyzing}
                context={context}
                onChangeContext={setContext}
                history={history}
                onSelectHistoryItem={(item) => {
                  api.getAnalysis(item.id).then((full) => setCurrentResult(full));
                }}
                onOpenHistoryModal={() => setShowHistoryModal(true)}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Sleek Workstation Footer */}
      <footer className="border-t border-dsp-border py-3 px-4 text-center font-mono text-[10px] text-dsp-muted flex flex-col sm:flex-row items-center justify-between mx-auto max-w-[1600px] w-full">
        <span>MEWSENSE ACOUSTICS © 2026 • FELINE BIOACOUSTICS ENGINE v2.4.1</span>
        <span>NON-DIAGNOSTIC ACOUSTIC CLASSIFICATION SYSTEM</span>
      </footer>

      {/* Drawers & Modals */}
      <GovernanceDrawer
        isOpen={showGovernanceDrawer}
        onClose={() => setShowGovernanceDrawer(false)}
      />

      {showCatManager && (
        <CatManager
          cats={cats}
          onRefreshCats={refreshCats}
          onClose={() => setShowCatManager(false)}
        />
      )}

      {showHistoryModal && (
        <HistoryList
          history={history}
          onClose={() => setShowHistoryModal(false)}
          onSelectAnalysis={(item) => {
            setShowHistoryModal(false);
            api.getAnalysis(item.id).then((full) => setCurrentResult(full));
          }}
        />
      )}
    </div>
  );
}
