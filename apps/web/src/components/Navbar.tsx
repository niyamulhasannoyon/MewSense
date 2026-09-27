'use client';

import React from 'react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { Sparkles, Globe, Cat, Volume2 } from 'lucide-react';

interface NavbarProps {
  onOpenCatManager: () => void;
  onOpenHistory: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCatManager, onOpenHistory }) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-orange-400 text-white shadow-lg shadow-brand-500/20">
            <Volume2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">{t.appTitle}</span>
              <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-semibold text-brand-400 border border-brand-500/20">
                AI Beta
              </span>
            </div>
            <p className="hidden text-xs text-zinc-400 sm:block">{t.tagline}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition"
          >
            <span>{t.recentAnalyses}</span>
          </button>

          {/* Manage Cats Button */}
          <button
            onClick={onOpenCatManager}
            className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition"
          >
            <Cat className="h-4 w-4 text-brand-400" />
            <span className="hidden sm:inline">{t.manageCats}</span>
          </button>

          {/* Language Switcher */}
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/80 p-0.5 text-xs">
            <button
              onClick={() => setLanguage('en')}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                language === 'en'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('bn')}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                language === 'bn'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
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
