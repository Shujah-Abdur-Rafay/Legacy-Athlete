
import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ROADMAP_STEPS } from '../constants';

interface RoadmapStep { phase: string; title: string; description: string; tag: string; }

const Roadmap: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [steps, setSteps] = useState<RoadmapStep[]>(ROADMAP_STEPS);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'events'), (snap) => {
      const list: (RoadmapStep & { order: number; active: boolean })[] = [];
      snap.docs.forEach((d) => {
        const data: any = d.data();
        if (data.active === false) return;
        list.push({
          phase: data.phase || '',
          title: data.title || '',
          description: data.description || '',
          tag: data.tag || '',
          order: typeof data.order === 'number' ? data.order : 999,
          active: true,
        });
      });
      if (list.length) {
        list.sort((a, b) => a.order - b.order);
        setSteps(list);
      }
    }, (err) => console.warn('[Roadmap] Firestore listener failed:', err));
    return () => unsub();
  }, []);

  useEffect(() => {
    // Title Animation
    if (titleRef.current) {
      gsap.fromTo(titleRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: titleRef.current,
            start: "top 85%",
          }
        }
      );
    }

    const stepEls = sectionRef.current?.querySelectorAll('.roadmap-step');
    if (!stepEls || stepEls.length === 0 || !lineRef.current) return;

    gsap.fromTo(lineRef.current, 
      { scaleY: 0 }, 
      { 
        scaleY: 1, 
        duration: 2, 
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 60%",
          end: "bottom 80%",
          scrub: 1
        }
      }
    );

    stepEls.forEach((step, i) => {
      gsap.fromTo(step,
        { opacity: 0, x: i % 2 === 0 ? -30 : 30 },
        { 
          opacity: 1, 
          x: 0, 
          duration: 1, 
          scrollTrigger: {
            trigger: step,
            start: "top 85%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });
  }, [steps]);

  return (
    <section id="process" ref={sectionRef} className="py-32 px-8 bg-black relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <span className="text-[10px] tracking-[0.4em] text-orange-500 uppercase block mb-4">The Path Forward</span>
          <h2 ref={titleRef} className="font-athletic text-5xl md:text-8xl text-white mb-8">WHAT HAPPENS <span className="text-stone-500">AFTER</span></h2>
          <p className="text-stone-400 text-sm md:text-base max-w-2xl mx-auto uppercase tracking-widest leading-relaxed">
            We’ll help you choose the option that makes the most sense—no pressure.
          </p>
        </div>

        <div className="relative">
          {/* Vertical Line */}
          <div ref={lineRef} className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-orange-600 via-stone-800 to-transparent origin-top hidden md:block"></div>

          <div className="space-y-24 md:space-y-48">
            {steps.map((step, i) => (
              <div key={i} className={`roadmap-step flex flex-col md:flex-row items-center ${i % 2 === 0 ? 'md:text-right' : 'md:flex-row-reverse md:text-left'} relative`}>
                <div className="flex-1 md:px-20 mb-8 md:mb-0">
                  <span className="font-athletic text-orange-600 text-5xl md:text-8xl opacity-30 mb-4 block leading-none">{step.phase}</span>
                  <h3 className="font-athletic text-2xl md:text-4xl text-white mb-4 tracking-tighter">{step.title}</h3>
                  <p className="text-stone-500 text-xs md:text-sm leading-relaxed uppercase tracking-wider max-w-sm ml-auto mr-auto md:ml-0 md:mr-0">
                    {step.description}
                  </p>
                </div>

                <div className="relative z-10 w-12 h-12 bg-black border border-stone-800 flex items-center justify-center rounded-full shrink-0">
                   <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></div>
                   <div className="absolute -bottom-8 whitespace-nowrap text-[8px] tracking-[0.3em] text-stone-600 uppercase font-bold">
                     {step.tag}
                   </div>
                </div>

                <div className="flex-1 hidden md:block"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Roadmap;
