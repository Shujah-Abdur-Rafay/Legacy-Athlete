
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const CurriculumDetails: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Items animation
    const items = containerRef.current?.querySelectorAll('.detail-item');
    if (items) {
      gsap.fromTo(items, 
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          stagger: 0.15,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
          }
        }
      );
    }

    // Title animation
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
  }, []);

  const detailCategories = [
    {
      title: "MOVEMENT QUALITY",
      items: ["Joint Mobility Protocols", "Force Plate Mechanics", "Proprioceptive Awareness", "Injury Resilience Training"]
    },
    {
      title: "COGNITIVE SPEED",
      items: ["Ocular Performance Drills", "Critical Decision Scenarios", "Pressure Loading IQ", "Situational Film Audits"]
    },
    {
      title: "SPIRIT & MINDSET",
      items: ["Autonomic Breathwork", "Stoic Resilience Training", "Spiritual Grounding", "Visual Mastery Systems"]
    }
  ];

  return (
    <section className="py-24 px-8 bg-stone-950/50 border-t border-stone-900">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <span className="text-[10px] tracking-[0.4em] text-orange-500 uppercase block mb-4">The Holistic Framework</span>
          <h2 ref={titleRef} className="font-athletic text-4xl md:text-6xl text-white">DEEP CURRICULUM <br /> <span className="text-stone-500">BEYOND THE BASICS</span></h2>
        </div>

        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-3 gap-16">
          {detailCategories.map((cat, i) => (
            <div key={i} className="detail-item">
              <h4 className="font-athletic text-xl text-white mb-8 pb-4 border-b border-stone-800 flex items-center">
                <span className="text-orange-600 mr-4">0{i + 1}</span>
                {cat.title}
              </h4>
              <ul className="space-y-6">
                {cat.items.map((item, j) => (
                  <li key={j} className="flex items-center group">
                    <div className="w-1 h-1 bg-stone-700 group-hover:bg-orange-600 transition-colors rounded-full mr-4" />
                    <span className="text-[11px] tracking-[0.2em] text-stone-400 group-hover:text-stone-200 transition-colors uppercase">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CurriculumDetails;
