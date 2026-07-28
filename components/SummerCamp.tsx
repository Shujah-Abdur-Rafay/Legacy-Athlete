
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Calendar, Clock, Check, ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface SummerCampProps {
  onSelectPlan: (planId: string) => void;
}

const EVENT_PLAN_ID = 'end-summer-camp';

type Detail = {
  label: string;
  value: string;
  sub: string;
  icon?: React.ComponentType<{ className?: string }>;
  glyph?: string;
};

const DETAILS: Detail[] = [
  { icon: Calendar, label: 'Date', value: 'Mon, Sep 7', sub: 'Labor Day' },
  { icon: Clock, label: 'Time', value: '9:00 AM – 3:00 PM', sub: 'Full Day' },
  { glyph: '$', label: 'RSVP', value: '$75', sub: 'Per Athlete' },
];

const INCLUDED = [
  'Full-day skill + performance training',
  'Small-sided competitive play',
  'Strength, speed & mobility work',
  'All ages and levels welcome',
];

const SummerCamp: React.FC<SummerCampProps> = ({ onSelectPlan }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(sectionRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1, y: 0, duration: 1.0, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        }
      );

      if (introRef.current) {
        gsap.fromTo(introRef.current.children,
          { opacity: 0, y: 30 },
          {
            opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out',
            scrollTrigger: { trigger: introRef.current, start: 'top 85%' },
          }
        );
      }

      if (detailsRef.current) {
        gsap.fromTo(detailsRef.current.querySelectorAll('.detail-card'),
          { opacity: 0, y: 30 },
          {
            opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out',
            scrollTrigger: { trigger: detailsRef.current, start: 'top 85%' },
          }
        );
      }

      if (ctaRef.current) {
        gsap.fromTo(ctaRef.current.querySelectorAll('.cta-el'),
          { opacity: 0, y: 30 },
          {
            opacity: 1, y: 0, duration: 1, stagger: 0.2, ease: 'power3.out',
            scrollTrigger: { trigger: ctaRef.current, start: 'top 85%' },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleRSVP = () => {
    onSelectPlan(EVENT_PLAN_ID);
    document.getElementById('payment')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="summer-camp"
      ref={sectionRef}
      className="bg-black text-white py-24 px-6 md:px-12 overflow-hidden scroll-mt-32"
    >
      <div className="max-w-5xl mx-auto">
        {/* Intro */}
        <div ref={introRef} className="text-center mb-20">
          <p className="text-orange-500 uppercase tracking-[0.4em] text-[10px] md:text-xs mb-6">
            Labor Day • One Day Only
          </p>
          <h1 className="text-6xl md:text-9xl font-athletic mb-8 leading-none bg-gradient-to-r from-orange-500 to-blue-500 text-transparent bg-clip-text">
            END OF SUMMER CAMP
          </h1>
          <p className="text-stone-400 text-sm md:text-xl max-w-2xl mx-auto leading-relaxed">
            Close out the summer with one final day of high-level training.
            <span className="text-white"> One day. Real coaching. Every rep counts.</span>
          </p>
        </div>

        {/* Event details */}
        <div ref={detailsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {DETAILS.map((d, i) => {
            const Icon = d.icon;
            return (
              <div
                key={i}
                className="detail-card bg-stone-900/30 border border-stone-800 p-8 rounded-sm text-center hover:border-stone-700 transition-colors duration-500"
              >
                <div className="w-12 h-12 rounded-full border border-stone-800 flex items-center justify-center mx-auto mb-6">
                  {Icon
                    ? <Icon className="w-5 h-5 text-orange-500" />
                    : <span className="text-orange-500 font-athletic text-xl leading-none">{d.glyph}</span>}
                </div>
                <p className="text-stone-500 uppercase tracking-widest text-[10px] mb-3">{d.label}</p>
                <p className="text-2xl md:text-3xl font-athletic mb-1">{d.value}</p>
                <p className="text-stone-600 text-[10px] uppercase tracking-widest">{d.sub}</p>
              </div>
            );
          })}
        </div>

        {/* What's included */}
        <div className="mb-20 max-w-2xl mx-auto">
          <h3 className="text-white uppercase tracking-widest text-xs mb-8 text-center">What's Included</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            {INCLUDED.map((item, i) => (
              <li key={i} className="flex items-start gap-4 text-stone-300 text-sm">
                <Check className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div
          ref={ctaRef}
          className="text-center bg-stone-900/30 py-16 md:py-20 px-8 rounded-sm border border-stone-800/50"
        >
          <h2 className="cta-el text-3xl md:text-5xl font-athletic mb-4 leading-tight">
            SECURE YOUR SPOT
          </h2>
          <p className="cta-el text-stone-500 uppercase tracking-[0.3em] text-[10px] md:text-xs mb-10">
            Spots are limited to maintain coaching quality.
          </p>
          <div className="cta-el flex flex-col items-center gap-4">
            <button
              onClick={handleRSVP}
              className="w-full sm:w-auto bg-white text-black px-12 py-4 rounded-full text-[11px] uppercase tracking-[0.2em] font-bold hover:scale-105 hover:bg-orange-600 hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
            >
              RSVP – $75 <ArrowRight className="w-3 h-3" />
            </button>
            <p className="text-stone-600 text-[10px] uppercase tracking-widest">
              $75 + tax • Secure checkout via Stripe
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SummerCamp;
