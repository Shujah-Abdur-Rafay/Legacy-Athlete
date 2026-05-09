import React, { useEffect, useState } from 'react';
import {
  collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { seedScheduleIfEmpty, bumpScheduleVersion } from './seed';

interface Slot { h: number; m: number; focus: string; duration: number; }
interface DayTemplate { id: string; day: number; times: Slot[]; active: boolean; }
interface Override {
  id: string;
  cancelled?: boolean;
  focus?: string;
  duration?: number;
  maxAttendance?: number;
  note?: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const FN_BASE = import.meta.env.VITE_FUNCTIONS_URL || '';
const getApiUrl = (endpoint: string) => FN_BASE ? `${FN_BASE}/${endpoint}` : `/api/${endpoint}`;

const ScheduleManager: React.FC = () => {
  const [days, setDays] = useState<DayTemplate[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setSeeding(true);
      try { await seedScheduleIfEmpty(); } catch (e: any) { setMsg(e.message); }
      setSeeding(false);
    })();

    const unsubDays = onSnapshot(collection(db, 'schedule_templates'), (snap) => {
      const list: DayTemplate[] = snap.docs.map((d) => {
        const data: any = d.data();
        return {
          id: d.id,
          day: typeof data.day === 'number' ? data.day : parseInt(d.id, 10),
          times: Array.isArray(data.times) ? data.times : [],
          active: data.active !== false,
        };
      });
      list.sort((a, b) => a.day - b.day);
      setDays(list);
    });

    const unsubOverrides = onSnapshot(collection(db, 'session_overrides'), (snap) => {
      const map: Record<string, Override> = {};
      snap.docs.forEach((d) => { map[d.id] = { id: d.id, ...(d.data() as any) }; });
      setOverrides(map);
    });

    fetchUpcoming();

    return () => { unsubDays(); unsubOverrides(); };
  }, []);

  const fetchUpcoming = async () => {
    try {
      const res = await fetch(getApiUrl('getSessions'));
      if (res.ok) setUpcoming(await res.json());
    } catch (e) { /* ignore */ }
  };

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2500); };

  const saveDay = async (dayIdx: number, times: Slot[], active = true) => {
    setBusy(true);
    try {
      await setDoc(doc(db, 'schedule_templates', String(dayIdx)), {
        day: dayIdx, times, active, updatedAt: serverTimestamp(),
      }, { merge: true });
      await bumpScheduleVersion();
      flash('Schedule saved');
      fetchUpcoming();
    } catch (e: any) { flash('Error: ' + e.message); } finally { setBusy(false); }
  };

  const addSlot = (dayIdx: number) => {
    const day = days.find((d) => d.day === dayIdx);
    const newTimes = [...(day?.times || []), { h: 18, m: 0, focus: 'New Session', duration: 60 }];
    saveDay(dayIdx, newTimes);
  };

  const updateSlot = (dayIdx: number, slotIdx: number, patch: Partial<Slot>) => {
    const day = days.find((d) => d.day === dayIdx);
    if (!day) return;
    const newTimes = day.times.map((s, i) => i === slotIdx ? { ...s, ...patch } : s);
    setDays((prev) => prev.map((d) => d.day === dayIdx ? { ...d, times: newTimes } : d));
  };

  const commitSlot = (dayIdx: number) => {
    const day = days.find((d) => d.day === dayIdx);
    if (day) saveDay(dayIdx, day.times, day.active);
  };

  const deleteSlot = (dayIdx: number, slotIdx: number) => {
    const day = days.find((d) => d.day === dayIdx);
    if (!day) return;
    const newTimes = day.times.filter((_, i) => i !== slotIdx);
    saveDay(dayIdx, newTimes, day.active);
  };

  const toggleDayActive = (dayIdx: number) => {
    const day = days.find((d) => d.day === dayIdx);
    if (day) saveDay(dayIdx, day.times, !day.active);
  };

  const setOverride = async (sessionId: string, patch: Partial<Override>) => {
    const encoded = encodeURIComponent(sessionId);
    const ref = doc(db, 'session_overrides', encoded);
    setBusy(true);
    try {
      await setDoc(ref, { ...patch, updatedAt: serverTimestamp() }, { merge: true });
      await bumpScheduleVersion();
      flash('Override saved');
      fetchUpcoming();
    } catch (e: any) { flash('Error: ' + e.message); } finally { setBusy(false); }
  };

  const clearOverride = async (sessionId: string) => {
    const encoded = encodeURIComponent(sessionId);
    setBusy(true);
    try {
      await deleteDoc(doc(db, 'session_overrides', encoded));
      await bumpScheduleVersion();
      flash('Override cleared');
      fetchUpcoming();
    } catch (e: any) { flash('Error: ' + e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-8">
      {msg && (
        <div className="bg-stone-900 border border-stone-800 px-4 py-2 text-[10px] text-orange-400 uppercase tracking-widest">
          {msg}
        </div>
      )}

      {/* Recurring Weekly Schedule */}
      <div className="bg-stone-950 border border-stone-800">
        <div className="px-8 py-6 border-b border-stone-900 flex justify-between items-center">
          <div>
            <h2 className="font-athletic text-lg tracking-widest text-white">RECURRING WEEKLY SCHEDULE</h2>
            <p className="text-[9px] text-stone-600 uppercase tracking-widest mt-1">
              {seeding ? 'Initialising default schedule…' : 'Active templates auto-generate sessions for the next 14 days'}
            </p>
          </div>
        </div>

        <div className="divide-y divide-stone-900">
          {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
            const day = days.find((d) => d.day === dayIdx) || { id: String(dayIdx), day: dayIdx, times: [], active: true };
            return (
              <div key={dayIdx} className="px-8 py-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-athletic text-base tracking-widest text-white">{DAY_NAMES[dayIdx].toUpperCase()}</h3>
                    <button
                      onClick={() => toggleDayActive(dayIdx)}
                      disabled={busy}
                      className={`text-[8px] uppercase tracking-widest px-2 py-1 border ${day.active ? 'border-green-700 text-green-400' : 'border-stone-700 text-stone-600'}`}
                    >
                      {day.active ? '● Active' : '○ Inactive'}
                    </button>
                  </div>
                  <button
                    onClick={() => addSlot(dayIdx)}
                    disabled={busy}
                    className="text-[10px] uppercase tracking-widest text-orange-500 hover:text-orange-300"
                  >
                    + Add Slot
                  </button>
                </div>

                {day.times.length === 0 ? (
                  <p className="text-[10px] text-stone-700 uppercase tracking-widest">No sessions scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {day.times.map((slot, i) => (
                      <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-stone-900/30 p-3 border border-stone-800">
                        <input
                          type="number" min={0} max={23} value={slot.h}
                          onChange={(e) => updateSlot(dayIdx, i, { h: parseInt(e.target.value || '0', 10) })}
                          onBlur={() => commitSlot(dayIdx)}
                          className="md:col-span-1 bg-stone-950 border border-stone-800 px-2 py-2 text-white text-xs"
                          placeholder="HH"
                        />
                        <input
                          type="number" min={0} max={59} value={slot.m}
                          onChange={(e) => updateSlot(dayIdx, i, { m: parseInt(e.target.value || '0', 10) })}
                          onBlur={() => commitSlot(dayIdx)}
                          className="md:col-span-1 bg-stone-950 border border-stone-800 px-2 py-2 text-white text-xs"
                          placeholder="MM"
                        />
                        <input
                          type="text" value={slot.focus}
                          onChange={(e) => updateSlot(dayIdx, i, { focus: e.target.value })}
                          onBlur={() => commitSlot(dayIdx)}
                          className="md:col-span-7 bg-stone-950 border border-stone-800 px-3 py-2 text-white text-xs uppercase tracking-wider"
                          placeholder="Focus / Title"
                        />
                        <input
                          type="number" min={5} max={300} value={slot.duration}
                          onChange={(e) => updateSlot(dayIdx, i, { duration: parseInt(e.target.value || '0', 10) })}
                          onBlur={() => commitSlot(dayIdx)}
                          className="md:col-span-2 bg-stone-950 border border-stone-800 px-2 py-2 text-white text-xs"
                          placeholder="Mins"
                        />
                        <button
                          onClick={() => deleteSlot(dayIdx, i)}
                          disabled={busy}
                          className="md:col-span-1 text-[10px] uppercase tracking-widest text-red-500 hover:text-red-300"
                        >Del</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming individual sessions w/ overrides */}
      <div className="bg-stone-950 border border-stone-800">
        <div className="px-8 py-6 border-b border-stone-900 flex justify-between items-center">
          <div>
            <h2 className="font-athletic text-lg tracking-widest text-white">UPCOMING SESSIONS (NEXT 14 DAYS)</h2>
            <p className="text-[9px] text-stone-600 uppercase tracking-widest mt-1">
              Edit or cancel a single occurrence — won't affect the recurring template
            </p>
          </div>
          <button onClick={fetchUpcoming} className="text-[10px] uppercase tracking-widest text-stone-500 hover:text-white">↻ Refresh</button>
        </div>
        <div className="px-8 py-4 max-h-[600px] overflow-y-auto">
          {upcoming.length === 0 ? (
            <p className="text-[10px] text-stone-700 uppercase tracking-widest py-6">No upcoming sessions</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((s) => {
                const ov = overrides[encodeURIComponent(s.id)];
                return (
                  <div key={s.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3 border border-stone-800 bg-stone-900/20">
                    <div className="md:col-span-3">
                      <p className="text-[11px] text-white uppercase tracking-wider">{s.date}</p>
                      <p className="text-[10px] text-stone-500">{s.time}</p>
                    </div>
                    <div className="md:col-span-5">
                      <input
                        type="text"
                        defaultValue={s.focus}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== s.focus) setOverride(s.id, { focus: v });
                        }}
                        className="w-full bg-stone-950 border border-stone-800 px-3 py-2 text-white text-xs uppercase tracking-wider"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <p className="text-[10px] text-stone-500">{s.spotsAvailable} left</p>
                    </div>
                    <div className="md:col-span-3 flex gap-2 justify-end">
                      {ov && (
                        <button
                          onClick={() => clearOverride(s.id)}
                          className="text-[9px] uppercase tracking-widest text-stone-500 hover:text-white border border-stone-800 px-2 py-1"
                        >Reset</button>
                      )}
                      <button
                        onClick={() => setOverride(s.id, { cancelled: true })}
                        className="text-[9px] uppercase tracking-widest text-red-500 hover:text-red-300 border border-red-900 px-2 py-1"
                      >Cancel Session</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleManager;
