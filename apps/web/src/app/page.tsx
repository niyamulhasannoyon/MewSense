'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { Navbar } from '../components/Navbar';
import { AudioRecorder } from '../components/AudioRecorder';
import { ContextModal } from '../components/ContextModal';
import { AnalysisProgressModal } from '../components/AnalysisProgressModal';
import { ResultsView } from '../components/ResultsView';
import { CatManager } from '../components/CatManager';
import { HistoryList } from '../components/HistoryList';
import { api } from '../lib/api-client';
import { CatEntity, AnalysisResultResponseData, AnalysisProgressEvent } from '@mewsense/shared-types';
import { Sparkles, ShieldCheck, Heart, Activity, Cat, ArrowRight, History } from 'lucide-react';

export default function Home() {
  const { t } = useLanguage();

  // Application State
  const [cats, setCats] = useState<CatEntity[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | undefined>(undefined);

  // Audio & Context
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; filename: string } | null>(null);
  const [context, setContext] = useState({
    environment: 'indoor',
    activity: 'resting',
    foodPresent: false,
    otherAnimalsPresent: false,
    userNotes: ''
  });

  // Modals & Views
  const [showContextModal, setShowContextModal] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Analysis Lifecycle
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgressEvent | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<AnalysisResultResponseData | null>(null);

  // Initialize demo user session on mount
  useEffect(() => {
    async function initSession() {
      try {
        if (!api.getToken()) {
          // Auto-login seed demo guardian account for zero-friction experience
          await api.login('guardian@mewsense.app', 'MewSense2026!');
        }
        await refreshCats();
        await refreshHistory();
      } catch (err) {
        console.warn('Initial session bootstrap fallback:', err);
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
      console.error('Failed to load cats:', err);
    }
  };

  const refreshHistory = async () => {
    try {
      const data = await api.getHistory(10);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleAudioReady = (blob: Blob, filename: string) => {
    setRecordedAudio({ blob, filename });
    setShowContextModal(true);
  };

  const handleStartAnalysis = async () => {
    if (!recordedAudio) return;

    setShowContextModal(false);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisProgress({
      analysisId: '',
      status: 'QUEUED' as any,
      stage: 'uploading' as any,
      percent: 10,
      message: 'Uploading recording...'
    });

    try {
      // 1. Upload audio to storage via API
      const recording = await api.uploadAudioDirect(
        recordedAudio.blob,
        recordedAudio.filename,
        selectedCatId,
        context
      );

      // 2. Enqueue background analysis job
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
          setAnalysisError(err.message || 'Analysis encountered an unexpected issue.');
        }
      );
    } catch (err: any) {
      setAnalysisError(err.message || 'Failed to initialize vocalization analysis.');
    }
  };

  const handleReset = () => {
    setRecordedAudio(null);
    setCurrentResult(null);
    setAnalysisError(null);
  };

  const selectedCat = cats.find((c) => c.id === selectedCatId);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      <div>
        <Navbar
          onOpenCatManager={() => setShowCatManager(true)}
          onOpenHistory={() => setShowHistory(true)}
        />

        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="mb-8 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-400 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Bioacoustic Pattern Classification</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              {t.greetingEvening},{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-orange-500">
                {selectedCat ? `${selectedCat.name}'s Guardian` : 'Cat Guardian'}
              </span>
            </h1>
            <p className="mt-2 text-sm text-zinc-400 max-w-2xl leading-relaxed">
              {t.heroSubtitle}
            </p>
          </div>

          {/* Active View: Results or Audio Recorder */}
          {currentResult ? (
            <ResultsView result={currentResult} onReset={handleReset} />
          ) : (
            <div className="space-y-6">
              {/* Selected Companion Pill */}
              {selectedCat && (
                <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🐱</span>
                    <div>
                      <span className="text-xs font-bold text-white">{selectedCat.name}</span>
                      <span className="text-[11px] text-zinc-400 ml-2">
                        {selectedCat.breed || 'Companion'} • {selectedCat.sex.toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCatManager(true)}
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium"
                  >
                    Switch Profile
                  </button>
                </div>
              )}

              {/* Recorder Component */}
              <AudioRecorder onAudioReady={handleAudioReady} />

              {/* Scientific & Ethical Boundary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-4">
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                  <div className="flex items-center gap-2 text-brand-400 mb-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Scientific Honesty
                    </h4>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    We do not claim to translate cat thoughts. We classify acoustic vocalization patterns into probable contextual states.
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                  <div className="flex items-center gap-2 text-emerald-400 mb-1.5">
                    <Heart className="h-4 w-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Veterinary Safety
                    </h4>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    MewSense is non-diagnostic. Persistent distress patterns highlight when veterinary care may be warranted.
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                  <div className="flex items-center gap-2 text-blue-400 mb-1.5">
                    <Activity className="h-4 w-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Private & Consented
                    </h4>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Your recordings are private by default. Research training data is strictly opt-in and anonymized.
                  </p>
                </div>
              </div>

              {/* Recent Analyses Quick Cards */}
              {history.length > 0 && (
                <div className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      {t.recentAnalyses}
                    </h3>
                    <button
                      onClick={() => setShowHistory(true)}
                      className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
                    >
                      <span>View All ({history.length})</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {history.slice(0, 2).map((item) => {
                      const pred = item.predictions?.[0];
                      const catName = item.recording?.cat?.name;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            api.getAnalysis(item.id).then((full) => setCurrentResult(full));
                          }}
                          className="flex cursor-pointer items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 hover:bg-zinc-900 transition"
                        >
                          <div>
                            <span className="text-[11px] font-semibold text-brand-400">
                              {catName ? `🐱 ${catName}` : '🐱 Vocalization'}
                            </span>
                            <h4 className="text-sm font-bold text-white mt-0.5">
                              {pred?.probableContext?.replace(/_/g, ' ') || 'Meow'}
                            </h4>
                            <span className="text-[10px] text-zinc-500">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-right font-mono text-xs font-bold text-white">
                            {pred ? `${Math.round(pred.confidence * 100)}%` : '--'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600">
        <p>MewSense © 2026. AI-Assisted Cat Vocalization Analysis. Non-diagnostic feline bioacoustics.</p>
      </footer>

      {/* Modals */}
      {showContextModal && (
        <ContextModal
          cats={cats}
          selectedCatId={selectedCatId}
          onSelectCatId={setSelectedCatId}
          context={context}
          onChangeContext={setContext}
          onProceed={handleStartAnalysis}
          onCancel={() => setShowContextModal(false)}
        />
      )}

      {isAnalyzing && (
        <AnalysisProgressModal
          progress={analysisProgress}
          error={analysisError}
          onClose={() => setIsAnalyzing(false)}
        />
      )}

      {showCatManager && (
        <CatManager
          cats={cats}
          onRefreshCats={refreshCats}
          onClose={() => setShowCatManager(false)}
        />
      )}

      {showHistory && (
        <HistoryList
          history={history}
          onClose={() => setShowHistory(false)}
          onSelectAnalysis={(item) => {
            setShowHistory(false);
            api.getAnalysis(item.id).then((full) => setCurrentResult(full));
          }}
        />
      )}
    </div>
  );
}
