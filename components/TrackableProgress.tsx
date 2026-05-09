import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const TrackableProgress: React.FC = () => {
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

    tl.fromTo(".trackable-item", 
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.15, duration: 0.8, ease: "power3.out" }
    );
  }, []);

  return (
    <section ref={sectionRef} className="py-32 px-8 bg-black relative border-t border-stone-900">
      <div className="max-w-7xl mx-auto">
        <div className="trackable-item bg-stone-900/50 border border-stone-800 p-10 md:p-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            <div>
              <span className="text-[10px] tracking-[0.4em] text-orange-500 uppercase block mb-4">The Solution</span>
              <h3 className="font-athletic text-4xl md:text-5xl text-white mb-6">
                TRACKABLE PROGRESS <br />
                <span className="text-stone-500">FROM YOUR PHONE</span>
              </h3>
              <p className="text-stone-400 text-sm leading-relaxed mb-8">
                Everything we do is measured. Players and parents can track development, session attendance, and performance metrics directly from our mobile dashboard.
              </p>
              <ul className="space-y-4">
                {[
                  "Holds players accountable to their goals",
                  "Promotes friendly competition and camaraderie",
                  "Provides clear, data-driven feedback"
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mr-4 mt-2 flex-shrink-0"></div>
                    <span className="text-xs text-stone-300 uppercase tracking-widest leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="relative aspect-square md:aspect-video lg:aspect-square bg-black border border-stone-800 rounded-lg overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[url('/images/trainheroic-2048x1152.png')] bg-cover bg-center opacity-40"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrackableProgress;
