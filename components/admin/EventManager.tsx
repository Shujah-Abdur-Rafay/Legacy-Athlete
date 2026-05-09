import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { seedEventsIfEmpty } from './seed';

interface EventItem {
  id: string;
  phase: string;
  title: string;
  description: string;
  tag: string;
  order: number;
  active: boolean;
}

const EventManager: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => { try { await seedEventsIfEmpty(); } catch (e: any) { setMsg(e.message); } })();
    const unsub = onSnapshot(collection(db, 'events'), (snap) => {
      const list: EventItem[] = snap.docs.map((d) => {
        const data: any = d.data();
        return {
          id: d.id,
          phase: data.phase || '',
          title: data.title || '',
          description: data.description || '',
          tag: data.tag || '',
          order: typeof data.order === 'number' ? data.order : 999,
          active: data.active !== false,
        };
      });
      list.sort((a, b) => a.order - b.order);
      setEvents(list);
    });
    return () => unsub();
  }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2500); };

  const save = async (e: EventItem) => {
    if (!e.id || !e.title) { flash('ID and Title required'); return; }
    setBusy(true);
    try {
      await setDoc(doc(db, 'events', e.id), { ...e, updatedAt: serverTimestamp() }, { merge: true });
      flash('Saved');
      setEditing(null); setCreating(false);
    } catch (err: any) { flash('Error: ' + err.message); } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm(`Delete event "${id}"?`)) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, 'events', id));
      flash('Deleted');
    } catch (err: any) { flash('Error: ' + err.message); } finally { setBusy(false); }
  };

  const blank = (): EventItem => ({
    id: `event-${Date.now()}`,
    phase: String(events.length + 1).padStart(2, '0'),
    title: '',
    description: '',
    tag: '',
    order: events.length,
    active: true,
  });

  return (
    <div className="space-y-6">
      {msg && (
        <div className="bg-stone-900 border border-stone-800 px-4 py-2 text-[10px] text-orange-400 uppercase tracking-widest">{msg}</div>
      )}

      <div className="bg-stone-950 border border-stone-800">
        <div className="px-8 py-6 border-b border-stone-900 flex justify-between items-center">
          <div>
            <h2 className="font-athletic text-lg tracking-widest text-white">UPCOMING EVENTS / ROADMAP</h2>
            <p className="text-[9px] text-stone-600 uppercase tracking-widest mt-1">
              These power the "WHAT HAPPENS AFTER" section on the homepage
            </p>
          </div>
          <button
            onClick={() => { setEditing(blank()); setCreating(true); }}
            className="text-[10px] uppercase tracking-widest text-orange-500 hover:text-orange-300 border border-orange-700 px-3 py-2"
          >+ New Event</button>
        </div>

        <div className="divide-y divide-stone-900">
          {events.map((e) => (
            <div key={e.id} className="px-8 py-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-1 font-athletic text-2xl text-orange-600/50">{e.phase}</div>
              <div className="md:col-span-3">
                <p className="text-[11px] text-white uppercase tracking-widest font-medium">{e.title}</p>
                <p className="text-[9px] text-stone-600">{e.tag}</p>
              </div>
              <div className="md:col-span-5 text-[10px] text-stone-400 truncate">{e.description}</div>
              <div className="md:col-span-1 text-[9px] text-stone-500">order {e.order}</div>
              <div className="md:col-span-1">
                {!e.active && <span className="text-[8px] text-stone-600 uppercase">hidden</span>}
              </div>
              <div className="md:col-span-1 flex gap-1 justify-end">
                <button onClick={() => setEditing(e)} className="text-[9px] uppercase tracking-widest text-stone-400 hover:text-white border border-stone-800 px-2 py-1">Edit</button>
                <button onClick={() => remove(e.id)} className="text-[9px] uppercase tracking-widest text-red-500 hover:text-red-300 border border-red-900 px-2 py-1">Del</button>
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="px-8 py-6 text-[10px] text-stone-700 uppercase tracking-widest">No events</p>}
        </div>
      </div>

      {editing && (
        <EventEditor
          ev={editing}
          isNew={creating}
          existingIds={events.map((e) => e.id)}
          busy={busy}
          onSave={save}
          onCancel={() => { setEditing(null); setCreating(false); }}
        />
      )}
    </div>
  );
};

const EventEditor: React.FC<{
  ev: EventItem;
  isNew: boolean;
  existingIds: string[];
  busy: boolean;
  onSave: (e: EventItem) => void;
  onCancel: () => void;
}> = ({ ev, isNew, existingIds, busy, onSave, onCancel }) => {
  const [draft, setDraft] = useState<EventItem>(ev);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={onCancel}>
      <div className="relative w-full max-w-xl bg-stone-950 border border-stone-800 p-8" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-athletic text-xl tracking-widest text-white mb-6">{isNew ? 'NEW EVENT' : 'EDIT EVENT'}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[9px] text-stone-600 uppercase tracking-widest">ID</span>
            <input disabled={!isNew} value={draft.id}
              onChange={(e) => setDraft({ ...draft, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              className={`mt-1 w-full bg-stone-900 border border-stone-800 px-3 py-2 text-white text-xs disabled:opacity-50`} />
            {isNew && existingIds.includes(draft.id) && <span className="text-[9px] text-red-400">ID exists</span>}
          </label>
          <label className="block">
            <span className="text-[9px] text-stone-600 uppercase tracking-widest">Phase</span>
            <input value={draft.phase} onChange={(e) => setDraft({ ...draft, phase: e.target.value })}
              className="mt-1 w-full bg-stone-900 border border-stone-800 px-3 py-2 text-white text-xs" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[9px] text-stone-600 uppercase tracking-widest">Title</span>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="mt-1 w-full bg-stone-900 border border-stone-800 px-3 py-2 text-white text-xs uppercase tracking-wider" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[9px] text-stone-600 uppercase tracking-widest">Description</span>
            <textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="mt-1 w-full bg-stone-900 border border-stone-800 px-3 py-2 text-white text-xs" />
          </label>
          <label className="block">
            <span className="text-[9px] text-stone-600 uppercase tracking-widest">Tag</span>
            <input value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })}
              className="mt-1 w-full bg-stone-900 border border-stone-800 px-3 py-2 text-white text-xs" />
          </label>
          <label className="block">
            <span className="text-[9px] text-stone-600 uppercase tracking-widest">Order</span>
            <input type="number" value={draft.order} onChange={(e) => setDraft({ ...draft, order: parseInt(e.target.value || '0', 10) })}
              className="mt-1 w-full bg-stone-900 border border-stone-800 px-3 py-2 text-white text-xs" />
          </label>
          <label className="flex items-center gap-2 text-[10px] text-stone-400 uppercase tracking-widest md:col-span-2">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            Active (visible publicly)
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="px-5 py-2 border border-stone-700 text-stone-400 text-xs uppercase tracking-widest">Cancel</button>
          <button disabled={busy} onClick={() => onSave(draft)}
            className="flex-1 py-2 bg-white text-black text-xs uppercase tracking-widest font-medium hover:bg-orange-500 hover:text-white">
            {busy ? 'Saving…' : 'Save Event'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventManager;
