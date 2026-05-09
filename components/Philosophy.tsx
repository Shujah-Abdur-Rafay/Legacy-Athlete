
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const Philosophy: React.FC = () => {
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

    tl.fromTo(".philosophy-text", 
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: "power3.out" }
    );
  }, []);

  return (
    <section ref={sectionRef} className="py-32 px-8 bg-stone-950 relative overflow-hidden">
      {/* Background Noise */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20">
        
        {/* Philosophy Column */}
        <div>
           <span className="text-[10px] tracking-[0.4em] text-orange-500 uppercase block mb-6">Our Philosophy</span>
           <h2 className="font-athletic text-5xl md:text-7xl text-white mb-10 leading-tight">
             DRILLS ALONE <br /> DON'T BUILD <span className="text-stone-500">PLAYERS.</span>
           </h2>
           
           <div className="space-y-8">
             <p className="philosophy-text text-stone-400 text-sm md:text-base leading-relaxed">
               Drills are useful—but drills alone don’t build players. Kids build real capacity through:
             </p>

             <ul className="philosophy-text space-y-4 border-l-2 border-orange-600 pl-6">
                {[
                  "Trial and error",
                  "Decision-making under pressure",
                  "Learning to recognize patterns and situations",
                  "Playing without hesitation or second-guessing"
                ].map((item, i) => (
                  <li key={i} className="text-stone-300 text-xs md:text-sm uppercase tracking-widest flex items-center">
                    {item}
                  </li>
                ))}
             </ul>

             <p className="philosophy-text text-stone-400 text-sm md:text-base leading-relaxed">
               That’s how confidence is formed. Not by memorizing moves—but by understanding the game.
             </p>

             <div className="philosophy-text bg-stone-900/40 p-6 border border-stone-800 rounded-sm">
               <h4 className="font-athletic text-xl text-white mb-4">OUR SESSIONS COMBINE</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {['Skill Development', 'Athletic Movement', 'Live Decision-Making', 'Real-Time Coaching'].map((item, i) => (
                   <div key={i} className="text-[10px] uppercase tracking-widest text-stone-300 flex items-center">
                     <span className="w-1.5 h-1.5 bg-stone-600 rounded-full mr-3"></span>
                     {item}
                   </div>
                 ))}
               </div>
             </div>
             
             <p className="philosophy-text text-stone-400 text-sm italic">
               This teaches athletes how to think, move, and adapt—together. That’s a truly holistic approach: body, mind, and game awareness aligned.
             </p>
           </div>
        </div>

        {/* The Goal Column */}
        <div className="relative mt-12 lg:mt-0">
           {/* Decorative Border */}
           <div className="absolute top-0 right-0 w-full h-full border border-stone-800 rounded-lg translate-x-4 translate-y-4 hidden md:block"></div>
           
           <div className="bg-stone-900/50 border border-stone-800 p-10 md:p-16 relative z-10 h-full flex flex-col justify-center backdrop-blur-sm">
              <h3 className="font-athletic text-4xl text-white mb-8">THE GOAL</h3>
              <p className="text-stone-400 text-sm leading-relaxed mb-8 uppercase tracking-wider">
                We’re not here to rush development or chase highlights. We’re here to honor the game the right way—by building:
              </p>
              
              <ul className="space-y-8 mb-12">
                 {[
                   { title: "BETTER MOVERS", desc: "Fluidity and body control." },
                   { title: "SMARTER PLAYERS", desc: "IQ and situational awareness." },
                   { title: "CONFIDENT ATHLETES", desc: "Self-belief through competence." }
                 ].map((goal, i) => (
                   <li key={i} className="flex items-start group">
                      <span className="font-athletic text-3xl text-stone-700 mr-6 group-hover:text-orange-600 transition-colors">0{i+1}</span>
                      <div>
                        <span className="block font-athletic text-xl text-white mb-1 group-hover:translate-x-1 transition-transform">{goal.title}</span>
                        <span className="text-[10px] uppercase tracking-widest text-stone-500">{goal.desc}</span>
                      </div>
                   </li>
                 ))}
              </ul>
              
              <div className="pt-8 border-t border-stone-800">
                <p className="font-serif-italic text-2xl text-stone-300">"That's how basketball was meant to be taught."</p>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
};

export default Philosophy;
