import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const TheGap: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 80%",
        end: "bottom 20%",
        toggleActions: "play none none reverse"
      }
    });

    tl.fromTo(".gap-item", 
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.15, duration: 0.8, ease: "power3.out" }
    );
  }, []);

  return (
    <section ref={sectionRef} className="py-32 px-8 bg-black relative border-t border-stone-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20 gap-item">
          <span className="text-[10px] tracking-[0.4em] text-orange-500 uppercase block mb-4">The Problem</span>
          <h2 className="font-athletic text-5xl md:text-7xl text-white mb-6">
            WHAT'S MISSING IN <br className="hidden md:block" />
            <span className="text-stone-500">YOUTH DEVELOPMENT</span>
          </h2>
          <p className="text-stone-400 text-sm md:text-base max-w-2xl mx-auto uppercase tracking-widest leading-relaxed">
            We fill the gaps left by traditional programs and AAU circuits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {[
            {
              title: "TOO MANY GAMES",
              desc: "Constant tournaments with no time to actually develop skills or correct mistakes."
            },
            {
              title: "NO RECOVERY",
              desc: "Zero structure for physical recovery, leading to burnout and overuse injuries."
            },
            {
              title: "NO FUNDAMENTALS",
              desc: "Lack of emphasis on core mechanics, footwork, and real-time decision making."
            },
            {
              title: "LACK OF REPS",
              desc: "Too many players on a team leads to a lack of experience and real-game reps."
            }
          ].map((item, i) => (
            <div key={i} className="gap-item bg-stone-900/30 border border-stone-800 p-8 hover:bg-stone-900/50 transition-colors group">
              <div className="text-orange-600 font-athletic text-4xl mb-4 opacity-50 group-hover:opacity-100 transition-opacity">
                0{i + 1}
              </div>
              <h3 className="font-athletic text-2xl text-white mb-4">{item.title}</h3>
              <p className="text-stone-400 text-xs uppercase tracking-widest leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TheGap;
