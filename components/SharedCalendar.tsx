import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday,
  parseISO,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { auth } from '../lib/firebase';

// ─── Constants ────────────────────────────────────────────────────────────────
const FN_BASE = import.meta.env.VITE_FUNCTIONS_URL || '';
const getApiUrl = (endpoint: string) =>
  FN_BASE ? `${FN_BASE}/${endpoint}` : `/api/${endpoint}`;

const CST_TZ = 'America/Chicago';
const POLL_INTERVAL_MS = 30_000; // 30 seconds

// Booking events use orange (colorId 6)
const COLOR_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  '1':  { bg: 'bg-blue-500/20',    text: 'text-blue-300',    dot: 'bg-blue-400' },
  '2':  { bg: 'bg-green-500/20',   text: 'text-green-300',   dot: 'bg-green-400' },
  '3':  { bg: 'bg-purple-500/20',  text: 'text-purple-300',  dot: 'bg-purple-400' },
  '4':  { bg: 'bg-red-500/20',     text: 'text-red-300',     dot: 'bg-red-400' },
  '5':  { bg: 'bg-yellow-500/20',  text: 'text-yellow-300',  dot: 'bg-yellow-400' },
  '6':  { bg: 'bg-orange-500/20',  text: 'text-orange-300',  dot: 'bg-orange-400' },
  '7':  { bg: 'bg-cyan-500/20',    text: 'text-cyan-300',    dot: 'bg-cyan-400' },
  '8':  { bg: 'bg-stone-500/20',   text: 'text-stone-300',   dot: 'bg-stone-400' },
  '9':  { bg: 'bg-indigo-500/20',  text: 'text-indigo-300',  dot: 'bg-indigo-400' },
  '10': { bg: 'bg-emerald-500/20', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  '11': { bg: 'bg-rose-500/20',    text: 'text-rose-300',    dot: 'bg-rose-400' },
};

const getColor = (colorId?: string) => COLOR_MAP[colorId || '6'] || COLOR_MAP['6'];

// ─── Types ────────────────────────────────────────────────────────────────────
interface CalEvent {
  id: string;
  summary: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  colorId?: string;
  status?: string;
}

