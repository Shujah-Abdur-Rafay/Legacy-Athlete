
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const History: React.FC = () => {
  const containerRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 75%",
        end: "bottom 25%",
        toggleActions: "play none none reverse"
      }
    });

    tl.fromTo(imageRef.current,
      { scale: 0.9, opacity: 0, filter: 'blur(10px)' },
      { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 1.5, ease: "power2.out" }
    )
    .fromTo(textRef.current,
      { x: 50, opacity: 0 },
      { x: 0, opacity: 1, duration: 1, ease: "power3.out" },
      "-=1"
    );
    
    // Parallax for the quote
    gsap.to(".history-quote", {
      y: -50,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });
  }, []);

  return (
    <section ref={containerRef} className="py-32 px-8 bg-black relative overflow-hidden border-t border-stone-900">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        
        {/* Visual Column */}
        <div ref={imageRef} className="relative order-2 lg:order-1">
          <div className="w-full overflow-hidden rounded-sm relative bg-stone-900 flex items-center justify-center">
            <div className="absolute inset-0 bg-orange-900/20 mix-blend-overlay z-10 pointer-events-none"></div>
            <img 
              src="/images/nai-e1703254164537.jpeg" 
              alt="Vintage Basketball Hoop"
              className="w-full h-auto object-contain grayscale contrast-125 brightness-75 sepia-[0.3]" 
            />
            
            {/* Overlay Date */}
            <div className="absolute top-8 left-8 border border-white/30 px-4 py-2 bg-black/50 backdrop-blur-md z-20">
              <span className="font-athletic text-2xl text-white">1891</span>
            </div>
            
            {/* Naismith Label */}
            <div className="absolute bottom-8 right-8 z-20 text-right">
              <span className="block text-[9px] uppercase tracking-[0.3em] text-stone-400">Springfield, MA</span>
              <span className="font-serif-italic text-xl text-white">Dr. James Naismith</span>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute -top-10 -left-10 w-40 h-40 border-t border-l border-stone-800 hidden lg:block"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 border-b border-r border-stone-800 hidden lg:block"></div>
        </div>

        {/* Text Column */}
        <div ref={textRef} className="order-1 lg:order-2">
          <span className="text-[10px] tracking-[0.4em] text-orange-600 uppercase block mb-6">The Origin Story</span>
          <h2 className="font-athletic text-5xl md:text-7xl text-white mb-8 leading-none">
            MORE THAN <br /> <span className="text-stone-500">A GAME.</span>
          </h2>

          <div className="space-y-8 relative">
            <p className="text-stone-400 text-sm md:text-base leading-relaxed">
              When Dr. James Naismith hung two peach baskets in a Springfield gymnasium in 1891, he wasn't just inventing a winter distraction. He was crafting a vehicle for character.
            </p>
            
            <p className="text-stone-400 text-sm md:text-base leading-relaxed">
              Rooted in the movement of "Muscular Christianity," Naismith believed that physical discipline was inseparable from spiritual growth. The court was designed to be a testing ground—a place where patience, selflessness, and resilience were forged in real-time.
            </p>

            <div className="history-quote border-l-2 border-orange-600 pl-8 py-2 my-10">
              <p className="font-serif-italic text-2xl md:text-3xl text-white leading-tight mb-4">
                "To win the game is great. To play the game is greater. To love the game is greatest of all."
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">— James Naismith</p>
            </div>

            <p className="text-stone-400 text-sm md:text-base leading-relaxed">
              His mission was simple yet profound: to use sport as a ministry. To spread the gospel not just through words, but through action, teamwork, and the pursuit of excellence.
            </p>

            <div className="pt-8 mt-8 border-t border-stone-900">
               <p className="text-xs uppercase tracking-widest text-white mb-2">Our Alignment</p>
               <p className="text-stone-500 text-xs leading-relaxed">
                 We return to these roots. At Legacy, we believe basketball remains one of the most powerful tools for developing the human spirit.
               </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default History;
