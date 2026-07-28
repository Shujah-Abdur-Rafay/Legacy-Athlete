import React from 'react';
import { Calendar, Smartphone, Clock, Sun, Sparkles, ArrowRight, ArrowUpRight, Rocket } from 'lucide-react';
import { ATHLETE_APP_URL } from '../constants';

interface QuickAccessHubProps {
  isLoggedIn: boolean;
  onMemberAreaClick: () => void;
}

interface QuickCard {
  icon: React.ReactNode;
  title: string;
  desc: string;
  /** Internal action. Mutually exclusive with `href`. */
  onClick?: () => void;
  /** External destination — renders an anchor that opens in a new tab. */
  href?: string;
  highlight?: boolean;
}

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

const QuickAccessHub: React.FC<QuickAccessHubProps> = ({ isLoggedIn, onMemberAreaClick }) => {
  const cards: QuickCard[] = [
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Book Session',
      desc: 'Reserve your next training session',
      onClick: () => scrollTo('apply'),
    },
    {
      icon: <Rocket className="w-6 h-6" />,
      title: 'Athlete App',
      desc: 'Workouts, progress & coach chat',
      href: ATHLETE_APP_URL,
      highlight: true,
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: isLoggedIn ? 'Athlete Console' : 'Member Login',
      desc: isLoggedIn ? 'View bookings & progress' : 'Access your dashboard',
      onClick: onMemberAreaClick,
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Schedule',
      desc: 'See this week’s training times',
      onClick: () => scrollTo('weekly-schedule'),
    },
    {
      icon: <Sun className="w-6 h-6" />,
      title: 'Camps',
      desc: 'Upcoming camps & cohort dates',
      onClick: () => scrollTo('summer-camp'),
    },
  ];

  return (
    <section id="members" className="py-24 px-8 bg-black border-b border-stone-900 scroll-mt-32">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-[10px] tracking-[0.4em] text-orange-500 uppercase block mb-3">Quick Access</span>
            <h2 className="font-athletic text-3xl md:text-5xl text-white">GET WHERE YOU <span className="text-stone-500">NEED TO GO.</span></h2>
          </div>
          <p className="text-stone-500 text-xs uppercase tracking-widest max-w-xs">
            Current members: booking and your console are one click away.
          </p>
        </div>

        {/* Five cards over two mobile columns leaves a stray last card, so it
            spans the full row below lg. */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {cards.map((card) => {
            const cardClass = `group text-left border p-6 rounded-lg transition-all col-span-1 last:col-span-2 lg:last:col-span-1 ${
              card.highlight
                ? 'bg-orange-600/10 border-orange-500/40 hover:border-orange-500/70 hover:bg-orange-600/20'
                : 'bg-stone-900/30 border-stone-800 hover:border-orange-500/50 hover:bg-stone-900/60'
            }`;

            const inner = (
              <>
                <div
                  className={`w-11 h-11 rounded-full border flex items-center justify-center mb-5 text-orange-500 transition-colors ${
                    card.highlight
                      ? 'border-orange-500/50 bg-orange-600/10'
                      : 'border-stone-800 group-hover:border-orange-500/50 group-hover:bg-orange-600/10'
                  }`}
                >
                  {card.icon}
                </div>
                <h3 className="font-athletic text-lg text-white mb-1 tracking-wide flex items-center gap-1.5">
                  {card.title}
                  {card.href && (
                    <ArrowUpRight className="w-4 h-4 text-orange-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  )}
                </h3>
                <p className="text-stone-500 text-[10px] uppercase tracking-widest leading-relaxed">{card.desc}</p>
              </>
            );

            return card.href ? (
              <a
                key={card.title}
                href={card.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${card.title} — ${card.desc} (opens in a new tab)`}
                className={cardClass}
              >
                {inner}
              </a>
            ) : (
              <button key={card.title} onClick={card.onClick} className={cardClass}>
                {inner}
              </button>
            );
          })}
        </div>

        {/* New families entry point */}
        <button
          onClick={() => scrollTo('assessment')}
          className="w-full group text-left bg-gradient-to-r from-orange-600/10 to-transparent border border-orange-500/30 p-6 md:p-8 rounded-lg hover:border-orange-500/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-start md:items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-orange-600 flex items-center justify-center text-white flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] tracking-[0.3em] text-orange-500 uppercase block mb-1">New Here? Start This Way</span>
              <h3 className="font-athletic text-xl md:text-2xl text-white">Book a Free Athlete Assessment</h3>
            </div>
          </div>
          <span className="flex items-center gap-2 text-white text-xs uppercase tracking-widest font-medium flex-shrink-0 pl-15 md:pl-0">
            Get Started <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
      </div>
    </section>
  );
};

export default QuickAccessHub;
