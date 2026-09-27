'use client';

import React from 'react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { Clock, Volume2, X, AlertTriangle } from 'lucide-react';

interface HistoryListProps {
  history: any[];
  onClose: () => void;
  onSelectAnalysis: (analysis: any) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onClose, onSelectAnalysis }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">{t.recentAnalyses}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
              No historical analyses recorded yet.
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
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                      <Volume2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {cat?.name ? `🐱 ${cat.name}` : '🐱 Cat'}
                        </span>
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                          {pred?.primarySoundType || 'Vocalization'}
                        </span>
                        {pred?.isDistressPattern && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            Distress
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-zinc-400 font-medium">
                        {pred?.probableContext?.replace(/_/g, ' ') || 'Completed Analysis'}
                      </p>
                      <span className="text-[10px] text-zinc-600">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-brand-400">{conf}%</span>
                    <span className="block text-[10px] text-zinc-500">confidence</span>
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
