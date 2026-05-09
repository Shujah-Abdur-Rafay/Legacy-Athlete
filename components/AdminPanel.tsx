
import React, { useEffect, useState, useCallback } from 'react';
import {
  collection, query, getDocs, orderBy, Timestamp, doc, getDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { format } from 'date-fns';
import SharedCalendar from './SharedCalendar';
import ScheduleManager from './admin/ScheduleManager';
import PackageManager from './admin/PackageManager';
import EventManager from './admin/EventManager';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Booking {
  id: string;
  athlete_name: string;
  email: string;
  focus: string;
  session_date: Timestamp;
  booked_at: Timestamp;
  payment_status: string;
  calendar_event_id: string;
  cancellation_token: string;
}


// ─── Constants ────────────────────────────────────────────────────────────────
const FN_BASE = import.meta.env.VITE_FUNCTIONS_URL || '';
const getApiUrl = (endpoint: string) => FN_BASE ? `${FN_BASE}/${endpoint}` : `/api/${endpoint}`;

// ─── Stat Card ────────────────────────────────────────────────────────────────
const Stat: React.FC<{ label: string; value: string | number; sub: string; accent?: boolean }> = ({
  label, value, sub, accent
}) => (
  <div className="bg-stone-950 border border-stone-800 p-8 hover:border-orange-500/40 transition-colors group">
    <p className="text-[9px] text-stone-600 uppercase tracking-[0.35em] mb-4">{label}</p>
    <p className={`font-athletic text-5xl mb-2 transition-colors ${accent ? 'text-orange-500' : 'text-white group-hover:text-orange-500'}`}>
      {value}
    </p>
    <p className="text-[9px] text-stone-700 uppercase tracking-widest">{sub}</p>
  </div>
);

// CalendarConnect replaced by SharedCalendar (service account — no manual OAuth needed)

// ─── Booking Row ──────────────────────────────────────────────────────────────
const BookingRow: React.FC<{ booking: Booking }> = ({ booking }) => {
  const sessionDate = booking.session_date?.toDate();
  const bookedAt = booking.booked_at?.toDate();
  const confirmed = booking.payment_status === 'paid' || booking.payment_status === 'succeeded';
  const hasCalendar = !!booking.calendar_event_id;

  return (
    <tr className="group hover:bg-stone-900/60 transition-colors border-b border-stone-900/60">
      <td className="py-5 pr-6">
        <p className="text-[11px] text-stone-400 tracking-wider">
          {bookedAt ? format(bookedAt, 'MMM d') : '—'}
        </p>
        <p className="text-[9px] text-stone-700 tracking-widest">
          {bookedAt ? format(bookedAt, 'HH:mm') : ''}
        </p>
      </td>
      <td className="py-5 pr-6">
        <p className="text-[12px] text-white uppercase tracking-widest font-medium">{booking.athlete_name}</p>
        <p className="text-[10px] text-stone-600 lowercase mt-0.5">{booking.email}</p>
      </td>
      <td className="py-5 pr-6">
        <p className="text-[11px] text-white uppercase tracking-wide">
          {sessionDate ? format(sessionDate, 'EEE, MMM d') : '—'}
        </p>
        <p className="text-[10px] text-orange-600 uppercase tracking-tighter mt-0.5">
          {booking.focus}
        </p>
      </td>
      <td className="py-5 pr-6">
        <div className="flex flex-col space-y-1.5">
          <span className={`inline-flex w-fit px-2.5 py-1 text-[8px] tracking-widest uppercase rounded-sm font-medium ${
            confirmed ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'
          }`}>
            {confirmed ? '● Paid' : '○ Pending'}
          </span>
          <span className={`inline-flex w-fit px-2.5 py-1 text-[8px] tracking-widest uppercase rounded-sm ${
            hasCalendar ? 'bg-blue-500/15 text-blue-400' : 'bg-stone-800 text-stone-600'
          }`}>
            {hasCalendar ? '● Cal Synced' : '○ No Cal'}
          </span>
        </div>
      </td>
    </tr>
  );
};

// ─── Main AdminPanel ──────────────────────────────────────────────────────────
const AdminPanel: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bookings' | 'calendar' | 'schedule' | 'packages' | 'events' | 'analytics'>('bookings');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'bookings'), orderBy('booked_at', 'desc'));
      const snap = await getDocs(q);
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const totalRevenue = bookings
    .filter(b => b.payment_status === 'paid' || b.payment_status === 'succeeded')
    .length * 9700; // $97 per session (adjust to your actual price)

  const calendarSynced = bookings.filter(b => b.calendar_event_id).length;

  const tabs = [
    { id: 'bookings', label: 'Bookings' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'packages', label: 'Packages' },
    { id: 'events', label: 'Events' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'analytics', label: 'Analytics' },
  ] as const;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Sidebar + Content layout ── */}
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className="w-20 border-r border-stone-900 flex flex-col items-center py-8 space-y-8 sticky top-0 h-screen">
          {/* Logo mark */}
          <div className="w-8 h-8 bg-orange-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">L</span>
          </div>
          <div className="flex-1" />
          <button onClick={() => signOut(auth)} className="text-stone-700 hover:text-white transition-colors" title="Sign out">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="border-b border-stone-900 px-10 py-6 flex justify-between items-center">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-athletic text-xl tracking-tighter text-white">LEGACY</span>
                <div className="w-1 h-1 bg-orange-600 rounded-full"></div>
                <span className="text-[10px] text-stone-600 uppercase tracking-[0.4em]">Command Center</span>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-[8px] text-stone-600 uppercase tracking-widest">Signed in as</p>
                <p className="text-[11px] text-stone-300 tracking-wide">{auth.currentUser?.email}</p>
              </div>
              <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                <span className="text-[11px] font-bold text-white uppercase">
                  {auth.currentUser?.email?.[0] || 'A'}
                </span>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-10">
            {/* Page title + tabs */}
            <div className="mb-10">
              <h1 className="font-athletic text-4xl tracking-tight text-white mb-6">Admin Dashboard</h1>
              <div className="flex space-x-1 bg-stone-950 border border-stone-900 p-1 w-fit rounded-sm">
                {tabs.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`px-6 py-2 text-[10px] uppercase tracking-widest transition-all ${
                      activeTab === id
                        ? 'bg-white text-black font-medium'
                        : 'text-stone-600 hover:text-stone-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Bookings Tab ── */}
            {activeTab === 'bookings' && (
              <div className="space-y-8">
                {/* Quick stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Stat label="Total Bookings" value={bookings.length} sub="All time" />
                  <Stat label="Confirmed" value={bookings.filter(b => b.payment_status === 'paid' || b.payment_status === 'succeeded').length} sub="Paid sessions" accent />
                  <Stat label="Calendar Synced" value={calendarSynced} sub="Events created" />
                  <Stat label="Athletes" value={new Set(bookings.map(b => b.email)).size} sub="Unique" />
                </div>

                {/* Bookings table */}
                <div className="bg-stone-950 border border-stone-800">
                  <div className="flex justify-between items-center px-8 py-6 border-b border-stone-900">
                    <h2 className="font-athletic text-lg tracking-widest text-white">RECENT BOOKINGS</h2>
                    <button
                      onClick={fetchBookings}
                      className="text-[9px] text-stone-600 hover:text-white uppercase tracking-[0.3em] transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Refresh</span>
                    </button>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="w-8 h-8 border-2 border-stone-800 border-t-orange-600 rounded-full animate-spin" />
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="py-20 text-center">
                      <p className="text-stone-700 text-[11px] uppercase tracking-[0.3em]">No bookings recorded yet</p>
                    </div>
                  ) : (
                    <div className="px-8 overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-stone-900">
                            {['Booked At', 'Athlete', 'Session', 'Status'].map(h => (
                              <th key={h} className="text-left py-4 pr-6 text-[9px] text-stone-600 uppercase tracking-[0.3em] font-normal">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.map(b => <BookingRow key={b.id} booking={b} />)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Calendar Tab ── */}
            {activeTab === 'calendar' && <SharedCalendar isAdmin={true} />}

            {/* ── Schedule Tab ── */}
            {activeTab === 'schedule' && <ScheduleManager />}

            {/* ── Packages Tab ── */}
            {activeTab === 'packages' && <PackageManager />}

            {/* ── Events Tab ── */}
            {activeTab === 'events' && <EventManager />}

            {/* ── Analytics Tab ── */}
            {activeTab === 'analytics' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Stat
                    label="Estimated Revenue"
                    value={`$${(totalRevenue / 100).toLocaleString()}`}
                    sub="Based on $97/session"
                    accent
                  />
                  <Stat
                    label="Unique Athletes"
                    value={new Set(bookings.map(b => b.email)).size}
                    sub="Distinct emails"
                  />
                  <Stat
                    label="Cal Sync Rate"
                    value={bookings.length > 0 ? `${Math.round(calendarSynced / bookings.length * 100)}%` : '—'}
                    sub="Events successfully created"
                  />
                </div>

                {/* Focus distribution */}
                <div className="bg-stone-950 border border-stone-800 p-8">
                  <h2 className="font-athletic text-lg tracking-widest text-white mb-6">SESSION BREAKDOWN</h2>
                  {(() => {
                    const focusCounts: Record<string, number> = {};
                    bookings.forEach(b => {
                      const key = b.focus || 'Unknown';
                      focusCounts[key] = (focusCounts[key] || 0) + 1;
                    });
                    const sorted = Object.entries(focusCounts).sort((a, b) => b[1] - a[1]);
                    const max = sorted[0]?.[1] || 1;
                    return sorted.length === 0 ? (
                      <p className="text-stone-700 text-[11px] uppercase tracking-widest">No data yet</p>
                    ) : (
                      <div className="space-y-4">
                        {sorted.map(([focus, count]) => (
                          <div key={focus}>
                            <div className="flex justify-between items-center mb-1.5">
                              <p className="text-[10px] text-stone-400 uppercase tracking-widest">{focus}</p>
                              <p className="text-[10px] text-stone-600">{count} booking{count !== 1 ? 's' : ''}</p>
                            </div>
                            <div className="h-1 bg-stone-900 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-600 rounded-full transition-all duration-700"
                                style={{ width: `${(count / max) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
