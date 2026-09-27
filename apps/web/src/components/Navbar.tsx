'use client';

import React, { useState } from 'react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { CatEntity } from '@mewsense/shared-types';
import {
  Activity,
  Cat,
  Sliders,
  FileText,
  ShieldCheck,
  ChevronDown,
  Plus,
  Cpu,
  Radio,
  Keyboard,
  Globe
} from 'lucide-react';

interface NavbarProps {
  cats: CatEntity[];
  selectedCatId?: string;
  onSelectCatId: (id?: string) => void;
  onOpenCatManager: () => void;
  onOpenHistory: () => void;
  onOpenGovernance: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cats,
  selectedCatId,
  onSelectCatId,
  onOpenCatManager,
  onOpenHistory,
  onOpenGovernance
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [showCatDropdown, setShowCatDropdown] = useState(false);

  const selectedCat = cats.find((c) => c.id === selectedCatId);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-dsp-border bg-dsp-bg/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4">
        {/* Brand & System Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-dsp-amber/40 bg-zinc-950 p-1 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <svg viewBox="0 0 64 64" className="h-full w-full">
                <path d="M 14 18 L 23 28 L 41 28 L 50 18 L 47 36 L 32 52 L 17 36 Z" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinejoin="round"/>
                <rect x="23" y="34" width="2.5" height="10" rx="1" fill="#06b6d4"/>
                <rect x="27.5" y="31" width="2.5" height="15" rx="1" fill="#10b981"/>
                <rect x="32" y="26" width="3" height="22" rx="1.5" fill="#f59e0b"/>
                <rect x="37" y="31" width="2.5" height="15" rx="1" fill="#10b981"/>
                <rect x="41.5" y="34" width="2.5" height="10" rx="1" fill="#06b6d4"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold tracking-tight text-zinc-100">
                  MEWSENSE
                </span>
                <span className="rounded border border-dsp-borderHighlight bg-dsp-elevated px-1.5 py-0.5 font-mono text-[10px] text-dsp-muted">
                  DSP v2.4.1
                </span>
              </div>
            </div>
          </div>

          {/* Vertical Separator */}
          <div className="hidden h-5 w-[1px] bg-dsp-border md:block" />

          {/* Quick Pet Switcher Status Pill */}
          <div className="relative">
            <button
              onClick={() => setShowCatDropdown(!showCatDropdown)}
              className="flex items-center gap-2 rounded border border-dsp-border bg-dsp-surface px-2.5 py-1 text-xs transition hover:border-dsp-borderHighlight hover:bg-dsp-elevated"
            >
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="h-2 w-2 rounded-full bg-dsp-emerald" />
                <span className="font-semibold text-zinc-200">
                  {selectedCat ? selectedCat.name : 'No Companion Selected'}
                </span>
                {selectedCat && (
                  <span className="text-[10px] text-dsp-muted">
                    ({selectedCat.breed || 'Feline'})
                  </span>
                )}
              </div>
              <span className="rounded bg-dsp-elevated px-1 text-[10px] font-mono text-dsp-emerald border border-dsp-borderHighlight">
                ⚡ 98%
              </span>
              <ChevronDown className="h-3 w-3 text-dsp-muted" />
            </button>

            {/* Dropdown Menu */}
            {showCatDropdown && (
              <div className="absolute left-0 top-full mt-1.5 w-64 rounded border border-dsp-border bg-dsp-surface p-1 shadow-2xl z-50">
                <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-dsp-muted border-b border-dsp-border">
                  Active Subject Profiles
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {cats.length === 0 ? (
                    <div className="px-2 py-2 text-xs text-dsp-muted italic">
                      No cat profiles registered.
                    </div>
                  ) : (
                    cats.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          onSelectCatId(cat.id);
                          setShowCatDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between rounded px-2 py-1.5 text-xs text-left transition ${
                          cat.id === selectedCatId
                            ? 'bg-dsp-elevated text-dsp-amber font-semibold border border-dsp-borderHighlight'
                            : 'text-zinc-300 hover:bg-dsp-elevated'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Cat className="h-3.5 w-3.5 text-dsp-muted" />
                          <span>{cat.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-dsp-muted">
                          {cat.sex}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                <div className="border-t border-dsp-border pt-1">
                  <button
                    onClick={() => {
                      setShowCatDropdown(false);
                      onOpenCatManager();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 rounded bg-dsp-elevated py-1.5 text-xs font-mono text-zinc-200 hover:bg-zinc-800 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Manage Cat Profiles</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Audio Input Spec Pill */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-dsp-muted bg-dsp-surface border border-dsp-border px-2.5 py-1 rounded">
            <span className="text-dsp-cyan font-bold">MIC</span>
            <span>48.0 kHz</span>
            <span>•</span>
            <span>24-bit PCM</span>
            <span>•</span>
            <span className="text-dsp-emerald font-semibold">ONLINE</span>
          </div>
        </div>

        {/* Workstation Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Shortcuts Hint */}
          <div className="hidden xl:flex items-center gap-1.5 text-[10px] font-mono text-dsp-muted border border-dsp-border bg-dsp-surface/50 px-2 py-1 rounded">
            <Keyboard className="h-3 w-3 text-dsp-amber" />
            <span>[Space] Rec</span>
            <span>•</span>
            <span>[⌘U] Upload</span>
            <span>•</span>
            <span>[⌘T] Audit</span>
          </div>

          {/* Audit & Governance Drawer Toggle */}
          <button
            onClick={onOpenGovernance}
            className="flex items-center gap-1.5 rounded border border-dsp-border bg-dsp-surface px-2.5 py-1.5 text-xs font-mono text-zinc-300 hover:border-dsp-borderHighlight hover:text-white transition"
            title="Open Telemetry & Governance Drawer"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-dsp-cyan" />
            <span className="hidden sm:inline">Audit Log</span>
          </button>

          {/* Session Log */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 rounded border border-dsp-border bg-dsp-surface px-2.5 py-1.5 text-xs font-mono text-zinc-300 hover:border-dsp-borderHighlight hover:text-white transition"
          >
            <FileText className="h-3.5 w-3.5 text-dsp-amber" />
            <span className="hidden sm:inline">Session Log</span>
          </button>

          {/* Language Switcher */}
          <div className="flex items-center rounded border border-dsp-border bg-dsp-surface p-0.5 text-xs font-mono">
            <button
              onClick={() => setLanguage('en')}
              className={`rounded px-2 py-0.5 text-[11px] transition ${
                language === 'en'
                  ? 'bg-dsp-elevated text-dsp-amber font-bold border border-dsp-borderHighlight'
                  : 'text-dsp-muted hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('bn')}
              className={`rounded px-2 py-0.5 text-[11px] transition ${
                language === 'bn'
                  ? 'bg-dsp-elevated text-dsp-amber font-bold border border-dsp-borderHighlight'
                  : 'text-dsp-muted hover:text-white'
              }`}
            >
              বাংলা
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
