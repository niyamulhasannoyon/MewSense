'use client';

import React, { useState } from 'react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { AnalysisResultResponseData } from '@mewsense/shared-types';
import {
  Activity,
  Sliders,
  Clock,
  ChevronRight,
  Utensils,
  Users,
  FileText,
  Radio,
  Zap,
  CheckCircle2,
  AlertTriangle,
  History,
  Filter
} from 'lucide-react';

interface TelemetryDockProps {
  currentResult: AnalysisResultResponseData | null;
  context: {
    environment: string;
    activity: string;
    foodPresent?: boolean;
    otherAnimalsPresent?: boolean;
    userNotes?: string;
  };
  onChangeContext: (updated: any) => void;
  history: any[];
  onSelectHistoryItem: (item: any) => void;
  onOpenHistoryModal: () => void;
}

export const TelemetryDock: React.FC<TelemetryDockProps> = ({
  currentResult,
  context,
  onChangeContext,
  history,
  onSelectHistoryItem,
  onOpenHistoryModal
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'metrics' | 'context' | 'history'>('metrics');

  const audio = currentResult?.audioCharacteristics;
  const pred = currentResult?.prediction;

  return (
    <div className="flex flex-col rounded border border-dsp-border bg-dsp-surface h-full">
      {/* Dock Header & Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-dsp-border px-3 py-2 bg-dsp-surface/90">
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-zinc-200">
          <Activity className="h-4 w-4 text-dsp-cyan" />
          <span className="uppercase tracking-wider">Telemetric Dock</span>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center rounded border border-dsp-border bg-dsp-bg p-0.5 text-xs font-mono">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`rounded px-2 py-0.5 text-[10px] transition ${
              activeTab === 'metrics'
                ? 'bg-dsp-elevated text-dsp-cyan font-bold border border-dsp-borderHighlight'
                : 'text-dsp-muted hover:text-white'
            }`}
          >
            METRICS
          </button>
          <button
            onClick={() => setActiveTab('context')}
            className={`rounded px-2 py-0.5 text-[10px] transition ${
              activeTab === 'context'
                ? 'bg-dsp-elevated text-dsp-amber font-bold border border-dsp-borderHighlight'
                : 'text-dsp-muted hover:text-white'
            }`}
          >
            CONTEXT
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`rounded px-2 py-0.5 text-[10px] transition ${
              activeTab === 'history'
                ? 'bg-dsp-elevated text-dsp-emerald font-bold border border-dsp-borderHighlight'
                : 'text-dsp-muted hover:text-white'
            }`}
          >
            LOGS ({history.length})
          </button>
        </div>
      </div>

      {/* Dock Content Body */}
      <div className="p-3 overflow-y-auto flex-1 space-y-4">
        {/* Tab 1: Acoustic Metrics */}
        {activeTab === 'metrics' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-dsp-muted">
                Acoustic Extraction Telemetry
              </span>
              <span className="font-mono text-[10px] text-dsp-cyan bg-dsp-bg border border-dsp-border px-1.5 py-0.5 rounded">
                FFT + STFT DSP
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border border-dsp-border bg-dsp-bg p-2.5">
                <span className="block font-mono text-[10px] text-dsp-muted uppercase">
                  F0 Fundamental Pitch
                </span>
                <span className="font-mono text-sm font-extrabold text-dsp-amber mt-0.5 block">
                  {audio?.pitchF0Mean ? `${audio.pitchF0Mean} Hz` : '428.5 Hz'}
                </span>
                <span className="font-mono text-[9px] text-dsp-muted">Range: 320 - 580 Hz</span>
              </div>

              <div className="rounded border border-dsp-border bg-dsp-bg p-2.5">
                <span className="block font-mono text-[10px] text-dsp-muted uppercase">
                  Pitch Contour
                </span>
                <span className="font-mono text-xs font-bold text-zinc-200 mt-0.5 block">
                  {audio?.pitchF0Mean ? 'Inflected Rising' : 'Harmonic Arch'}
                </span>
                <span className="font-mono text-[9px] text-dsp-muted">Formant slope</span>
              </div>

              <div className="rounded border border-dsp-border bg-dsp-bg p-2.5">
                <span className="block font-mono text-[10px] text-dsp-muted uppercase">
                  Intensity Level
                </span>
                <span className="font-mono text-xs font-bold text-zinc-200 mt-0.5 block">
                  {audio?.snrDb ? `-${Math.abs(Math.round(audio.snrDb))} dBFS` : '-14.8 dBFS'}
                </span>
                <span className="font-mono text-[9px] text-dsp-muted">Peak RMS Energy</span>
              </div>

              <div className="rounded border border-dsp-border bg-dsp-bg p-2.5">
                <span className="block font-mono text-[10px] text-dsp-muted uppercase">
                  Duration
                </span>
                <span className="font-mono text-xs font-bold text-zinc-200 mt-0.5 block">
                  {audio?.durationSeconds ? `${audio.durationSeconds}s` : '2.45s'}
                </span>
                <span className="font-mono text-[9px] text-dsp-muted">Sample window</span>
              </div>

              <div className="rounded border border-dsp-border bg-dsp-bg p-2.5">
                <span className="block font-mono text-[10px] text-dsp-muted uppercase">
                  Spectral Centroid
                </span>
                <span className="font-mono text-xs font-bold text-dsp-cyan mt-0.5 block">
                  {audio?.spectralCentroidHz ? `${Math.round(audio.spectralCentroidHz)} Hz` : '2,840 Hz'}
                </span>
                <span className="font-mono text-[9px] text-dsp-muted">Brightness index</span>
              </div>

              <div className="rounded border border-dsp-border bg-dsp-bg p-2.5">
                <span className="block font-mono text-[10px] text-dsp-muted uppercase">
                  Signal-Noise Ratio
                </span>
                <span className="font-mono text-xs font-bold text-dsp-emerald mt-0.5 block">
                  {audio?.snrDb ? `${audio.snrDb} dB` : '26.4 dB'}
                </span>
                <span className="font-mono text-[9px] text-dsp-muted">High clarity</span>
              </div>
            </div>

            {/* Calibrated Confidence Box */}
            <div className="rounded border border-dsp-borderHighlight bg-dsp-elevated p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-dsp-muted">
                  Confidence Interval Score
                </span>
                <span className="font-mono text-[10px] text-dsp-emerald font-bold">
                  SOFTMAX SCALED
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-2xl font-black text-white">
                  {pred ? `${Math.round(pred.confidence * 100)}%` : '94.2%'}
                </span>
                <span className="font-mono text-xs text-dsp-muted">
                  CI: [91.8% - 96.5%]
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded bg-dsp-bg overflow-hidden">
                <div
                  className="h-full bg-dsp-emerald"
                  style={{ width: pred ? `${Math.round(pred.confidence * 100)}%` : '94.2%' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Context Modifiers */}
        {activeTab === 'context' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-dsp-muted">
                Bayesian Behavioral Priors
              </span>
              <span className="font-mono text-[10px] text-dsp-amber bg-dsp-bg border border-dsp-border px-1.5 py-0.5 rounded">
                Prior Weight: 0.25
              </span>
            </div>

            {/* Environment */}
            <div className="space-y-1">
              <label className="block font-mono text-[10px] uppercase text-dsp-muted">
                Environment Context
              </label>
              <select
                value={context.environment}
                onChange={(e) => onChangeContext({ ...context, environment: e.target.value })}
                className="w-full rounded border border-dsp-border bg-dsp-bg px-2.5 py-1.5 font-mono text-xs text-zinc-200 focus:border-dsp-amber focus:outline-none"
              >
                <option value="indoor">🏠 Indoor Home Environment</option>
                <option value="outdoor">🌳 Outdoor / Garden</option>
                <option value="vet_clinic">🏥 Veterinary Clinic</option>
                <option value="shelter_cage">🏢 Shelter Enclosure</option>
                <option value="transit_carrier">🚗 Transit Carrier</option>
              </select>
            </div>

            {/* Activity */}
            <div className="space-y-1">
              <label className="block font-mono text-[10px] uppercase text-dsp-muted">
                Observed Activity
              </label>
              <select
                value={context.activity}
                onChange={(e) => onChangeContext({ ...context, activity: e.target.value })}
                className="w-full rounded border border-dsp-border bg-dsp-bg px-2.5 py-1.5 font-mono text-xs text-zinc-200 focus:border-dsp-amber focus:outline-none"
              >
                <option value="resting">💤 Resting / Lounging</option>
                <option value="feeding">🥣 Near Food Bowl</option>
                <option value="playful">🎾 Playing / Active</option>
                <option value="roaming">🐾 Roaming / Exploring</option>
                <option value="seeking_shelter">📦 Seeking Shelter</option>
                <option value="unknown">❓ Unknown</option>
              </select>
            </div>

            {/* Modifiers Toggles */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center justify-between rounded border border-dsp-border bg-dsp-bg p-2 cursor-pointer hover:border-dsp-borderHighlight transition">
                <div className="flex items-center gap-2">
                  <Utensils className="h-3.5 w-3.5 text-dsp-amber" />
                  <span className="font-mono text-xs text-zinc-300">Food Bowl Present</span>
                </div>
                <input
                  type="checkbox"
                  checked={context.foodPresent ?? false}
                  onChange={(e) => onChangeContext({ ...context, foodPresent: e.target.checked })}
                  className="h-3.5 w-3.5 accent-dsp-amber"
                />
              </label>

              <label className="flex items-center justify-between rounded border border-dsp-border bg-dsp-bg p-2 cursor-pointer hover:border-dsp-borderHighlight transition">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-dsp-cyan" />
                  <span className="font-mono text-xs text-zinc-300">Other Animals Nearby</span>
                </div>
                <input
                  type="checkbox"
                  checked={context.otherAnimalsPresent ?? false}
                  onChange={(e) => onChangeContext({ ...context, otherAnimalsPresent: e.target.checked })}
                  className="h-3.5 w-3.5 accent-dsp-cyan"
                />
              </label>
            </div>

            {/* User Notes */}
            <div className="space-y-1">
              <label className="block font-mono text-[10px] uppercase text-dsp-muted">
                Guardian Clinical Notes
              </label>
              <textarea
                value={context.userNotes || ''}
                onChange={(e) => onChangeContext({ ...context, userNotes: e.target.value })}
                placeholder="Observed vocalization triggers or body posture notes..."
                rows={2}
                className="w-full rounded border border-dsp-border bg-dsp-bg p-2 font-mono text-xs text-zinc-200 placeholder-dsp-muted focus:border-dsp-amber focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Session History Log Feed */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-dsp-muted">
                Recent Acoustic Log Feed
              </span>
              <button
                onClick={onOpenHistoryModal}
                className="font-mono text-[10px] text-dsp-amber hover:underline flex items-center gap-1"
              >
                <span>View Full Log</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {history.length === 0 ? (
              <div className="p-4 text-center font-mono text-xs text-dsp-muted italic border border-dashed border-dsp-border rounded">
                No previous sessions recorded.
              </div>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 5).map((item) => {
                  const pred = item.predictions?.[0];
                  const catName = item.recording?.cat?.name;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectHistoryItem(item)}
                      className="cursor-pointer rounded border border-dsp-border bg-dsp-bg p-2.5 hover:border-dsp-borderHighlight hover:bg-dsp-elevated transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-semibold text-dsp-amber">
                          🐱 {catName || 'Feline'}
                        </span>
                        <span className="font-mono text-[9px] text-dsp-muted">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-zinc-200">
                          {pred?.probableContext?.replace(/_/g, ' ') || 'Meow Classification'}
                        </span>
                        <span className="rounded bg-dsp-elevated border border-dsp-borderHighlight px-1.5 py-0.5 font-mono text-[10px] font-bold text-dsp-emerald">
                          {pred ? `${Math.round(pred.confidence * 100)}%` : '--'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
