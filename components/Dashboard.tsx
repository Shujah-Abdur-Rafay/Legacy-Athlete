import React, { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import {
  collection, query, where, orderBy, onSnapshot,
  doc, getDoc, setDoc, Timestamp,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { format, isAfter } from 'date-fns';
import { focusColor } from '../lib/focusColor';
import SharedCalendar from './SharedCalendar';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Booking {
  id: string;
  athlete_name: string;
  email: string;
  focus: string;
  session_date: Timestamp;
  booked_at: Timestamp;
  payment_status: string;
  calendar_event_id?: string;
}


type Tab = 'bookings' | 'calendar' | 'profile';

// ─── Sidebar Nav Icon ─────────────────────────────────────────────────────────
const NavItem: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}> = ({ active, onClick, label, icon }) => (
  <button
    onClick={onClick}
    title={label}
    className={`group relative w-full flex flex-col items-center justify-center py-4 transition-all duration-200
      ${active ? 'text-orange-500' : 'text-stone-600 hover:text-stone-300'}`}
  >
    {active && (
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-orange-500 rounded-r" />
    )}
    {icon}
    <span className="text-[8px] uppercase tracking-widest mt-1.5">{label}</span>
  </button>
);

// ─── Booking Card ─────────────────────────────────────────────────────────────
const BookingCard: React.FC<{ booking: Booking; dimmed?: boolean }> = ({ booking, dimmed }) => {
  const sessionDate = booking.session_date?.toDate();
  const confirmed = booking.payment_status === 'paid' || booking.payment_status === 'succeeded';
  const hasCal = !!booking.calendar_event_id;

  return (
    <div className={`border border-stone-800 bg-stone-900/40 p-5 transition-all ${dimmed ? 'opacity-40' : 'hover:border-stone-700'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium tracking-wide">
            {sessionDate ? format(sessionDate, "EEE, MMM d · h:mm a") : '—'}
          </p>
          <p className={`text-xs uppercase tracking-widest mt-1 ${focusColor(booking.focus)}`}>
            {booking.focus}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`px-2.5 py-1 text-[8px] tracking-widest uppercase font-medium rounded-sm
            ${confirmed ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
            {confirmed ? '● Confirmed' : '○ Pending'}
          </span>
          {hasCal && (
            <span className="px-2.5 py-1 text-[8px] tracking-widest uppercase rounded-sm bg-blue-500/15 text-blue-400">
              ● Cal Synced
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── My Bookings Tab ──────────────────────────────────────────────────────────
const BookingsTab: React.FC<{ onLogout: () => void; onBookSession: () => void }> = ({ onLogout, onBookSession }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(db, 'bookings'),
      where('email', '==', user.email),
      orderBy('session_date', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [user?.email]);

  const now = new Date();
  const upcoming = bookings.filter(b => b.session_date?.toDate() && isAfter(b.session_date.toDate(), now));
  const past = bookings.filter(b => b.session_date?.toDate() && !isAfter(b.session_date.toDate(), now));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-stone-800 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-athletic text-2xl tracking-widest text-white">MY BOOKINGS</h2>
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mt-1">
            {bookings.length} total · {upcoming.length} upcoming
          </p>
        </div>
        <button
          onClick={onBookSession}
          className="flex items-center gap-2 px-5 py-3 bg-white text-black font-athletic text-xs tracking-widest hover:bg-orange-600 hover:text-white transition-all duration-300"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 14v1m8-8h-1M5 12H4m13.657-6.343l-.707.707M6.343 17.657l-.707.707m11.314 0l-.707-.707M6.343 6.343l-.707-.707" />
          </svg>
          BOOK A SESSION
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="border border-dashed border-stone-800 p-16 text-center">
          <div className="w-12 h-12 bg-stone-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-stone-500 text-xs uppercase tracking-widest mb-4">No bookings yet</p>
          <p className="text-stone-600 text-[10px] uppercase tracking-widest mb-6">
            Book your first session to get started
          </p>
          <button
            onClick={onBookSession}
            className="px-8 py-3 bg-orange-600 text-white font-athletic text-xs tracking-widest hover:bg-orange-500 transition-colors"
          >
            BOOK A SESSION →
          </button>
        </div>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[9px] text-orange-500 uppercase tracking-[0.35em] font-bold">Upcoming</span>
                <div className="flex-1 h-px bg-stone-900" />
                <span className="text-[9px] text-stone-600 uppercase tracking-widest">{upcoming.length}</span>
              </div>
              <div className="space-y-3">
                {upcoming.map(b => <BookingCard key={b.id} booking={b} />)}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[9px] text-stone-600 uppercase tracking-[0.35em] font-bold">Past Sessions</span>
                <div className="flex-1 h-px bg-stone-900" />
                <span className="text-[9px] text-stone-700 uppercase tracking-widest">{past.length}</span>
              </div>
              <div className="space-y-3">
                {past.map(b => <BookingCard key={b.id} booking={b} dimmed />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Calendar Tab ─────────────────────────────────────────────────────────────
// Uses the unified SharedCalendar component — same data as admin, read-only for athletes.
const CalendarTab: React.FC = () => <SharedCalendar isAdmin={false} />;

// ─── Profile Tab ──────────────────────────────────────────────────────────────
const ProfileTab: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const user = auth.currentUser;
  const [bookingCount, setBookingCount] = useState(0);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch booking stats
  useEffect(() => {
    if (!user?.email) return;
    const q = query(collection(db, 'bookings'), where('email', '==', user.email));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => d.data());
      setBookingCount(all.length);
      setConfirmedCount(all.filter(b => b.payment_status === 'paid' || b.payment_status === 'succeeded').length);
      setLoadingStats(false);
    }, () => setLoadingStats(false));
    return () => unsub();
  }, [user?.email]);



  const initials = (user?.displayName || user?.email || 'A')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-athletic text-2xl tracking-widest text-white">PROFILE</h2>
        <p className="text-[10px] text-stone-500 uppercase tracking-widest mt-1">Athlete account details</p>
      </div>

      {/* Identity card */}
      <div className="border border-stone-800 bg-stone-900/30 p-6 flex items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-stone-800 border border-stone-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="font-athletic text-lg text-white">{initials}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-athletic text-xl tracking-widest text-white truncate">
            {user?.displayName?.toUpperCase() || 'ATHLETE'}
          </p>
          <p className="text-[10px] text-stone-500 tracking-wider mt-0.5 truncate">{user?.email}</p>
          <p className="text-[9px] text-stone-700 font-mono mt-1 truncate">UID: {user?.uid}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-stone-800 bg-stone-900/30 p-5">
          <p className="text-[9px] text-stone-600 uppercase tracking-[0.35em] mb-2">Total Sessions</p>
          <p className="font-athletic text-4xl text-white">
            {loadingStats ? '—' : bookingCount}
          </p>
          <p className="text-[9px] text-stone-700 uppercase tracking-widest mt-1">All time</p>
        </div>
        <div className="border border-stone-800 bg-stone-900/30 p-5">
          <p className="text-[9px] text-stone-600 uppercase tracking-[0.35em] mb-2">Confirmed</p>
          <p className="font-athletic text-4xl text-orange-500">
            {loadingStats ? '—' : confirmedCount}
          </p>
          <p className="text-[9px] text-stone-700 uppercase tracking-widest mt-1">Paid sessions</p>
        </div>
      </div>


      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full py-4 border border-stone-800 text-stone-500 hover:text-white hover:border-stone-600 transition-colors text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Disconnect Session
      </button>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
interface DashboardProps {
  onLogout: () => void;
  onBackToSite: () => void;
  onBookSession?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout, onBackToSite, onBookSession }) => {
  const goToBookings = onBookSession || onBackToSite;
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('bookings');
  const user = auth.currentUser;

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.dash-panel',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [activeTab]);

  const initials = (user?.displayName || user?.email || 'A')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'bookings',
      label: 'Sessions',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-stone-950 text-white flex">
      {/* Background accent */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[140px] pointer-events-none" />

      {/* ── Sidebar ── */}
      <aside className="w-[70px] md:w-20 border-r border-stone-900 flex flex-col items-center py-6 sticky top-0 h-screen z-20 bg-stone-950 flex-shrink-0">
        {/* Logo mark */}
        <div className="w-8 h-8 bg-orange-600 flex items-center justify-center mb-8 flex-shrink-0">
          <span className="text-white font-bold text-xs">L</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col w-full">
          {tabs.map(t => (
            <NavItem
              key={t.id}
              active={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              label={t.label}
              icon={t.icon}
            />
          ))}
        </nav>

        {/* Back to site */}
        <button
          onClick={onBackToSite}
          title="Back to Site"
          className="mb-4 w-full flex flex-col items-center justify-center py-3 text-stone-600 hover:text-stone-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[7px] uppercase tracking-widest mt-1">Site</span>
        </button>

        {/* Avatar at bottom */}
        <div className="w-9 h-9 rounded-full bg-stone-800 border border-stone-700 overflow-hidden flex items-center justify-center flex-shrink-0">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold text-stone-400">{initials}</span>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <header className="border-b border-stone-900 px-8 py-5 flex justify-between items-center bg-stone-950/80 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-athletic text-lg tracking-tighter text-white">LEGACY</span>
              <div className="w-1 h-1 bg-orange-600 rounded-full" />
              <span className="text-[9px] text-stone-600 uppercase tracking-[0.4em]">
                {activeTab === 'bookings' ? 'My Sessions' : activeTab === 'calendar' ? 'Team Calendar' : 'Profile'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] text-stone-600 uppercase tracking-widest">Athlete</p>
              <p className="text-[11px] text-stone-300 tracking-wide truncate max-w-[160px]">
                {user?.displayName || user?.email}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 overflow-hidden flex items-center justify-center flex-shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold text-white">{initials}</span>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8 md:p-10">
          <div className="dash-panel max-w-3xl mx-auto">
            {activeTab === 'bookings' && <BookingsTab onLogout={onLogout} onBookSession={goToBookings} />}
            {activeTab === 'calendar' && <CalendarTab />}
            {activeTab === 'profile' && <ProfileTab onLogout={onLogout} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
