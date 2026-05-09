
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { STATS } from '../constants';

const StatItem: React.FC<{ label: string; value: number; suffix: string }> = ({ label, value, suffix }) => {
  const numberRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = numberRef.current;
    if (!el) return;

    gsap.fromTo(el, 
      { innerText: 0 }, 
      {
        innerText: value,
        duration: 2,
        ease: "expo.out",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
        },
        snap: { innerText: 1 },
        onUpdate: function() {
          if (el) {
            el.innerText = Math.ceil(parseFloat(el.innerText)).toString();
          }
        }
      }
    );
  }, [value]);

  return (
    <div className="flex flex-col items-center justify-center border-stone-800 py-12 px-4">
      <div className="font-athletic text-5xl md:text-7xl mb-2 flex items-baseline text-white">
        <span ref={numberRef}>0</span>
        <span className="text-stone-500 text-2xl md:text-4xl ml-1">{suffix}</span>
      </div>
      <p className="text-[10px] tracking-[0.4em] text-stone-600 uppercase font-medium">{label}</p>
    </div>
  );
};

const Stats: React.FC = () => {
  return (
    <section className="bg-black border-y border-stone-900">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-900 border-x border-stone-900">
        {STATS.map((stat, i) => (
          <StatItem key={i} {...stat} />
        ))}
      </div>
    </section>
  );
};

export default Stats;
