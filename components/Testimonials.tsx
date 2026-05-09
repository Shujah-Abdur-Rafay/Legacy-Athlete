
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TESTIMONIALS } from '../constants';

const Testimonials: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cards = containerRef.current?.querySelectorAll('.testimonial-card');
    if (!cards) return;

    gsap.fromTo(cards, 
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.2,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        }
      }
    );
  }, []);

  return (
    <section className="py-32 px-8 bg-stone-950/30">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <span className="text-[10px] tracking-[0.4em] text-orange-500 uppercase block mb-4">Social Proof</span>
          <h2 className="font-athletic text-4xl md:text-6xl text-white">VOICES FROM <br /> THE FRONTLINE</h2>
        </div>

        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t) => (
            <div key={t.id} className="testimonial-card bg-stone-900/40 border border-stone-800 p-8 flex flex-col justify-between h-full">
              <div>
                <div className="flex space-x-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-stone-300 text-sm italic leading-relaxed mb-8">"{t.content}"</p>
              </div>
              <div className="flex items-center space-x-4">
                <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full grayscale border border-stone-700" />
                <div>
                  <h4 className="font-athletic text-sm text-white">{t.name}</h4>
                  <p className="text-[10px] uppercase tracking-widest text-stone-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
