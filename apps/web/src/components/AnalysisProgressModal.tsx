'use client';

import React from 'react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { Loader2, CheckCircle2, Cpu, Waves, Sparkles, AlertCircle } from 'lucide-react';
import { AnalysisProgressEvent } from '@mewsense/shared-types';

interface AnalysisProgressModalProps {
  progress?: AnalysisProgressEvent | null;
  error?: string | null;
  onClose: () => void;
}

export const AnalysisProgressModal: React.FC<AnalysisProgressModalProps> = ({ progress, error, onClose }) => {
  const { t } = useLanguage();

  const stages = [
    { key: 'audio_prep', label: t.stages.audio_prep, icon: Waves, minPercent: 20 },
    { key: 'feature_ext', label: t.stages.feature_ext, icon: Cpu, minPercent: 45 },
    { key: 'ai_model', label: t.stages.ai_model, icon: Sparkles, minPercent: 70 },
    { key: 'interpretation', label: t.stages.interpretation, icon: CheckCircle2, minPercent: 90 }
  ];

  const currentPercent = progress?.percent ?? 15;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
            {error ? <AlertCircle className="h-6 w-6 text-red-400" /> : <Loader2 className="h-6 w-6 animate-spin text-brand-500" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{t.analyzingHeading}</h3>
            <p className="text-xs text-zinc-400">{progress?.message || 'Processing audio stream...'}</p>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
            <p className="font-semibold">Analysis Failed</p>
            <p className="mt-1">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-zinc-800 py-2 text-xs font-semibold text-white hover:bg-zinc-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 mb-2">
                <span>Inference Progress</span>
                <span className="text-brand-400">{currentPercent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-brand-600 to-orange-400 transition-all duration-500"
                  style={{ width: `${currentPercent}%` }}
                />
              </div>
            </div>

            {/* Stage Stepper */}
            <div className="mt-6 space-y-3">
              {stages.map((stg) => {
                const isPassed = currentPercent >= stg.minPercent;
                const isCurrent = currentPercent >= stg.minPercent - 25 && currentPercent < stg.minPercent;
                const Icon = stg.icon;

                return (
                  <div
                    key={stg.key}
                    className={`flex items-center gap-3 rounded-xl border p-2.5 transition ${
                      isPassed
                        ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                        : isCurrent
                        ? 'border-brand-500/30 bg-brand-500/5 text-brand-300'
                        : 'border-zinc-800/60 bg-zinc-950/40 text-zinc-600'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isCurrent ? 'animate-pulse' : ''}`} />
                    <span className="text-xs font-medium">{stg.label}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
