'use client';

import React, { useState } from 'react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { CatEntity } from '@mewsense/shared-types';
import { Sparkles, Utensils, Users, Info } from 'lucide-react';

interface ContextModalProps {
  cats: CatEntity[];
  selectedCatId?: string;
  onSelectCatId: (id?: string) => void;
  context: {
    environment: string;
    activity: string;
    foodPresent?: boolean;
    otherAnimalsPresent?: boolean;
    userNotes?: string;
  };
  onChangeContext: (updated: any) => void;
  onProceed: () => void;
  onCancel: () => void;
}

export const ContextModal: React.FC<ContextModalProps> = ({
  cats,
  selectedCatId,
  onSelectCatId,
  context,
  onChangeContext,
  onProceed,
  onCancel
}) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Sparkles className="h-5 w-5 text-brand-400" />
          <h3 className="text-lg font-bold text-white">{t.contextHeading}</h3>
        </div>

        <p className="mb-5 text-xs text-zinc-400">
          Providing behavioral context allows the Bayesian acoustic model to estimate situational intent with higher confidence.
        </p>

        <div className="space-y-4">
          {/* Cat Selection */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-300">{t.selectCat}</label>
            <select
              value={selectedCatId || ''}
              onChange={(e) => onSelectCatId(e.target.value || undefined)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white focus:border-brand-500 focus:outline-none"
            >
              <option value="">{t.noCatSelected}</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  🐱 {c.name} {c.breed ? `(${c.breed})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Environment */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-300">{t.environment}</label>
            <select
              value={context.environment}
              onChange={(e) => onChangeContext({ ...context, environment: e.target.value })}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white focus:border-brand-500 focus:outline-none"
            >
              <option value="indoor">🏠 Indoor Home</option>
              <option value="outdoor">🌳 Outdoor / Garden</option>
              <option value="vet_clinic">🏥 Veterinary Clinic</option>
              <option value="shelter_cage">🏢 Shelter Cage / Pen</option>
              <option value="transit_carrier">🚗 Transit Carrier</option>
            </select>
          </div>

          {/* Activity */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-300">{t.activity}</label>
            <select
              value={context.activity}
              onChange={(e) => onChangeContext({ ...context, activity: e.target.value })}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white focus:border-brand-500 focus:outline-none"
            >
              <option value="resting">💤 Resting / Lounging</option>
              <option value="feeding">🥣 Near Food Bowl / Feeding Time</option>
              <option value="playful">🎾 Playing / Active</option>
              <option value="roaming">🐾 Roaming / Exploring</option>
              <option value="seeking_shelter">📦 Hiding / Seeking Shelter</option>
              <option value="unknown">❓ Unknown / Unobserved</option>
            </select>
          </div>

          {/* Food Presence Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
            <div className="flex items-center gap-2">
              <Utensils className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-zinc-300">{t.foodPresent}</span>
            </div>
            <input
              type="checkbox"
              checked={context.foodPresent ?? false}
              onChange={(e) => onChangeContext({ ...context, foodPresent: e.target.checked })}
              className="h-4 w-4 rounded accent-brand-500"
            />
          </div>

          {/* Other Animals Nearby Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-zinc-300">{t.otherAnimals}</span>
            </div>
            <input
              type="checkbox"
              checked={context.otherAnimalsPresent ?? false}
              onChange={(e) => onChangeContext({ ...context, otherAnimalsPresent: e.target.checked })}
              className="h-4 w-4 rounded accent-brand-500"
            />
          </div>

          {/* Freeform Notes */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-300">{t.userNotes}</label>
            <textarea
              value={context.userNotes || ''}
              onChange={(e) => onChangeContext({ ...context, userNotes: e.target.value })}
              placeholder="e.g. Scratched at door, vocalized right before jumping on bed"
              rows={2}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white placeholder-zinc-600 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-800 pt-4">
          <button
            onClick={onCancel}
            className="rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            className="rounded-xl bg-gradient-to-r from-brand-600 to-orange-500 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-brand-500/20 hover:brightness-110 transition"
          >
            {t.analyzeButton}
          </button>
        </div>
      </div>
    </div>
  );
};
