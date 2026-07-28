
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MagneticButton from './MagneticButton';

const Hero: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const ballContainerRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial entrance timeline
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    gsap.set(headlineRef.current, { y: 120, opacity: 0, filter: 'blur(30px)' });
    gsap.set(ctaRef.current, { y: 60, opacity: 0 });
    gsap.set(ballContainerRef.current, { scale: 0.7, opacity: 0 });
    gsap.set(glowRef.current, { opacity: 0, scale: 0.4 });

    tl.to(ballContainerRef.current, { 
      scale: 1, 
      opacity: 1, 
      duration: 3, 
      ease: "expo.out" 
    })
    .to(glowRef.current, {
      opacity: 1,
      scale: 1,
      duration: 2.5,
    }, "-=2.5")
    .to(headlineRef.current, { 
      y: 0, 
      opacity: 1, 
      filter: 'blur(0px)', 
      duration: 2 
    }, "-=1.8")
    .to(ctaRef.current, { 
      y: 0, 
      opacity: 1, 
      duration: 1.5 
    }, "-=1.2");

    // Scroll-linked Deep Zoom Effect
    ScrollTrigger.create({
      trigger: heroRef.current,
      start: "top top",
      end: "bottom top",
      scrub: 1.5,
      onUpdate: (self) => {
        const progress = self.progress;
        
        // Deep Zoom: The ball background scales up massively
        gsap.set(ballContainerRef.current, {
          scale: 1 + (progress * 6),
          opacity: 1 - (progress * 1.5),
          y: progress * 200
        });
        
        // Glow expansion
        gsap.set(glowRef.current, {
          scale: 1 + (progress * 4),
          opacity: 1 - (progress * 1.2)
        });

        // Parallax and fade for text
        gsap.set(headlineRef.current, {
          y: progress * -350,
          opacity: 1 - (progress * 2),
          scale: 1 + (progress * 0.1)
        });
        
        gsap.set(ctaRef.current, {
          y: progress * -250,
          opacity: 1 - (progress * 2.5)
        });
      }
    });

    // Mouse movement interaction
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const xPos = (clientX / window.innerWidth - 0.5) * 20;
      const yPos = (clientY / window.innerHeight - 0.5) * 20;
      
      gsap.to(ballContainerRef.current, {
        x: xPos,
        y: yPos,
        duration: 3,
        ease: "power2.out"
      });
      
      gsap.to(glowRef.current, {
        x: xPos * 1.2,
        y: yPos * 1.2,
        duration: 4,
        ease: "power2.out"
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section 
      ref={heroRef} 
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black py-20"
    >
      {/* Background Glow Layer */}
      <div 
        ref={glowRef}
        className="absolute w-[100vh] h-[100vh] rounded-full blur-[180px] pointer-events-none z-0 opacity-80"
        style={{ 
          background: 'radial-gradient(circle at center, rgba(255, 100, 0, 0.25) 0%, transparent 70%)'
        }}
      />

      {/* Main Visual: Weathered Basketball Background */}
      <div 
        ref={ballContainerRef}
        className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
      >
        <div className="relative w-[60vh] h-[60vh] md:w-[75vh] md:h-[75vh]">
          <img 
            src="/images/013A6138-9.jpg" 
            alt="Legacy Focus"
            className="w-full h-full object-cover rounded-full shadow-2xl brightness-[0.8] contrast-[1.6] grayscale-[0.1]"
          />
          <div className="absolute inset-0 rounded-full shadow-[inset_0_0_120px_rgba(0,0,0,1)]" />
          <div className="absolute inset-0 rounded-full shadow-[0_0_100px_rgba(255,80,0,0.4),inset_0_0_40px_rgba(255,80,0,0.3)]" />
          <div className="absolute inset-0 rounded-full opacity-40 mix-blend-soft-light bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-10 overflow-hidden">
          <span className="block text-[10px] md:text-xs tracking-[1em] text-orange-600 uppercase font-bold drop-shadow-[0_0_15px_rgba(255,69,0,0.5)]">
            TRUE ATHLETIC DEVELOPMENT
          </span>
        </div>
        
        <h1 
          ref={headlineRef}
          className="font-athletic text-5xl md:text-[8rem] leading-[0.9] text-white mb-12"
        >
          TRUE PLAYER <br /> 
          <span className="text-stone-500 italic opacity-80">DEVELOPMENT.</span>
        </h1>

        <div ref={ctaRef} className="flex flex-col items-center max-w-4xl">
          <p className="text-stone-500 text-[10px] md:text-sm uppercase tracking-[0.2em] mb-12 leading-relaxed max-w-2xl">
            We promote creativity, intrinsic motivation, and character development of young athletes—going far beyond wins and losses.
          </p>
          
          <div className="mt-8 flex flex-col md:flex-row items-center justify-center space-y-10 md:space-y-0 md:space-x-20">
            <MagneticButton 
              className="w-full md:w-auto !px-16 !py-6 text-xl !bg-white !text-black hover:!bg-orange-600 hover:!text-white shadow-[0_0_80px_rgba(255,255,255,0.08)]"
              onClick={() => document.getElementById('apply')?.scrollIntoView({behavior: 'smooth'})}
            >
              BOOK A SESSION
            </MagneticButton>
            
            <button 
              onClick={() => document.getElementById('session')?.scrollIntoView({behavior: 'smooth'})}
              className="group flex items-center space-x-6 text-[12px] uppercase tracking-[0.3em] text-stone-600 hover:text-white transition-all duration-1000"
            >
              <div className="w-12 h-12 rounded-full border border-stone-900 flex items-center justify-center group-hover:border-orange-600 group-hover:bg-orange-600/5 transition-all duration-1000">
                <svg className="w-5 h-5 text-orange-600 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <span className="border-b border-transparent group-hover:border-orange-600 pb-2">VIEW SCHEDULE</span>
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center opacity-40">
        <div className="w-px h-28 bg-gradient-to-b from-orange-600 via-orange-500/30 to-transparent"></div>
        <span className="text-[8px] tracking-[1.2em] text-stone-800 uppercase mt-8 ml-3">Start Now</span>
      </div>
    </section>
  );
};

export default Hero;
