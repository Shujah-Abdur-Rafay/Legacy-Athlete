
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check, X, Calendar, Clock, ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface SummerCampProps {
  onSelectPlan: (planId: string) => void;
}

const SummerCamp: React.FC<SummerCampProps> = ({ onSelectPlan }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const datesRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Section container fade in and move upward
      gsap.fromTo(sectionRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 1.0,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
          }
        }
      );

      // 2. Intro strip stagger
      if (introRef.current) {
        const children = introRef.current.children;
        gsap.fromTo(children,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: introRef.current,
              start: "top 85%",
            }
          }
        );
      }

      // 3. Comparison cards
      if (cardsRef.current) {
        const leftCard = cardsRef.current.querySelector('.card-left');
        const rightCard = cardsRef.current.querySelector('.card-right');
        
        gsap.fromTo(leftCard,
          { x: -100, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: cardsRef.current,
              start: "top 75%",
            }
          }
        );

        gsap.fromTo(rightCard,
          { x: 100, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: cardsRef.current,
              start: "top 75%",
            }
          }
        );
      }

      // 4. Results and experience band (blur-to-sharp)
      if (resultsRef.current) {
        const items = resultsRef.current.querySelectorAll('.result-item');
        gsap.fromTo(items,
          { opacity: 0, y: 20, filter: 'blur(10px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 1,
            stagger: 0.2,
            ease: "power2.out",
            scrollTrigger: {
              trigger: resultsRef.current,
              start: "top 85%",
            }
          }
        );
      }

      // 5. Pricing strip (fade up one at a time + count up)
      if (pricingRef.current) {
        const blocks = pricingRef.current.querySelectorAll('.price-block');
        blocks.forEach((block, i) => {
          gsap.fromTo(block,
            { opacity: 0, y: 30 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              delay: i * 0.2,
              ease: "power3.out",
              scrollTrigger: {
                trigger: pricingRef.current,
                start: "top 85%",
              }
            }
          );
        });
      }

      // 6. Dates row (divider wipe + fade in)
      if (datesRef.current) {
        const divider = datesRef.current.querySelector('.divider-line');
        const content = datesRef.current.querySelectorAll('.date-content');
        
        gsap.fromTo(divider,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.2,
            ease: "power3.inOut",
            scrollTrigger: {
              trigger: datesRef.current,
              start: "top 90%",
            }
          }
        );

        gsap.fromTo(content,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.2,
            delay: 0.5,
            ease: "power3.out",
            scrollTrigger: {
              trigger: datesRef.current,
              start: "top 85%",
            }
          }
        );
      }

      // 7. CTA
      if (ctaRef.current) {
        const elements = ctaRef.current.querySelectorAll('.cta-el');
        gsap.fromTo(elements,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            stagger: 0.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: ctaRef.current,
              start: "top 85%",
            }
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleSelectPlan = (planId: string) => {
    onSelectPlan(planId);
    document.getElementById('payment')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section 
      id="summer-camp" 
      ref={sectionRef}
      className="bg-black text-white py-24 px-6 md:px-12 overflow-hidden scroll-mt-24"
    >
      <div className="max-w-6xl mx-auto">
        {/* 1. Intro Strip */}
        <div ref={introRef} className="text-center mb-24">
          <h1 className="text-6xl md:text-9xl font-athletic mb-8 leading-none bg-gradient-to-r from-orange-500 to-blue-500 text-transparent bg-clip-text">
            SUMMER CAMP
          </h1>
          <p className="text-stone-500 uppercase tracking-[0.4em] text-[10px] md:text-xs mb-4">
            Most camps keep kids busy. We build players.
          </p>
          <h2 className="text-4xl md:text-7xl font-athletic mb-6 leading-none">
            DO THE MATH. <br className="hidden md:block" /> IT’S CLEAR.
          </h2>
          <p className="text-stone-400 text-sm md:text-xl max-w-2xl mx-auto leading-relaxed">
            Three hours a day is not the difference. <br className="hidden md:block" />
            <span className="text-white">What happens in those three hours is.</span>
          </p>
        </div>

        {/* 2. Comparison Cards */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-32">
          {/* Card 1: Without Structure */}
          <div className="card-left bg-stone-900/30 border border-stone-800 p-8 md:p-12 rounded-sm group hover:border-stone-700 transition-all duration-500 hover:-translate-y-1">
            <h3 className="text-stone-500 uppercase tracking-widest text-xs mb-8">Without Structure</h3>
            <ul className="space-y-6 mb-12">
              {[
                "15 hours per week",
                "Random drills and games",
                "Low repetition quality",
                "Minimal individual attention"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-4 text-stone-400 text-sm">
                  <X className="w-4 h-4 text-stone-600 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="pt-8 border-t border-stone-800">
              <p className="text-stone-500 text-[10px] uppercase tracking-widest mb-2">Result:</p>
              <p className="text-stone-300 font-medium">Time passes. Little changes.</p>
            </div>
          </div>

          {/* Card 2: With Legacy */}
          <div className="card-right bg-stone-900/50 border border-stone-700 p-8 md:p-12 rounded-sm group hover:border-white/20 transition-all duration-500 hover:-translate-y-2 relative">
            <div className="absolute top-0 right-0 bg-white text-black text-[9px] uppercase tracking-widest px-3 py-1 font-bold">Recommended</div>
            <h3 className="text-white uppercase tracking-widest text-xs mb-8">With Legacy</h3>
            <ul className="space-y-6 mb-12">
              {[
                "15 hours structured training",
                "Skill and movement combined",
                "Small-sided decision making daily",
                "Built-in strength and mobility"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-4 text-white text-sm">
                  <Check className="w-4 h-4 text-white mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="pt-8 border-t border-stone-700">
              <p className="text-stone-400 text-[10px] uppercase tracking-widest mb-2">Result:</p>
              <p className="text-white font-medium">Noticeable improvement in how your child plays and moves.</p>
            </div>
          </div>
        </div>

        {/* 3. Results and Experience Band */}
        <div ref={resultsRef} className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 mb-32 py-16 border-y border-stone-900">
          <div className="result-item">
            <h4 className="text-white uppercase tracking-widest text-xs mb-4">Results</h4>
            <p className="text-stone-400 text-sm md:text-base leading-relaxed">
              We have built competitive players and seen real gains in strength, movement, and confidence through our performance program.
            </p>
          </div>
          <div className="result-item">
            <h4 className="text-white uppercase tracking-widest text-xs mb-4">Experience</h4>
            <p className="text-stone-400 text-sm md:text-base leading-relaxed">
              Led by a team with decades of experience working with high-level athletes. No guesswork. Proven methods.
            </p>
          </div>
        </div>

        {/* 4. Pricing Strip */}
        <div ref={pricingRef} className="mb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: "camp-weekly", label: "Weekly Academy", price: "$249", sub: "Full Access" },
              { id: "camp-early-bird", label: "Early Bird", price: "$229", sub: "Limited Time" },
              { id: "camp-day-pass", label: "Day Pass", price: "$65", sub: "Single Session" }
            ].map((item, i) => (
              <div key={i} className="price-block bg-stone-900/20 border border-stone-800 p-8 text-center rounded-sm hover:border-stone-600 transition-colors cursor-pointer group" onClick={() => handleSelectPlan(item.id)}>
                <p className="text-stone-500 uppercase tracking-widest text-[10px] mb-4">{item.label}</p>
                <p className="text-4xl font-athletic mb-2 group-hover:text-white transition-colors">{item.price}</p>
                <p className="text-stone-600 text-[10px] uppercase tracking-widest">{item.sub}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-stone-500 text-[10px] uppercase tracking-[0.3em] mt-8">
            Spots are limited to maintain coaching quality.
          </p>
        </div>

        {/* 5. Dates and Schedule Row */}
        <div id="camp-schedule" ref={datesRef} className="mb-32 relative scroll-mt-32">
          <div className="divider-line absolute top-0 left-0 w-full h-px bg-stone-800 origin-left"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12">
            <div className="date-content flex items-center gap-6">
              <div className="w-12 h-12 rounded-full border border-stone-800 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-stone-500" />
              </div>
              <div>
                <p className="text-stone-500 uppercase tracking-widest text-[10px] mb-1">Dates</p>
                <p className="text-xl font-athletic">June 10 to August 2</p>
              </div>
            </div>
            <div className="date-content flex items-center gap-6">
              <div className="w-12 h-12 rounded-full border border-stone-800 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-stone-500" />
              </div>
              <div>
                <p className="text-stone-500 uppercase tracking-widest text-[10px] mb-1">Schedule</p>
                <p className="text-xl font-athletic">Mon – Fri | 9:00 AM – 12:00 PM</p>
              </div>
            </div>
          </div>
        </div>

        {/* 6. CTA Footer */}
        <div ref={ctaRef} className="text-center bg-stone-900/30 py-20 px-8 rounded-sm border border-stone-800/50">
          <h2 className="cta-el text-3xl md:text-5xl font-athletic mb-4 leading-tight">
            GIVE YOUR ATHLETE A <br className="hidden md:block" /> BETTER SUMMER ROUTINE
          </h2>
          <p className="cta-el text-stone-500 uppercase tracking-[0.3em] text-[10px] md:text-xs mb-12">
            Structured training. Real coaching. Competitive pricing.
          </p>
          <div className="cta-el flex flex-col md:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => handleSelectPlan('camp-weekly')}
              className="w-full md:w-auto bg-white text-black px-10 py-4 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold hover:scale-105 hover:bg-stone-200 transition-all duration-300 flex items-center justify-center gap-2"
            >
              Reserve a Spot <ArrowRight className="w-3 h-3" />
            </button>
            <button 
              onClick={() => document.getElementById('camp-schedule')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full md:w-auto border border-stone-700 text-white px-10 py-4 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold hover:border-white transition-all duration-300"
            >
              View Schedule
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SummerCamp;
