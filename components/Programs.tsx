
import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PROGRAMS } from '../constants';
import { Program } from '../types';

const ProgramCard: React.FC<{ program: Program; index: number }> = ({ program, index }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!cardRef.current) return;

    gsap.fromTo(cardRef.current,
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: cardRef.current,
          start: "top 90%",
          toggleActions: "play none none none"
        },
        delay: index * 0.15
      }
    );
  }, [index]);

  return (
    <div 
      ref={cardRef}
      className={`group relative overflow-hidden bg-zinc-900/40 border border-zinc-800 transition-all duration-700 ease-in-out cursor-pointer ${isExpanded ? 'md:col-span-2' : ''}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="aspect-[4/5] md:aspect-[3/4] relative overflow-hidden">
        <img 
          src={program.image} 
          alt={program.title}
          className="absolute inset-0 w-full h-full object-cover grayscale transition-transform duration-1000 group-hover:scale-105 opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 p-8 w-full">
          <span className="text-[10px] tracking-[0.3em] text-stone-400 uppercase mb-2 block">
            {program.category}
          </span>
          <h3 className="font-athletic text-3xl text-white mb-4">{program.title}</h3>
          
          <div className={`overflow-hidden transition-all duration-700 max-h-96 opacity-100`}>
            <p className="text-stone-400 text-sm leading-relaxed mb-6 max-w-md">
              {program.description}
            </p>
            <ul className="space-y-2">
              {program.benefits.map((benefit, i) => (
                <li key={i} className="flex items-center text-[10px] tracking-wider text-stone-200 uppercase">
                  <div className="w-1 h-1 bg-stone-100 rounded-full mr-3"></div>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      <div className="absolute inset-0 border border-white/0 group-hover:border-white/10 transition-colors pointer-events-none" />
    </div>
  );
};

const Programs: React.FC = () => {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
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

    gsap.fromTo('.schedule-item',
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: '.schedule-container',
          start: "top 80%",
        }
      }
    );
  }, []);

  return (
    <section id="session" className="py-32 px-8 md:px-16 bg-black relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 space-y-4 md:space-y-0">
          <div>
            <h2 ref={titleRef} className="font-athletic text-5xl md:text-7xl mb-4 text-white">WHAT HAPPENS <br />IN THE SESSION</h2>
            <p className="text-stone-500 text-sm max-w-sm">We coach first and evaluate naturally through training.</p>
          </div>
          <div className="text-[10px] tracking-[0.4em] text-stone-600 uppercase">
            Scroll to Explore
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-32">
          {PROGRAMS.map((program, index) => (
            <ProgramCard key={program.id} program={program} index={index} />
          ))}
        </div>

        <div id="weekly-schedule" className="schedule-container border-t border-stone-900 pt-20 scroll-mt-32">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12">
               <div>
                  <span className="text-[10px] tracking-[0.4em] text-orange-600 uppercase mb-4 block">Spring Schedule • 3/30 – 5/31</span>
                  <h3 className="font-athletic text-4xl md:text-5xl text-white">WEEKLY <span className="text-stone-500">SCHEDULE</span></h3>
               </div>
               <p className="text-stone-500 text-xs uppercase tracking-widest mt-6 md:mt-0">
                 Sessions run 60 minutes. Arrive 10 min early.
               </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-px bg-stone-900 border border-stone-900">
               {[
                 { day: 'MONDAY', sessions: [
                   { time: '6:30 PM', focus: 'Speed & Agility (GS)', color: 'text-amber-500', dot: 'bg-amber-500' },
                   { time: '7:00 PM', focus: 'Total Skills/IQ/Gameplay (GS)', color: 'text-emerald-500', dot: 'bg-emerald-500' }
                 ]},
                 { day: 'TUESDAY', sessions: [
                   { time: '6:30 PM', focus: 'Strength + Power (GS)', color: 'text-rose-500', dot: 'bg-rose-500' },
                   { time: '7:00 PM', focus: 'Shooting (300+) (GS)', color: 'text-blue-500', dot: 'bg-blue-500' }
                 ]},
                 { day: 'WEDNESDAY', sessions: [
                   { time: '6:30 PM', focus: 'Mobility + Cond. (GS)', color: 'text-purple-500', dot: 'bg-purple-500' },
                   { time: '7:00 PM', focus: 'Ball Handling (GS)', color: 'text-cyan-500', dot: 'bg-cyan-500' }
                 ]},
                 { day: 'THURSDAY', sessions: [
                   { time: '6:30 PM', focus: 'Speed & Agility (GS)', color: 'text-amber-500', dot: 'bg-amber-500' },
                   { time: '7:00 PM', focus: 'Total Skills/IQ/Gameplay (GS)', color: 'text-emerald-500', dot: 'bg-emerald-500' }
                 ]},
                 { day: 'SATURDAY', sessions: [
                   { time: '8:00 AM', focus: 'Select Practice (GS)', color: 'text-orange-500', dot: 'bg-orange-500' },
                   { time: '9:00-9:30 AM', focus: 'Strength + Power (GS)', color: 'text-rose-500', dot: 'bg-rose-500' },
                   { time: '9:30 AM', focus: 'Game prep: footwork and skills (GS)', color: 'text-indigo-400', dot: 'bg-indigo-400' }
                 ]}
               ].map((item, i) => (
                 <div key={i} className="schedule-item bg-black p-8 hover:bg-stone-900/40 transition-colors group">
                    <h4 className="font-athletic text-2xl text-stone-300 group-hover:text-white transition-colors mb-6">{item.day}</h4>
                    <ul className="space-y-5">
                      {item.sessions.map((session, idx) => (
                        <li key={idx} className="flex items-start">
                          <div className={`w-2 h-2 ${session.dot} rounded-full mr-3 mt-1.5 flex-shrink-0 shadow-[0_0_8px_currentColor] ${session.color}`}></div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold tracking-widest text-stone-500 mb-1">{session.time}</span>
                            <span className={`text-sm font-medium tracking-widest ${session.color}`}>{session.focus}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                 </div>
               ))}
            </div>
        </div>
      </div>
    </section>
  );
};

export default Programs;
