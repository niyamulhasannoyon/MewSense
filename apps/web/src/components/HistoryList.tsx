'use client';

import React from 'react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { Clock, Volume2, X, AlertTriangle, FileText } from 'lucide-react';

interface HistoryListProps {
  history: any[];
  onClose: () => void;
  onSelectAnalysis: (analysis: any) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onClose, onSelectAnalysis }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded border border-dsp-border bg-dsp-surface p-5 shadow-2xl font-mono text-xs">
        <div className="flex items-center justify-between border-b border-dsp-border pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-dsp-amber" />
            <h3 className="font-bold text-white uppercase tracking-wider">Acoustic Session Audit Log</h3>
          </div>
          <button onClick={onClose} className="rounded p-1 text-dsp-muted hover:bg-dsp-elevated hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
          {history.length === 0 ? (
            <div className="rounded border border-dashed border-dsp-border p-8 text-center text-dsp-muted italic">
              No historical acoustic logs recorded.
            </div>
          ) : (
            history.map((item) => {
              const pred = item.predictions?.[0];
              const rec = item.recording;
              const cat = rec?.cat;
              const conf = pred ? Math.round(pred.confidence * 100) : 0;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectAnalysis(item)}
                  className="flex cursor-pointer items-center justify-between rounded border border-dsp-border bg-dsp-bg p-3 transition hover:border-dsp-borderHighlight hover:bg-dsp-elevated"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded border border-dsp-borderHighlight bg-dsp-elevated text-dsp-amber font-bold text-xs">
                      <Volume2 className="h-4 w-4 text-dsp-cyan" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          {cat?.name ? `🐱 ${cat.name}` : '🐱 Feline'}
                        </span>
                        <span className="rounded bg-dsp-surface border border-dsp-border px-1.5 py-0.5 text-[10px] text-dsp-muted">
                          {pred?.primarySoundType || 'VOCAL'}
                        </span>
                        {pred?.isDistressPattern && (
                          <span className="flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            DISTRESS
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-semibold text-zinc-200">
                        {pred?.probableContext?.replace(/_/g, ' ') || 'Completed Analysis'}
                      </p>
                      <span className="text-[10px] text-dsp-muted">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-dsp-emerald text-sm">{conf}%</span>
                    <span className="block text-[10px] text-dsp-muted uppercase">Confidence</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
