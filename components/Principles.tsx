
import React, { useEffect, useRef } from 'react';
// Import gsap and ScrollTrigger to resolve 'Cannot find name' errors
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PRINCIPLES } from '../constants';

const Principles: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Pinning logic
      const pin = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=300%",
        pin: true,
        scrub: 1,
      });

      // Individual text fades
      PRINCIPLES.forEach((_, i) => {
        gsap.fromTo(`.principle-content-${i}`, 
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            scrollTrigger: {
              trigger: sectionRef.current,
              start: () => `top+=${i * window.innerHeight} top`,
              end: () => `top+=${(i + 1) * window.innerHeight} top`,
              toggleActions: "play reverse play reverse",
              scrub: true
            }
          }
        );
      });

      // Progress bar animation
      gsap.to(progressRef.current, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=300%",
          scrub: true
        }
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="principles" className="relative h-screen bg-stone-950 flex items-center justify-center overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-stone-900 z-50">
        <div ref={progressRef} className="h-full bg-white w-full scale-x-0 origin-left"></div>
      </div>

      <div ref={containerRef} className="w-full max-w-4xl px-8 relative">
        {PRINCIPLES.map((principle, index) => (
          <div 
            key={principle.id} 
            className={`principle-content-${index} absolute inset-0 flex flex-col items-center justify-center text-center`}
            style={{ opacity: 0 }}
          >
            <span className="text-[10px] tracking-[0.5em] text-stone-600 uppercase mb-8">
              Principle {principle.id.toString().padStart(2, '0')}
            </span>
            <h2 className="font-athletic text-5xl md:text-8xl mb-6 text-white leading-none">
              {principle.title}
            </h2>
            <p className="font-serif-italic text-stone-400 text-lg md:text-2xl mb-8 max-w-2xl italic">
              "{principle.quote}"
            </p>
            <p className="text-stone-500 text-xs md:text-sm max-w-md leading-relaxed uppercase tracking-[0.1em]">
              {principle.description}
            </p>
          </div>
        ))}
      </div>

      {/* Decorative vertical line */}
      <div className="absolute left-8 md:left-16 top-1/2 -translate-y-1/2 h-32 w-px bg-stone-800"></div>
    </section>
  );
};

export default Principles;
