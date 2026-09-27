'use client';

import React, { useState } from 'react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { AnalysisResultResponseData } from '@mewsense/shared-types';
import {
  Sparkles,
  Volume2,
  HeartHandshake,
  AlertTriangle,
  Info,
  ThumbsUp,
  ThumbsDown,
  Activity,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { api } from '../lib/api-client';

interface ResultsViewProps {
  result: AnalysisResultResponseData;
  onReset: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ result, onReset }) => {
  const { t } = useLanguage();
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackAccurate, setFeedbackAccurate] = useState<boolean | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');

  const pred = result.prediction;
  const audio = result.audioCharacteristics;

  const handleFeedback = async (accurate: boolean) => {
    setFeedbackAccurate(accurate);
    try {
      await api.submitFeedback({
        analysisId: result.id,
        isAccurate: accurate,
        notes: feedbackNotes || undefined
      });
      setFeedbackSent(true);
    } catch (err) {
      console.error('Feedback submission failed:', err);
    }
  };

  const confidencePct = Math.round((pred?.confidence ?? 0) * 100);

  return (
    <div className="w-full space-y-6">
      {/* Top Banner if Distress Pattern Detected */}
      {pred?.isDistressPattern && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200 shadow-lg">
          <AlertTriangle className="h-6 w-6 shrink-0 text-amber-400" />
          <div className="text-xs">
            <h4 className="font-bold text-amber-300">{t.distressWarningTitle}</h4>
            <p className="mt-1 leading-relaxed">{pred.scientificDisclaimer}</p>
          </div>
        </div>
      )}

      {/* Primary Interpretation Card */}
      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-400 border border-brand-500/20">
                {result.recording?.cat?.name ? `🐱 ${result.recording.cat.name}` : '🐱 Cat Vocalization'}
              </span>
              <span className="text-xs text-zinc-500">• {new Date(result.createdAt).toLocaleTimeString()}</span>
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              {pred?.probableContext.replace(/_/g, ' ') || 'Analysis Complete'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Acoustic Sound: <span className="font-semibold text-zinc-200">{pred?.primarySoundType}</span>
            </p>
          </div>

          {/* Calibrated Confidence Badge */}
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-3">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                <path
                  className="text-zinc-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={confidencePct > 70 ? 'text-brand-500' : 'text-amber-500'}
                  strokeDasharray={`${confidencePct}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-mono text-sm font-bold text-white">{confidencePct}%</span>
            </div>
            <div>
              <span className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
                {t.confidenceScore}
              </span>
              <span className="text-xs text-zinc-500">Calibrated Softmax</span>
            </div>
          </div>
        </div>

        {/* Explainability Section */}
        <div className="mt-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-brand-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              {t.whyModelPredicted}
            </h4>
          </div>
          <p className="text-xs leading-relaxed text-zinc-300">
            {pred?.explanationText || 'Prediction generated from spectral envelope characteristics.'}
          </p>
        </div>

        {/* Audio Characteristics Metric Grid */}
        <div className="mt-6">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
            {t.audioCharacteristics}
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
              <span className="block text-[11px] text-zinc-500">{t.duration}</span>
              <span className="font-mono text-sm font-semibold text-zinc-200">
                {audio?.durationSeconds ?? 0}s
              </span>
            </div>
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
              <span className="block text-[11px] text-zinc-500">{t.pitchMean}</span>
              <span className="font-mono text-sm font-semibold text-zinc-200">
                {audio?.pitchF0Mean ? `${audio.pitchF0Mean} Hz` : 'Unvoiced'}
              </span>
            </div>
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
              <span className="block text-[11px] text-zinc-500">{t.spectralCentroid}</span>
              <span className="font-mono text-sm font-semibold text-zinc-200">
                {audio?.spectralCentroidHz ? `${Math.round(audio.spectralCentroidHz)} Hz` : 'N/A'}
              </span>
            </div>
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
              <span className="block text-[11px] text-zinc-500">{t.snr}</span>
              <span className="font-mono text-sm font-semibold text-zinc-200">
                {audio?.snrDb ? `${audio.snrDb} dB` : '>15 dB'}
              </span>
            </div>
          </div>
        </div>

        {/* Scientific Disclaimer Footer */}
        <div className="mt-6 flex items-start gap-2 border-t border-zinc-800/80 pt-4 text-[11px] text-zinc-500">
          <Info className="h-4 w-4 shrink-0 text-zinc-400 mt-0.5" />
          <p>{pred?.scientificDisclaimer || t.scientificNote}</p>
        </div>
      </div>

      {/* User Feedback & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div>
          <span className="text-xs font-semibold text-zinc-300 block">{t.feedbackPrompt}</span>
          <span className="text-[11px] text-zinc-500">Helps calibrate future model iterations with consented data.</span>
        </div>

        {feedbackSent ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>{t.feedbackSubmitted}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFeedback(true)}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-emerald-400 transition"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              <span>{t.feedbackYes}</span>
            </button>
            <button
              onClick={() => handleFeedback(false)}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-amber-400 transition"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              <span>{t.feedbackNo}</span>
            </button>
          </div>
        )}

        <button
          onClick={onReset}
          className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-500 transition"
        >
          Analyze Another Sound
        </button>
      </div>
    </div>
  );
};
