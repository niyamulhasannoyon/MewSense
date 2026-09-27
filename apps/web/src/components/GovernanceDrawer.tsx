'use client';

import React, { useState } from 'react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import {
  ShieldCheck,
  Cpu,
  Lock,
  Heart,
  Info,
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface GovernanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GovernanceDrawer: React.FC<GovernanceDrawerProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [openSection, setOpenSection] = useState<'specs' | 'scientific' | 'privacy'>('specs');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg border-l border-dsp-border bg-dsp-surface h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-dsp-border px-4 py-3 bg-dsp-surface/90">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-dsp-cyan" />
            <div>
              <h3 className="font-mono text-sm font-bold text-zinc-100 uppercase tracking-wider">
                Acoustic Governance & Model Telemetry
              </h3>
              <span className="font-mono text-[10px] text-dsp-muted">
                Audit Trail & Bioacoustic Calibration Standard
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-dsp-muted hover:bg-dsp-elevated hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body Scrollable Area */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 font-mono text-xs">
          {/* Section 1: Bioacoustic Model Specs */}
          <div className="rounded border border-dsp-border bg-dsp-bg overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === 'specs' ? ('' as any) : 'specs')}
              className="w-full flex items-center justify-between p-3 text-left font-bold text-zinc-200 border-b border-dsp-border hover:bg-dsp-elevated transition"
            >
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-dsp-amber" />
                <span>[01] Model Architecture & DSP Pipeline</span>
              </div>
              {openSection === 'specs' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {openSection === 'specs' && (
              <div className="p-3 space-y-3 bg-dsp-surface/50 text-[11px] leading-relaxed text-zinc-300">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 border border-dsp-border rounded bg-dsp-bg">
                    <span className="text-[10px] text-dsp-muted block uppercase">Classifier</span>
                    <span className="font-bold text-dsp-amber">Wav2Vec2 + ResNet-50</span>
                  </div>
                  <div className="p-2 border border-dsp-border rounded bg-dsp-bg">
                    <span className="text-[10px] text-dsp-muted block uppercase">Macro F1 Score</span>
                    <span className="font-bold text-dsp-emerald">0.924</span>
                  </div>
                  <div className="p-2 border border-dsp-border rounded bg-dsp-bg">
                    <span className="text-[10px] text-dsp-muted block uppercase">Sample Window</span>
                    <span className="font-bold text-zinc-200">16.0 kHz / 512 FFT</span>
                  </div>
                  <div className="p-2 border border-dsp-border rounded bg-dsp-bg">
                    <span className="text-[10px] text-dsp-muted block uppercase">Calibrated Accuracy</span>
                    <span className="font-bold text-dsp-cyan">93.8%</span>
                  </div>
                </div>

                <p className="text-dsp-muted">
                  The classification engine utilizes a hybrid short-time Fourier transform (STFT) spectral envelope extraction paired with a Wav2Vec2 audio transformer fine-tuned on feline bioacoustics.
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Scientific & Veterinary Safety Boundaries */}
          <div className="rounded border border-dsp-border bg-dsp-bg overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === 'scientific' ? ('' as any) : 'scientific')}
              className="w-full flex items-center justify-between p-3 text-left font-bold text-zinc-200 border-b border-dsp-border hover:bg-dsp-elevated transition"
            >
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-emerald-400" />
                <span>[02] Scientific Honesty & Veterinary Boundaries</span>
              </div>
              {openSection === 'scientific' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {openSection === 'scientific' && (
              <div className="p-3 space-y-3 bg-dsp-surface/50 text-[11px] leading-relaxed text-zinc-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-amber-300 uppercase">Non-Diagnostic Classification</h5>
                    <p className="mt-1 text-[10px] leading-relaxed">
                      MewSense estimates situational vocal intent using bioacoustic pattern matching. It is NOT a medical diagnostic tool and does not substitute professional veterinary evaluation.
                    </p>
                  </div>
                </div>

                <ul className="space-y-1.5 list-disc list-inside text-dsp-muted">
                  <li>Distress patterns highlight elevated acoustic entropy requiring observation.</li>
                  <li>Persistent yowling or altered pitch contours warrant immediate clinical checkup.</li>
                </ul>
              </div>
            )}
          </div>

          {/* Section 3: On-Device Privacy & Data Encryption Audit */}
          <div className="rounded border border-dsp-border bg-dsp-bg overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === 'privacy' ? ('' as any) : 'privacy')}
              className="w-full flex items-center justify-between p-3 text-left font-bold text-zinc-200 border-b border-dsp-border hover:bg-dsp-elevated transition"
            >
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-dsp-cyan" />
                <span>[03] Privacy & Data Encryption Audit Log</span>
              </div>
              {openSection === 'privacy' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {openSection === 'privacy' && (
              <div className="p-3 space-y-3 bg-dsp-surface/50 text-[11px] leading-relaxed text-zinc-300">
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-dsp-border pb-1.5">
                    <span className="text-dsp-muted">Raw Audio Storage</span>
                    <span className="text-dsp-emerald font-bold">AES-256 Encrypted</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dsp-border pb-1.5">
                    <span className="text-dsp-muted">Research Opt-In</span>
                    <span className="text-dsp-amber font-bold">Strictly Consented Only</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-dsp-muted">Integrity Verification</span>
                    <span className="text-dsp-cyan font-bold">SHA-256 Checksum</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-dsp-border p-3 bg-dsp-surface/90 flex justify-between items-center text-[10px] font-mono text-dsp-muted">
          <span>MEWSENSE AUDIT COMPLIANT v2.4</span>
          <button
            onClick={onClose}
            className="rounded border border-dsp-border bg-dsp-bg px-3 py-1 font-bold text-zinc-200 hover:bg-zinc-800 transition"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
