'use client';

import React, { useState } from 'react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { CatEntity } from '@mewsense/shared-types';
import { Cat, Plus, Trash2, X } from 'lucide-react';
import { api } from '../lib/api-client';

interface CatManagerProps {
  cats: CatEntity[];
  onRefreshCats: () => void;
  onClose: () => void;
}

export const CatManager: React.FC<CatManagerProps> = ({ cats, onRefreshCats, onClose }) => {
  const { t } = useLanguage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState<'FEMALE' | 'MALE' | 'UNKNOWN'>('FEMALE');
  const [loading, setLoading] = useState(false);

  const handleCreateCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await api.createCat({ name, breed: breed || undefined, sex });
      setName('');
      setBreed('');
      setShowAddForm(false);
      onRefreshCats();
    } catch (err) {
      console.error('Failed to create cat:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCat = async (catId: string) => {
    if (confirm('Are you sure you want to remove this cat profile?')) {
      try {
        await api.deleteCat(catId);
        onRefreshCats();
      } catch (err) {
        console.error('Failed to delete cat:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Cat className="h-5 w-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">{t.manageCats}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Existing Cats List */}
        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {cats.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
              No cat profiles created yet. Add your companion below.
            </div>
          ) : (
            cats.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400 font-bold text-sm">
                    🐱
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{cat.name}</h4>
                    <p className="text-[11px] text-zinc-400">
                      {cat.breed || 'Mixed'} • {cat.sex.toLowerCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteCat(cat.id)}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition"
                  title="Delete profile"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Cat Form */}
        {showAddForm ? (
          <form onSubmit={handleCreateCat} className="mt-5 border-t border-zinc-800 pt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-300">{t.catName}</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mochi, Luna, Oliver"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-300">{t.breed}</label>
                <input
                  type="text"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="e.g. Scottish Fold, Tabby"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-300">Sex</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as any)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-xl px-3 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-500"
              >
                {loading ? 'Saving...' : t.saveCat}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-800/20 py-2.5 text-xs font-medium text-zinc-300 hover:border-brand-500 hover:text-brand-400 transition"
          >
            <Plus className="h-4 w-4" />
            <span>{t.addNewCat}</span>
          </button>
        )}
      </div>
    </div>
  );
};
