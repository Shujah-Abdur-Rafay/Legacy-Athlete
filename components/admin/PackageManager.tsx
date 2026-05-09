import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { seedPackagesIfEmpty } from './seed';

interface Pkg {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  description: string;
  features: string[];
  recommended: boolean;
  cta: string;
  priceCents: number;
  order: number;
  active: boolean;
  hidden?: boolean;
}

interface AddonConfig {
  dropInCents: number;
  defaultCents: number;
  memberMonthly: number;
  nonMemberMonthly: number;
  singleSession: number;
}

const emptyPkg = (): Pkg => ({
  id: '',
  name: '',
  price: '',
  description: '',
  features: [],
  recommended: false,
  cta: 'Subscribe',
  priceCents: 0,
  order: 0,
  active: true,
});

const PackageManager: React.FC = () => {
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [addonConfig, setAddonConfig] = useState<AddonConfig | null>(null);
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => { try { await seedPackagesIfEmpty(); } catch (e: any) { setMsg(e.message); } })();
    const unsub = onSnapshot(collection(db, 'packages'), (snap) => {
      const list: Pkg[] = [];
      snap.docs.forEach((d) => {
        const data: any = d.data();
        if (d.id === 'performance-addon-config') {
          setAddonConfig({
            dropInCents: data.dropInCents || 0,
            defaultCents: data.defaultCents || 0,
            memberMonthly: data.memberMonthly || 0,
            nonMemberMonthly: data.nonMemberMonthly || 0,
            singleSession: data.singleSession || 0,
          });
          return;
        }
        list.push({
          id: d.id,
          name: data.name || '',
          price: data.price || '',
          originalPrice: data.originalPrice,
          description: data.description || '',
          features: Array.isArray(data.features) ? data.features : [],
          recommended: !!data.recommended,
          cta: data.cta || 'Subscribe',
          priceCents: data.priceCents || 0,
          order: typeof data.order === 'number' ? data.order : 999,
          active: data.active !== false,
          hidden: !!data.hidden,
        });
      });
      list.sort((a, b) => a.order - b.order);
      setPkgs(list);
    });
    return () => unsub();
  }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2500); };

  const savePkg = async (p: Pkg) => {
    if (!p.id || !p.name) { flash('ID and Name required'); return; }
    setBusy(true);
    try {
      await setDoc(doc(db, 'packages', p.id), { ...p, updatedAt: serverTimestamp() }, { merge: true });
      flash('Saved');
      setEditing(null); setCreating(false);
    } catch (e: any) { flash('Error: ' + e.message); } finally { setBusy(false); }
  };

  const deletePkg = async (id: string) => {
    if (!confirm(`Delete package "${id}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, 'packages', id));
      flash('Deleted');
    } catch (e: any) { flash('Error: ' + e.message); } finally { setBusy(false); }
  };

  const saveAddon = async (cfg: AddonConfig) => {
    setBusy(true);
    try {
      await setDoc(doc(db, 'packages', 'performance-addon-config'), {
        ...cfg, hidden: true, updatedAt: serverTimestamp(),
      }, { merge: true });
      flash('Add-on config saved');
    } catch (e: any) { flash('Error: ' + e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-8">
      {msg && (
        <div className="bg-stone-900 border border-stone-800 px-4 py-2 text-[10px] text-orange-400 uppercase tracking-widest">{msg}</div>
      )}

      <div className="bg-stone-950 border border-stone-800">
        <div className="px-8 py-6 border-b border-stone-900 flex justify-between items-center">
          <div>
            <h2 className="font-athletic text-lg tracking-widest text-white">PACKAGES & PRICING</h2>
            <p className="text-[9px] text-stone-600 uppercase tracking-widest mt-1">
              Changes appear instantly on the public pricing section
            </p>
          </div>
          <button
            onClick={() => { setEditing(emptyPkg()); setCreating(true); }}
            className="text-[10px] uppercase tracking-widest text-orange-500 hover:text-orange-300 border border-orange-700 px-3 py-2"
          >+ New Package</button>
        </div>

        <div className="divide-y divide-stone-900">
          {pkgs.map((p) => (
            <div key={p.id} className="px-8 py-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-3">
                <p className="text-[11px] text-white uppercase tracking-widest font-medium">{p.name}</p>
                <p className="text-[9px] text-stone-600 font-mono">{p.id}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] text-orange-400">${p.price}</p>
                <p className="text-[9px] text-stone-600">{p.priceCents}¢</p>
              </div>
              <div className="md:col-span-4">
                <p className="text-[10px] text-stone-400 truncate">{p.description}</p>
              </div>
              <div className="md:col-span-1 flex gap-1">
                {p.recommended && <span className="text-[8px] text-orange-400 uppercase">★</span>}
                {!p.active && <span className="text-[8px] text-stone-600 uppercase">hidden</span>}
              </div>
              <div className="md:col-span-2 flex gap-2 justify-end">
                <button onClick={() => setEditing(p)} className="text-[9px] uppercase tracking-widest text-stone-400 hover:text-white border border-stone-800 px-2 py-1">Edit</button>
                <button onClick={() => deletePkg(p.id)} className="text-[9px] uppercase tracking-widest text-red-500 hover:text-red-300 border border-red-900 px-2 py-1">Del</button>
              </div>
            </div>
          ))}
          {pkgs.length === 0 && <p className="px-8 py-6 text-[10px] text-stone-700 uppercase tracking-widest">No packages</p>}
        </div>
      </div>

      {/* Performance Add-on Config */}
      {addonConfig && (
        <div className="bg-stone-950 border border-stone-800 px-8 py-6">
          <h2 className="font-athletic text-lg tracking-widest text-white mb-4">PERFORMANCE ADD-ON</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {([
              ['memberMonthly', 'Members ($/mo)'],
              ['nonMemberMonthly', 'Non-Members ($/mo)'],
              ['singleSession', 'Single Session ($)'],
              ['dropInCents', 'Drop-in add-on (cents)'],
              ['defaultCents', 'Default monthly add-on (cents)'],
            ] as Array<[keyof AddonConfig, string]>).map(([k, label]) => (
              <label key={k} className="block">
                <span className="text-[9px] text-stone-600 uppercase tracking-widest">{label}</span>
                <input
                  type="number"
                  value={addonConfig[k]}
                  onChange={(e) => setAddonConfig({ ...addonConfig, [k]: parseInt(e.target.value || '0', 10) })}
                  className="mt-1 w-full bg-stone-900 border border-stone-800 px-3 py-2 text-white text-xs"
                />
              </label>
            ))}
          </div>
          <button
            disabled={busy}
            onClick={() => saveAddon(addonConfig)}
            className="mt-4 text-[10px] uppercase tracking-widest text-orange-500 hover:text-orange-300 border border-orange-700 px-3 py-2"
          >Save Add-on Config</button>
        </div>
      )}

      {/* Edit / Create modal */}
      {editing && (
        <PackageEditor
          pkg={editing}
          isNew={creating}
          existingIds={pkgs.map((p) => p.id)}
          busy={busy}
          onSave={savePkg}
          onCancel={() => { setEditing(null); setCreating(false); }}
        />
      )}
    </div>
  );
};

const PackageEditor: React.FC<{
  pkg: Pkg;
  isNew: boolean;
  existingIds: string[];
  busy: boolean;
  onSave: (p: Pkg) => void;
  onCancel: () => void;
}> = ({ pkg, isNew, existingIds, busy, onSave, onCancel }) => {
  const [draft, setDraft] = useState<Pkg>(pkg);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={onCancel}>
      <div className="relative w-full max-w-2xl bg-stone-950 border border-stone-800 p-8 my-8" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-athletic text-xl tracking-widest text-white mb-6">{isNew ? 'NEW PACKAGE' : 'EDIT PACKAGE'}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="ID (unique slug)" disabled={!isNew}
            value={draft.id}
            onChange={(v) => setDraft({ ...draft, id: v.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            error={isNew && existingIds.includes(draft.id) ? 'ID already exists' : undefined}
          />
          <Field label="Display Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
          <Field label="Price (display)" value={draft.price} onChange={(v) => setDraft({ ...draft, price: v })} />
          <Field label="Original Price (optional)" value={draft.originalPrice || ''} onChange={(v) => setDraft({ ...draft, originalPrice: v || undefined })} />
          <Field label="Price in cents (server-authoritative)" type="number" value={String(draft.priceCents)} onChange={(v) => setDraft({ ...draft, priceCents: parseInt(v || '0', 10) })} />
          <Field label="Order" type="number" value={String(draft.order)} onChange={(v) => setDraft({ ...draft, order: parseInt(v || '0', 10) })} />
          <Field label="CTA Button" value={draft.cta} onChange={(v) => setDraft({ ...draft, cta: v })} />
          <Field label="Description" value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} />
        </div>

        <div className="mt-4">
          <span className="text-[9px] text-stone-600 uppercase tracking-widest">Features (one per line)</span>
          <textarea
            value={draft.features.join('\n')}
            onChange={(e) => setDraft({ ...draft, features: e.target.value.split('\n').filter((f) => f.trim()) })}
            rows={5}
            className="mt-1 w-full bg-stone-900 border border-stone-800 px-3 py-2 text-white text-xs"
          />
        </div>

        <div className="flex gap-4 mt-4">
          <label className="flex items-center gap-2 text-[10px] text-stone-400 uppercase tracking-widest">
            <input type="checkbox" checked={draft.recommended} onChange={(e) => setDraft({ ...draft, recommended: e.target.checked })} />
            Recommended (★)
          </label>
          <label className="flex items-center gap-2 text-[10px] text-stone-400 uppercase tracking-widest">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            Active (visible publicly)
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="px-5 py-2 border border-stone-700 text-stone-400 text-xs uppercase tracking-widest">Cancel</button>
          <button
            disabled={busy}
            onClick={() => onSave(draft)}
            className="flex-1 py-2 bg-white text-black text-xs uppercase tracking-widest font-medium hover:bg-orange-500 hover:text-white"
          >{busy ? 'Saving…' : 'Save Package'}</button>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  error?: string;
}> = ({ label, value, onChange, type = 'text', disabled, error }) => (
  <label className="block">
    <span className="text-[9px] text-stone-600 uppercase tracking-widest">{label}</span>
    <input
      type={type}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`mt-1 w-full bg-stone-900 border ${error ? 'border-red-700' : 'border-stone-800'} px-3 py-2 text-white text-xs disabled:opacity-50`}
    />
    {error && <span className="text-[9px] text-red-400">{error}</span>}
  </label>
);

export default PackageManager;
