import React from 'react';

/**
 * AppShowcase — a self-contained, on-brand rendering of the Legacy Athlete
 * mobile app (three phones: dashboard, live workout, performance feed).
 *
 * Built entirely in markup/SVG — no external image, so it's crisp at any size
 * and safe under the site's strict Content-Security-Policy. Drop in real app
 * screenshots later by replacing each screen's inner JSX.
 */

const PhoneFrame: React.FC<{ children: React.ReactNode; className?: string; floatDelay?: string }> = ({
  children,
  className = '',
  floatDelay = '0s',
}) => (
  <div
    className={`la-float-anim relative rounded-[1.5rem] bg-zinc-900 p-[3px] ring-1 ring-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] ${className}`}
    style={{ aspectRatio: '9 / 19.5', animation: `la-float 7s ease-in-out ${floatDelay} infinite` }}
  >
    <div className="relative h-full w-full overflow-hidden rounded-[1.3rem] bg-black">
      {/* status notch */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-1.5">
        <div className="h-1 w-8 rounded-full bg-black ring-1 ring-white/10" />
      </div>
      {children}
    </div>
  </div>
);

const Check = () => (
  <svg viewBox="0 0 24 24" className="h-2 w-2 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={4}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

/* ── Screen 1: Dashboard ─────────────────────────────────────────── */
const DashboardScreen = () => (
  <div className="flex h-full w-full flex-col bg-gradient-to-b from-zinc-950 to-black p-2.5">
    <div className="mb-2 flex items-center justify-between pt-1">
      <span className="font-athletic text-[7px] tracking-widest text-white">
        LEGACY<span className="text-orange-500">.</span>
      </span>
      <div className="h-2.5 w-2.5 rounded-full bg-zinc-800 ring-1 ring-white/10" />
    </div>

    <p className="text-[5px] uppercase tracking-[0.2em] text-stone-500">Season Load</p>
    <div className="flex items-end gap-1">
      <span className="font-athletic text-[19px] leading-none text-white">17,490</span>
      <span className="mb-0.5 text-[5px] font-semibold text-emerald-400">▲ 12%</span>
    </div>

    <div className="my-2.5 flex items-center gap-2">
      <div className="relative h-11 w-11 shrink-0">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#27272a" strokeWidth="3.5" />
          <circle
            cx="18" cy="18" r="15.9" fill="none" stroke="#f97316" strokeWidth="3.5"
            strokeLinecap="round" strokeDasharray="100" strokeDashoffset="26"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-athletic text-[10px] leading-none text-white">3.4</span>
          <span className="text-[3.5px] uppercase tracking-widest text-stone-500">Rating</span>
        </div>
      </div>
      <div className="flex-1 space-y-1">
        {[
          ['Attendance', '96%'],
          ['Streak', '14 Days'],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between rounded bg-zinc-900/70 px-1.5 py-1">
            <span className="text-[5px] uppercase tracking-widest text-stone-500">{k}</span>
            <span className="text-[6px] font-semibold text-white">{v}</span>
          </div>
        ))}
      </div>
    </div>

    <p className="mb-1 text-[5px] uppercase tracking-[0.2em] text-stone-500">Weekly Output</p>
    <div className="mt-auto flex h-8 items-end gap-[3px]">
      {[40, 62, 48, 80, 55, 90, 70].map((h, i) => (
        <div
          key={i}
          className={`flex-1 rounded-t-sm ${i === 5 ? 'bg-orange-500' : 'bg-zinc-800'}`}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  </div>
);

/* ── Screen 2: Live Workout (center, hero) ───────────────────────── */
const WorkoutScreen = () => (
  <div className="flex h-full w-full flex-col bg-gradient-to-b from-zinc-950 to-black p-2.5">
    <div className="mb-2 flex items-center justify-between pt-1">
      <span className="text-[7px] text-stone-500">‹</span>
      <span className="font-athletic text-[7px] tracking-widest text-white">Strength &amp; Power</span>
      <span className="text-[6px] font-semibold text-orange-500">48:12</span>
    </div>

    <div className="mb-2 rounded-md border border-zinc-800 bg-zinc-900/80 p-2">
      <p className="mb-0.5 text-[5px] uppercase tracking-[0.2em] text-orange-500">Exercise 3 / 6</p>
      <p className="font-athletic text-[11px] leading-tight text-white">
        Seated DB<br />Military Press
      </p>
    </div>

    <div className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-x-1 gap-y-1 text-[5px] uppercase tracking-widest text-stone-500">
      <span>Set</span><span className="text-center">Reps</span><span className="text-center">Lbs</span><span />
      {[
        ['1', '10', '45'],
        ['2', '8', '50'],
        ['3', '8', '50'],
      ].map(([s, r, w]) => (
        <React.Fragment key={s}>
          <span className="font-semibold text-white">{s}</span>
          <span className="text-center text-[6px] text-stone-300">{r}</span>
          <span className="text-center text-[6px] text-stone-300">{w}</span>
          <span className="flex justify-end"><Check /></span>
        </React.Fragment>
      ))}
      <span className="font-semibold text-orange-500">4</span>
      <span className="text-center text-[6px] text-orange-400">8</span>
      <span className="text-center text-[6px] text-orange-400">55</span>
      <span className="flex justify-end">
        <span className="h-2 w-2 rounded-full border border-orange-500" />
      </span>
    </div>

    <div className="mt-auto grid grid-cols-2 gap-1.5 pt-2">
      {[
        ['48 min', 'Duration'],
        ['2,000+', 'Volume · lbs'],
      ].map(([v, k]) => (
        <div key={k} className="rounded-md border border-zinc-800 bg-zinc-900/60 p-1.5 text-center">
          <p className="font-athletic text-[10px] leading-none text-white">{v}</p>
          <p className="mt-0.5 text-[4.5px] uppercase tracking-widest text-stone-500">{k}</p>
        </div>
      ))}
    </div>
  </div>
);

/* ── Screen 3: Performance Feed ──────────────────────────────────── */
const PerformanceScreen = () => (
  <div className="flex h-full w-full flex-col bg-gradient-to-b from-zinc-950 to-black p-2.5">
    <span className="mb-1.5 pt-1 font-athletic text-[7px] tracking-widest text-white">Force &amp; Performance</span>

    <div className="relative mb-2 flex h-14 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-950">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 shadow-lg">
        <svg viewBox="0 0 24 24" className="ml-0.5 h-2.5 w-2.5 text-black" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      <span className="absolute bottom-1 left-1.5 text-[5px] uppercase tracking-widest text-white/90">Film Breakdown</span>
      <span className="absolute right-1.5 top-1.5 rounded bg-orange-600 px-1 py-0.5 text-[4px] font-bold uppercase tracking-widest text-white">New</span>
    </div>

    <p className="mb-1 text-[5px] uppercase tracking-[0.2em] text-stone-500">Team Leaderboard</p>
    <ul className="space-y-1">
      {[
        ['1', 'J. Rivera', '2,480'],
        ['2', 'You', '2,310'],
        ['3', 'M. Chen', '2,190'],
        ['4', 'D. Okoye', '2,040'],
      ].map(([rank, name, pts]) => {
        const isYou = name === 'You';
        return (
          <li
            key={rank}
            className={`flex items-center gap-1.5 rounded px-1.5 py-1 ${
              isYou ? 'bg-orange-500/15 ring-1 ring-orange-500/40' : 'bg-zinc-900/60'
            }`}
          >
            <span className={`font-athletic text-[7px] ${rank === '1' ? 'text-orange-500' : 'text-stone-500'}`}>{rank}</span>
            <span className={`flex-1 text-[6px] ${isYou ? 'font-semibold text-white' : 'text-stone-300'}`}>{name}</span>
            <span className="text-[6px] font-semibold text-white">{pts}</span>
          </li>
        );
      })}
    </ul>
  </div>
);

const AppShowcase: React.FC = () => (
  <div
    role="img"
    aria-label="Preview of the Legacy Athlete mobile app: performance dashboard, live workout tracking, and team leaderboard"
    className="relative flex h-full w-full items-center justify-center overflow-hidden"
  >
    {/* brand glow */}
    <div className="pointer-events-none absolute h-1/2 w-1/2 rounded-full bg-orange-600/20 blur-3xl" />

    <div className="relative flex items-center justify-center" aria-hidden="true">
      {/* left */}
      <div className="z-10 hidden origin-bottom -mr-7 -rotate-[11deg] sm:block">
        <PhoneFrame className="h-[12.5rem] brightness-[0.72] sm:h-[13.5rem] lg:h-[15rem]" floatDelay="0s">
          <DashboardScreen />
        </PhoneFrame>
      </div>

      {/* center hero */}
      <div className="relative z-30">
        <div className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-orange-600/10 blur-2xl" />
        <PhoneFrame
          className="relative h-[15rem] ring-white/15 sm:h-[16rem] lg:h-[18rem]"
          floatDelay="0.4s"
        >
          <WorkoutScreen />
        </PhoneFrame>
      </div>

      {/* right */}
      <div className="z-10 hidden origin-bottom -ml-7 rotate-[11deg] sm:block">
        <PhoneFrame className="h-[12.5rem] brightness-[0.72] sm:h-[13.5rem] lg:h-[15rem]" floatDelay="0.8s">
          <PerformanceScreen />
        </PhoneFrame>
      </div>
    </div>
  </div>
);

export default AppShowcase;
