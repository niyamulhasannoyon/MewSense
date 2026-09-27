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
    if (confirm('Are you sure you want to remove this companion profile?')) {
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
      <div className="w-full max-w-lg rounded border border-dsp-border bg-dsp-surface p-5 shadow-2xl font-mono text-xs">
        <div className="flex items-center justify-between border-b border-dsp-border pb-3">
          <div className="flex items-center gap-2">
            <Cat className="h-4 w-4 text-dsp-amber" />
            <h3 className="font-bold text-white uppercase tracking-wider">Subject Profile Registry</h3>
          </div>
          <button onClick={onClose} className="rounded p-1 text-dsp-muted hover:bg-dsp-elevated hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Existing Cats List */}
        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {cats.length === 0 ? (
            <div className="rounded border border-dashed border-dsp-border p-4 text-center text-dsp-muted italic">
              No active subject profiles registered. Create one below.
            </div>
          ) : (
            cats.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded border border-dsp-border bg-dsp-bg p-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded border border-dsp-borderHighlight bg-dsp-elevated font-bold text-dsp-amber text-xs">
                    🐱
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{cat.name}</h4>
                    <p className="text-[10px] text-dsp-muted">
                      {cat.breed || 'Feline'} • {cat.sex.toLowerCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteCat(cat.id)}
                  className="rounded p-1.5 text-dsp-muted hover:bg-red-500/20 hover:text-red-400 transition"
                  title="Delete profile"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Cat Form */}
        {showAddForm ? (
          <form onSubmit={handleCreateCat} className="mt-4 border-t border-dsp-border pt-3 space-y-3">
            <div>
              <label className="mb-1 block font-bold text-dsp-muted uppercase text-[10px]">Subject Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Luna, Mochi, Oliver"
                className="w-full rounded border border-dsp-border bg-dsp-bg px-3 py-1.5 text-xs text-white focus:border-dsp-amber focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-bold text-dsp-muted uppercase text-[10px]">Breed / Phenotype</label>
                <input
                  type="text"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="e.g. Bengal, Domestic Shorthair"
                  className="w-full rounded border border-dsp-border bg-dsp-bg px-3 py-1.5 text-xs text-white focus:border-dsp-amber focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-dsp-muted uppercase text-[10px]">Sex</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as any)}
                  className="w-full rounded border border-dsp-border bg-dsp-bg px-3 py-1.5 text-xs text-white focus:border-dsp-amber focus:outline-none"
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded px-3 py-1 text-dsp-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded bg-dsp-amber px-4 py-1 font-bold text-black hover:brightness-110"
              >
                {loading ? 'Saving...' : 'Register Profile'}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded border border-dashed border-dsp-border bg-dsp-bg py-2 font-bold text-dsp-amber hover:border-dsp-amber transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Subject Profile</span>
          </button>
        )}
      </div>
    </div>
  );
};