interface SharedCalendarProps {
  isAdmin?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getEventDate(event: CalEvent): Date | null {
  const raw = event.start?.dateTime || event.start?.date;
  if (!raw) return null;
  try { return parseISO(raw); } catch { return null; }
}

function formatEventTime(event: CalEvent): string {
  const start = event.start?.dateTime;
  const end = event.end?.dateTime;
  if (!start) return event.start?.date || '';
  try {
    const s = toZonedTime(parseISO(start), CST_TZ);
    const e = end ? toZonedTime(parseISO(end), CST_TZ) : null;
    return e
      ? `${format(s, 'h:mm a')} – ${format(e, 'h:mm a')} CST`
      : format(s, 'h:mm a') + ' CST';
  } catch { return ''; }
}

// ─── Event Detail Panel ───────────────────────────────────────────────────────
const EventDetail: React.FC<{
  event: CalEvent;
  onClose: () => void;
}> = ({ event, onClose }) => {
  const color = getColor(event.colorId);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-stone-950 border border-stone-800 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-600 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-[9px] uppercase tracking-widest ${color.bg} ${color.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
          Session Booking
        </div>

        <h3 className="font-athletic text-xl tracking-widest text-white">{event.summary}</h3>

        <div className="space-y-2 border-t border-stone-800 pt-4">
          <div className="flex items-start gap-3">
            <svg className="w-4 h-4 text-stone-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-stone-300 text-xs tracking-wider">{formatEventTime(event)}</p>
          </div>
          {event.description && (
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-stone-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h8" />
              </svg>
              <p className="text-stone-400 text-xs leading-relaxed whitespace-pre-line">{event.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Day Cell ─────────────────────────────────────────────────────────────────
const DayCell: React.FC<{
  date: Date;
  currentMonth: Date;
  events: CalEvent[];
  isSelected: boolean;
  onClick: () => void;
}> = ({ date, currentMonth, events, isSelected, onClick }) => {
  const inMonth = isSameMonth(date, currentMonth);
  const today = isToday(date);
  const MAX_DOTS = 3;

  return (
    <button
      onClick={onClick}
      className={`
        relative min-h-[52px] p-1.5 text-left border-b border-r border-stone-900/50 transition-colors
        ${inMonth ? 'bg-transparent hover:bg-stone-900/40' : 'bg-stone-950/30'}
        ${isSelected ? 'ring-1 ring-inset ring-orange-500' : ''}
      `}
    >
      <span className={`
        inline-flex w-6 h-6 items-center justify-center text-[11px] font-medium rounded-full transition-colors
        ${today ? 'bg-orange-600 text-white' : ''}
        ${!today && inMonth ? 'text-stone-300' : ''}
        ${!today && !inMonth ? 'text-stone-700' : ''}
      `}>
        {format(date, 'd')}
      </span>

      {events.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mt-1">
          {events.slice(0, MAX_DOTS).map((ev) => {
            const color = getColor(ev.colorId);
            return (
              <span
                key={ev.id}
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.dot}`}
              />
            );
          })}
          {events.length > MAX_DOTS && (
            <span className="text-[8px] text-stone-600 leading-none mt-px">+{events.length - MAX_DOTS}</span>
          )}
        </div>
      )}
    </button>
  );
};

// ─── Main SharedCalendar Component ────────────────────────────────────────────
// Read-only for all roles. Events are auto-generated from confirmed bookings only.
const SharedCalendar: React.FC<SharedCalendarProps> = ({ isAdmin = false }) => {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch events ────────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      const r = await fetch(getApiUrl('getSharedCalendarEvents'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setEvents(data.events || []);
      setLastSync(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    pollingRef.current = setInterval(() => fetchEvents(true), POLL_INTERVAL_MS);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchEvents]);

  // ── Calendar grid ───────────────────────────────────────────────────────────
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const gridDays: Date[] = [];
  let cur = gridStart;
  while (cur <= gridEnd) { gridDays.push(cur); cur = addDays(cur, 1); }

  // ── Group events by day ──────────────────────────────────────────────────────
  const eventsByDay: Record<string, CalEvent[]> = {};
  events.forEach((ev) => {
    const d = getEventDate(ev);
    if (!d) return;
    const key = format(d, 'yyyy-MM-dd');
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(ev);
  });

  const selectedDayKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const selectedDayEvents = selectedDayKey ? (eventsByDay[selectedDayKey] || []) : [];

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-athletic text-2xl tracking-widest text-white">BOOKING CALENDAR</h2>
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mt-1">
            {isAdmin
              ? 'Live activity feed · auto-updated from confirmed bookings'
              : 'Session schedule · entries appear when bookings are confirmed'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="hidden sm:block text-[9px] text-stone-700 uppercase tracking-widest">
              Synced {format(lastSync, 'h:mm a')}
            </span>
          )}
          <button
            onClick={() => fetchEvents()}
            disabled={loading}
            title="Refresh"
            className="p-2 border border-stone-800 text-stone-500 hover:text-white hover:border-stone-600 transition-colors"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="border border-red-800 bg-red-950/30 px-5 py-3 text-red-400 text-xs tracking-wider">
          {error} —{' '}
          <button onClick={() => fetchEvents()} className="underline hover:text-red-300">retry</button>
        </div>
      )}

      {/* Calendar card */}
      <div className="border border-stone-800 bg-stone-950/20">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="p-1.5 text-stone-500 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="font-athletic text-lg tracking-widest text-white">
            {format(currentMonth, 'MMMM yyyy').toUpperCase()}
          </span>

          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="p-1.5 text-stone-500 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-stone-800">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              className="py-2 text-center text-[9px] uppercase tracking-[0.25em] text-stone-600 border-r border-stone-900/50 last:border-r-0"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading && events.length === 0 ? (
          <div className="flex items-center justify-center h-52">
            <div className="w-6 h-6 border-2 border-stone-800 border-t-orange-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {gridDays.map((day, idx) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDay[key] || [];
              const isSel = selectedDate ? isSameDay(day, selectedDate) : false;
              return (
                <DayCell
                  key={idx}
                  date={day}
                  currentMonth={currentMonth}
                  events={dayEvents}
                  isSelected={isSel}
                  onClick={() => setSelectedDate(isSel ? null : day)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Selected day events */}
      {selectedDate && (
        <div className="border border-stone-800 bg-stone-900/20 p-5 space-y-3">
          <div>
            <p className="font-athletic text-base tracking-widest text-white">
              {format(selectedDate, 'EEEE, MMMM d, yyyy').toUpperCase()}
            </p>
            <p className="text-[9px] text-stone-600 uppercase tracking-widest mt-0.5">
              {selectedDayEvents.length} booking{selectedDayEvents.length !== 1 ? 's' : ''}
            </p>
          </div>

          {selectedDayEvents.length === 0 ? (
            <p className="text-stone-600 text-[10px] uppercase tracking-widest py-4 text-center">
              No bookings on this day
            </p>
          ) : (
            <div className="space-y-2">
              {selectedDayEvents.map((ev) => {
                const color = getColor(ev.colorId);
                return (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className={`w-full text-left flex items-start gap-3 p-3 border border-stone-800 hover:border-stone-700 transition-colors ${color.bg}`}
                  >
                    <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${color.dot}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-medium tracking-wider truncate ${color.text}`}>
                        {ev.summary}
                      </p>
                      <p className="text-[10px] text-stone-500 mt-0.5">{formatEventTime(ev)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="border border-stone-800 bg-stone-900/20 px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <p className="text-[9px] text-stone-600 uppercase tracking-[0.3em]">Legend</p>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0 bg-orange-400" />
          <span className="text-[9px] text-stone-400 uppercase tracking-widest">Session Booking</span>
        </div>
        <p className="text-[9px] text-stone-700 uppercase tracking-widest">
          Entries auto-created from confirmed bookings · cancelled bookings are removed
        </p>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[9px] text-stone-600 uppercase tracking-widest">
            Live · refreshes every 30s
          </span>
        </div>
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
};

export default SharedCalendar;
