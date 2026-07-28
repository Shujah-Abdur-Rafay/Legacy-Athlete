import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { format, isAfter } from 'date-fns';
import { focusColor } from '../lib/focusColor';
import { CalendarClock, LayoutDashboard, Clock } from 'lucide-react';

interface Booking {
  id: string;
  focus: string;
  session_date: Timestamp;
  payment_status: string;
}

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

interface MemberPortalProps {
  onConsoleClick: () => void;
}

const MemberPortal: React.FC<MemberPortalProps> = ({ onConsoleClick }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    const q = query(
      collection(db, 'bookings'),
      where('email', '==', user.email),
      orderBy('session_date', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user?.email]);

  const now = new Date();
  const upcoming = bookings.filter(b => b.session_date?.toDate() && isAfter(b.session_date.toDate(), now));
  const nextSession = upcoming[0];

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Athlete';

  return (
    <section className="py-20 px-8 bg-black border-b border-stone-900">
      <div className="max-w-7xl mx-auto">
        <div className="bg-stone-900/30 border border-stone-800 rounded-lg p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b border-stone-800">
            <div>
              <span className="text-[10px] tracking-[0.4em] text-orange-500 uppercase block mb-2">Welcome Back</span>
              <h2 className="font-athletic text-3xl md:text-4xl text-white uppercase">{displayName}</h2>
            </div>
            <button
              onClick={onConsoleClick}
              className="flex items-center gap-2 px-6 py-3 bg-white text-black font-athletic text-xs tracking-widest hover:bg-orange-600 hover:text-white transition-all duration-300 flex-shrink-0"
            >
              <LayoutDashboard className="w-4 h-4" />
              OPEN FULL CONSOLE
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="bg-stone-950 border border-stone-800 p-5">
                <p className="text-[9px] text-stone-600 uppercase tracking-[0.3em] mb-2">Total Sessions</p>
                <p className="font-athletic text-3xl text-white">{loading ? '—' : bookings.length}</p>
              </div>
              <div className="bg-stone-950 border border-stone-800 p-5">
                <p className="text-[9px] text-stone-600 uppercase tracking-[0.3em] mb-2">Upcoming</p>
                <p className="font-athletic text-3xl text-orange-500">{loading ? '—' : upcoming.length}</p>
              </div>
            </div>

            {/* Next session */}
            <div className="lg:col-span-2 bg-stone-950 border border-stone-800 p-6 flex flex-col justify-center">
              <span className="text-[9px] text-stone-600 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                <CalendarClock className="w-3.5 h-3.5" /> Next Session
              </span>
              {loading ? (
                <div className="w-5 h-5 border-2 border-stone-800 border-t-orange-600 rounded-full animate-spin" />
              ) : nextSession ? (
                <div>
                  <p className="text-white text-lg font-medium">
                    {format(nextSession.session_date.toDate(), "EEEE, MMM d · h:mm a")}
                  </p>
                  <p className={`text-xs uppercase tracking-widest mt-1 ${focusColor(nextSession.focus)}`}>
                    {nextSession.focus}
                  </p>
                </div>
              ) : (
                <p className="text-stone-500 text-sm">No upcoming sessions booked yet.</p>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-8 border-t border-stone-800">
            <button
              onClick={() => scrollTo('apply')}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border border-orange-600/60 text-orange-500 text-xs uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all duration-300"
            >
              <Clock className="w-4 h-4" /> Book / Reschedule Session
            </button>
            <button
              onClick={() => scrollTo('weekly-schedule')}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border border-stone-800 text-stone-300 text-xs uppercase tracking-widest hover:border-stone-600 hover:text-white transition-all duration-300"
            >
              View Weekly Schedule
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MemberPortal;
