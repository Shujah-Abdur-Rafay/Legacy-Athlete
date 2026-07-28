import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Target, Dumbbell, Brain, ShieldCheck, Check, X } from 'lucide-react';

const PILLARS = [
  {
    icon: <Target className="w-6 h-6" />,
    title: 'Basketball Skills',
    desc: 'Ball handling, shooting mechanics, and footwork built through repetition and real coaching feedback.',
  },
  {
    icon: <Dumbbell className="w-6 h-6" />,
    title: 'Athletic Performance',
    desc: 'Speed, strength, and movement training built for the specific demands of the game.',
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: 'Basketball IQ',
    desc: 'Reading the game, making faster decisions, and understanding situations rather than memorizing moves.',
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: 'Accountability & Character',
    desc: 'Discipline, coachability, and consistency — the habits that carry over on and off the court.',
  },
];

const COMPARISON = [
  { point: 'Individualized coaching feedback', legacy: true, traditional: false },
  { point: 'Structured athletic performance training', legacy: true, traditional: false },
  { point: 'Small-group coached sessions', legacy: true, traditional: false },
  { point: 'Focus on reps and playing time', legacy: true, traditional: true },
  { point: 'Tryouts required to participate', legacy: false, traditional: true },
];

const WhyLegacyAthlete: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.pillar-card',
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.12,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="why-legacy" className="py-32 px-8 bg-black relative border-t border-stone-900 scroll-mt-32">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <span className="text-[10px] tracking-[0.4em] text-orange-500 uppercase block mb-4">Our Approach</span>
          <h2 className="font-athletic text-4xl md:text-6xl text-white">WHY <span className="text-stone-500">LEGACY ATHLETE.</span></h2>
          <p className="text-stone-500 text-xs md:text-sm max-w-xl mx-auto uppercase tracking-widest mt-4 leading-relaxed">
            Four pillars, one system — built to develop the total athlete, not just the shot.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {PILLARS.map((p) => (
            <div key={p.title} className="pillar-card bg-stone-900/30 border border-stone-800 p-8 rounded-lg hover:bg-stone-900/50 transition-colors">
              <div className="w-11 h-11 rounded-full bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mb-6">
                {p.icon}
              </div>
              <h3 className="font-athletic text-xl text-white mb-3">{p.title}</h3>
              <p className="text-stone-400 text-xs leading-relaxed uppercase tracking-wider">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Comparison */}
        <div className="max-w-3xl mx-auto bg-stone-900/20 border border-stone-850 rounded-lg overflow-hidden">
          <div className="grid grid-cols-3 border-b border-stone-800 bg-stone-900/40">
            <div className="p-5 text-[10px] text-stone-500 uppercase tracking-widest">Approach</div>
            <div className="p-5 text-center text-[10px] text-orange-500 uppercase tracking-widest font-bold">Legacy Athlete</div>
            <div className="p-5 text-center text-[10px] text-stone-500 uppercase tracking-widest">Typical Team Practice</div>
          </div>
          {COMPARISON.map((row) => (
            <div key={row.point} className="grid grid-cols-3 border-b border-stone-900 last:border-b-0">
              <div className="p-5 text-stone-300 text-xs uppercase tracking-wider">{row.point}</div>
              <div className="p-5 flex justify-center items-center">
                {row.legacy ? <Check className="w-4 h-4 text-orange-500" /> : <X className="w-4 h-4 text-stone-700" />}
              </div>
              <div className="p-5 flex justify-center items-center">
                {row.traditional ? <Check className="w-4 h-4 text-stone-500" /> : <X className="w-4 h-4 text-stone-700" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyLegacyAthlete;
