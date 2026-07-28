
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
    // Rests at 1.06 rather than 1 so the mouse-parallax drift below never
    // exposes an edge of the full-bleed image.
    gsap.set(ballContainerRef.current, { scale: 1.18, opacity: 0 });
    gsap.set(glowRef.current, { opacity: 0, scale: 0.4 });

    tl.to(ballContainerRef.current, {
      scale: 1.06,
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
        
        // Slow push-in as the hero exits. The old 7x zoom was tuned for a
        // circular crop; a full-bleed photo only needs a subtle drift.
        gsap.set(ballContainerRef.current, {
          scale: 1.06 + (progress * 0.5),
          opacity: 1 - (progress * 1.3),
          y: progress * 120
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

      {/* Main Visual: full-bleed team poster */}
      <div
        ref={ballContainerRef}
        className="absolute inset-0 z-10 pointer-events-none"
      >
        <img
          src="/images/hero-legacy.jpg"
          alt="Legacy athletes training"
          /* LCP image — load eagerly rather than lazily. */
          loading="eager"
          fetchPriority="high"
          className="w-full h-full object-cover object-center"
        />

        {/* Darkest through the centre, where the headline sits and where the
            poster carries its own LEGACY wordmark. Keeps the athletes at the
            edges readable without two competing wordmarks stacked up. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 75% 60% at 50% 45%, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.66) 45%, rgba(0,0,0,0.45) 100%)'
          }}
        />

        {/* Blends the photo into the black page above and below. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      </div>

      {/* Content Overlay — offset below the fixed header (utility bar + nav)
          rather than inset-0, so the eyebrow never sits underneath it. */}
      <div className="absolute inset-x-0 top-[6.5rem] bottom-0 z-20 flex flex-col items-center justify-center px-6 text-center">
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
          
          <div className="mt-8 flex flex-col md:flex-row items-center justify-center space-y-6 md:space-y-0 md:space-x-8">
            <MagneticButton
              className="w-full md:w-auto !px-16 !py-6 text-xl !bg-white !text-black hover:!bg-orange-600 hover:!text-white shadow-[0_0_80px_rgba(255,255,255,0.08)]"
              onClick={() => document.getElementById('assessment')?.scrollIntoView({behavior: 'smooth'})}
            >
              BOOK YOUR FREE ASSESSMENT
            </MagneticButton>

            <MagneticButton
              type="secondary"
              className="w-full md:w-auto !px-16 !py-6 text-xl"
              onClick={() => document.getElementById('apply')?.scrollIntoView({behavior: 'smooth'})}
            >
              BOOK MEMBER SESSION
            </MagneticButton>
          </div>

          <button
            onClick={() => document.getElementById('weekly-schedule')?.scrollIntoView({behavior: 'smooth'})}
            className="group mt-10 flex items-center space-x-4 text-[10px] uppercase tracking-[0.3em] text-stone-600 hover:text-white transition-all duration-700 mx-auto"
          >
            <span className="border-b border-transparent group-hover:border-orange-600 pb-1">View Weekly Schedule</span>
          </button>
        </div>
      </div>

      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center opacity-40 pointer-events-none">
        <div className="w-px h-28 bg-gradient-to-b from-orange-600 via-orange-500/30 to-transparent"></div>
        <span className="text-[8px] tracking-[1.2em] text-stone-800 uppercase mt-8 ml-3">Start Now</span>
      </div>
    </section>
  );
};

export default Hero;
