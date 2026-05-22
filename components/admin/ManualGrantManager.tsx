import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';

interface Pkg {
  id: string;
  name: string;
  priceCents: number;
  active: boolean;
  hidden?: boolean;
}

interface AddonConfig {
  dropInCents: number;
  defaultCents: number;
}

interface Grant {
  id: string;
  email: string;
  planName: string;
  packageId: string;
  amount: number;
  baseAmount?: number;
  discountPercent?: number;
  discountAmount?: number;
  eightWeekDiscount?: number;
  is8Week?: boolean;
  addPerformance?: boolean;
  paymentMethod?: string;
  notes?: string;
  grantedByAdmin?: string;
  purchasedAt?: any;
  status?: string;
  manualGrant?: boolean;
}

const FN_BASE = import.meta.env.VITE_FUNCTIONS_URL || '';
const getApiUrl = (endpoint: string) => FN_BASE ? `${FN_BASE}/${endpoint}` : `/api/${endpoint}`;

const PRESET_DISCOUNTS = [0, 5, 10, 15, 20, 25, 50];

const ManualGrantManager: React.FC = () => {
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [addonConfig, setAddonConfig] = useState<AddonConfig>({ dropInCents: 0, defaultCents: 0 });
  const [grants, setGrants] = useState<Grant[]>([]);

  const [email, setEmail] = useState('');
  const [packageId, setPackageId] = useState('');
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [customDiscount, setCustomDiscount] = useState<string>('');
  const [addPerformance, setAddPerformance] = useState(false);
  const [is8Week, setIs8Week] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'zelle' | 'venmo' | 'check' | 'other'>('cash');
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'packages'), (snap) => {
      const list: Pkg[] = [];
      snap.docs.forEach((d) => {
        const data: any = d.data();
        if (d.id === 'performance-addon-config') {
          setAddonConfig({
            dropInCents: data.dropInCents || 0,
            defaultCents: data.defaultCents || 0,
          });
          return;
        }
        list.push({
          id: d.id,
          name: data.name || d.id,
          priceCents: data.priceCents || 0,
          active: data.active !== false,
          hidden: !!data.hidden,
        });
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      setPkgs(list.filter((p) => !p.hidden));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'plan_purchases'),
      where('manualGrant', '==', true),
      orderBy('purchasedAt', 'desc'),
      limit(50),
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Grant[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setGrants(list);
    }, (err) => {
      console.warn('grants subscription error', err);
    });
    return () => unsub();
  }, []);

  const selected = pkgs.find((p) => p.id === packageId);
  const effectiveDiscount = customDiscount !== '' ? Math.max(0, Math.min(100, Number(customDiscount) || 0)) : discountPct;

  const pricing = useMemo(() => {
    if (!selected) return null;
    const base = selected.priceCents;
    const perf = (addPerformance && selected.id !== 'performance-solo')
      ? (selected.id === 'drop-in' ? addonConfig.dropInCents : addonConfig.defaultCents)
      : 0;
    const months = (is8Week && selected.id !== 'drop-in') ? 2 : 1;
    const subtotal = (base + perf) * months;
    const eightWeekDiscount = (is8Week && selected.id !== 'drop-in') ? Math.round(subtotal * 0.10) : 0;
    const afterEightWeek = subtotal - eightWeekDiscount;
    const manualDiscount = Math.round(afterEightWeek * effectiveDiscount / 100);
    const final = afterEightWeek - manualDiscount;
    return { base, perf, months, subtotal, eightWeekDiscount, manualDiscount, final };
  }, [selected, addPerformance, is8Week, effectiveDiscount, addonConfig]);

  const flash = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const submit = async () => {
    if (!email.trim()) { flash('err', 'Email required'); return; }
    if (!packageId) { flash('err', 'Pick a package'); return; }
    setBusy(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Not signed in');
      const r = await fetch(getApiUrl('adminGrantPackage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          email: email.trim(),
          packageId,
          discountPercent: effectiveDiscount,
          addPerformance,
          is8Week,
          paymentMethod,
          notes: notes.trim(),
          sendEmail,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Request failed');
      flash('ok', `Granted ${data.planName} to ${email.trim()} — $${(data.finalAmount / 100).toFixed(2)}${data.userFound ? '' : ' (user not signed up yet — will sync on signup)'}`);
      setEmail('');
      setNotes('');
      setDiscountPct(0);
      setCustomDiscount('');
      setAddPerformance(false);
      setIs8Week(false);
      setPackageId('');
    } catch (e: any) {
      flash('err', e.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (grantId: string) => {
    if (!confirm('Revoke this grant? The athlete will no longer see it as active.')) return;
    setBusy(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const r = await fetch(getApiUrl('adminRevokePackage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ grantId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Revoke failed');
      flash('ok', 'Grant revoked');
    } catch (e: any) {
      flash('err', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      {msg && (
        <div className={`px-4 py-3 text-[10px] uppercase tracking-widest border ${
          msg.kind === 'ok'
            ? 'bg-green-950/40 border-green-800 text-green-400'
            : 'bg-red-950/40 border-red-800 text-red-400'
        }`}>
          {msg.text}
        </div>
      )}

      {/* ── Grant form ── */}
      <div className="bg-stone-950 border border-stone-800">
        <div className="px-8 py-6 border-b border-stone-900">
          <h2 className="font-athletic text-lg tracking-widest text-white">MANUAL PACKAGE GRANT</h2>
          <p className="text-[9px] text-stone-600 uppercase tracking-widest mt-1">
            Activate a package for an athlete who paid cash (or by any non-Stripe method). Discount optional.
          </p>
        </div>

        <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <label className="block">
            <span className="text-[9px] text-stone-600 uppercase tracking-widest">Athlete email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="athlete@example.com"
              className="mt-1 w-full bg-stone-900 border border-stone-800 px-3 py-2 text-white text-xs"
            />
          </label>

          <label className="block">
            <span className="text-[9px] text-stone-600 uppercase tracking-widest">Package</span>
            <select
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              className="mt-1 w-full bg-stone-900 border border-stone-800 px-3 py-2 text-white text-xs"
            >
              <option value="">— Select a package —</option>
              {pkgs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ${(p.priceCents / 100).toFixed(2)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[9px] text-stone-600 uppercase tracking-widest">Payment method</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="mt-1 w-full bg-stone-900 border border-stone-800 px-3 py-2 text-white text-xs"
            >
              <option value="cash">Cash</option>
              <option value="zelle">Zelle</option>
              <option value="venmo">Venmo</option>
              <option value="check">Check</option>
              <option value="other">Other</option>
            </select>
          </label>

          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-[10px] text-stone-300 uppercase tracking-widest">
              <input type="checkbox" checked={is8Week} onChange={(e) => setIs8Week(e.target.checked)} />
              8-week bundle (×2 months, −10%)
            </label>
            <label className="flex items-center gap-2 text-[10px] text-stone-300 uppercase tracking-widest">
              <input type="checkbox" checked={addPerformance} onChange={(e) => setAddPerformance(e.target.checked)} />
              Performance add-on
            </label>
          </div>
        </div>

        <div className="px-8 pb-2">
          <span className="text-[9px] text-stone-600 uppercase tracking-widest">Discount</span>
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            {PRESET_DISCOUNTS.map((d) => (
              <button
                key={d}
                onClick={() => { setDiscountPct(d); setCustomDiscount(''); }}
                className={`px-3 py-1.5 text-[10px] uppercase tracking-widest border transition-colors ${
                  customDiscount === '' && discountPct === d
                    ? 'bg-orange-600 border-orange-600 text-white'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                {d === 0 ? 'None' : `${d}%`}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-2">
              <span className="text-[9px] text-stone-600 uppercase tracking-widest">Custom</span>
              <input
                type="number"
                min={0}
                max={100}
                value={customDiscount}
                onChange={(e) => setCustomDiscount(e.target.value)}
                placeholder="0"
                className="w-20 bg-stone-900 border border-stone-800 px-3 py-1.5 text-white text-xs"
              />
              <span className="text-[10px] text-stone-500">%</span>
            </div>
          </div>
        </div>

        <div className="px-8 py-5">
          <label className="block">
            <span className="text-[9px] text-stone-600 uppercase tracking-widest">Notes (internal)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Paid $250 cash on 2026-05-23"
              className="mt-1 w-full bg-stone-900 border border-stone-800 px-3 py-2 text-white text-xs"
            />
          </label>
        </div>

        {/* Pricing preview */}
        {pricing && (
          <div className="px-8 py-5 border-t border-stone-900 bg-stone-950/60">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] tracking-widest uppercase">
              <div>
                <p className="text-stone-600">Subtotal</p>
                <p className="text-white text-base font-athletic">${(pricing.subtotal / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-stone-600">8-week off</p>
                <p className="text-stone-300 text-base font-athletic">−${(pricing.eightWeekDiscount / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-stone-600">Discount ({effectiveDiscount}%)</p>
                <p className="text-stone-300 text-base font-athletic">−${(pricing.manualDiscount / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-orange-500">Final</p>
                <p className="text-orange-400 text-base font-athletic">${(pricing.final / 100).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="px-8 py-5 border-t border-stone-900 flex items-center justify-between gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-[10px] text-stone-400 uppercase tracking-widest">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            Email athlete + coach receipt
          </label>
          <button
            onClick={submit}
            disabled={busy || !email || !packageId}
            className="px-6 py-2.5 bg-white text-black text-[10px] uppercase tracking-widest font-medium hover:bg-orange-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? 'Granting…' : 'Grant Package'}
          </button>
        </div>
      </div>

      {/* ── Recent grants ── */}
      <div className="bg-stone-950 border border-stone-800">
        <div className="px-8 py-6 border-b border-stone-900">
          <h2 className="font-athletic text-lg tracking-widest text-white">RECENT MANUAL GRANTS</h2>
          <p className="text-[9px] text-stone-600 uppercase tracking-widest mt-1">
            Last 50 manual grants — sync to user's dashboard once they sign in with the same email.
          </p>
        </div>
        {grants.length === 0 ? (
          <p className="px-8 py-6 text-[10px] text-stone-700 uppercase tracking-widest">No manual grants yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-900">
                  {['When', 'Athlete', 'Package', 'Discount', 'Amount', 'Method', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[9px] text-stone-600 uppercase tracking-[0.3em] font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => {
                  const when = g.purchasedAt?.toDate ? g.purchasedAt.toDate() : null;
                  const revoked = g.status === 'revoked';
                  return (
                    <tr key={g.id} className={`border-b border-stone-900/60 ${revoked ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-[10px] text-stone-400">
                        {when ? when.toLocaleDateString() : '—'}
                        <p className="text-[9px] text-stone-700">{when ? when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-white">{g.email}</td>
                      <td className="px-4 py-3 text-[11px] text-orange-400">
                        {g.planName}
                        {g.is8Week && <span className="ml-1 text-[8px] text-stone-500 uppercase">·8wk</span>}
                        {g.addPerformance && <span className="ml-1 text-[8px] text-stone-500 uppercase">·perf</span>}
                      </td>
                      <td className="px-4 py-3 text-[10px] text-stone-400">{g.discountPercent || 0}%</td>
                      <td className="px-4 py-3 text-[11px] text-white">${((g.amount || 0) / 100).toFixed(2)}</td>
                      <td className="px-4 py-3 text-[10px] text-stone-500 uppercase">{g.paymentMethod || 'cash'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] uppercase tracking-widest px-2 py-1 rounded-sm ${
                          revoked
                            ? 'bg-stone-800 text-stone-500'
                            : 'bg-green-500/15 text-green-400'
                        }`}>
                          {revoked ? 'Revoked' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!revoked && (
                          <button
                            onClick={() => revoke(g.id)}
                            disabled={busy}
                            className="text-[9px] uppercase tracking-widest text-red-500 hover:text-red-300 border border-red-900 px-2 py-1"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualGrantManager;
