import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Quote, LineChart } from 'lucide-react';
import { TESTIMONIALS } from '../constants';

const SocialProof: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.proof-card',
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
    <section ref={sectionRef} id="results" className="py-28 px-8 bg-black border-b border-stone-900 relative overflow-hidden scroll-mt-32">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(234,88,12,0.05)_0%,transparent_50%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[10px] tracking-[0.4em] text-orange-500 uppercase block mb-4">Earning Trust</span>
          <h2 className="font-athletic text-4xl md:text-6xl text-white">WHAT ATHLETES <span className="text-stone-500">ARE SAYING.</span></h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {TESTIMONIALS.map((t) => (
            <div key={t.id} className="proof-card bg-stone-900/30 border border-stone-800 p-8 rounded-lg flex flex-col justify-between hover:bg-stone-900/50 transition-colors">
              <div>
                <Quote className="w-6 h-6 text-orange-600/40 mb-4" />
                <p className="text-stone-300 text-sm leading-relaxed mb-6">{t.content}</p>
              </div>
              <div className="flex items-center space-x-3 pt-4 border-t border-stone-800">
                <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full grayscale opacity-80" />
                <div>
                  <p className="text-white text-xs uppercase tracking-widest font-medium">{t.name}</p>
                  <p className="text-stone-500 text-[10px] uppercase tracking-widest">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="proof-card max-w-3xl mx-auto bg-stone-900/20 border border-stone-800 rounded-lg p-8 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <div className="w-12 h-12 rounded-full bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-500 flex-shrink-0">
            <LineChart className="w-6 h-6" />
          </div>
          <p className="text-stone-400 text-xs uppercase tracking-widest leading-relaxed">
            Every session is logged in the Legacy Athlete app — attendance, focus areas, and coach notes — so progress is visible, not just promised.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
