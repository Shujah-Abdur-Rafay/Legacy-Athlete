
import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PRICING_TIERS } from '../constants';
import { PricingTier } from '../types';
import MagneticButton from './MagneticButton';

interface PricingProps {
  onSelectPlan: (planId: string) => void;
}

interface AddonConfig {
  memberMonthly: number;
  nonMemberMonthly: number;
  singleSession: number;
}

const DEFAULT_ADDON: AddonConfig = { memberMonthly: 79, nonMemberMonthly: 99, singleSession: 35 };

const Pricing: React.FC<PricingProps> = ({ onSelectPlan }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [tiers, setTiers] = useState<PricingTier[]>(PRICING_TIERS);
  const [addon, setAddon] = useState<AddonConfig>(DEFAULT_ADDON);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'packages'), (snap) => {
      const list: (PricingTier & { order: number; active: boolean; hidden?: boolean })[] = [];
      snap.docs.forEach((d) => {
        const data: any = d.data();
        if (d.id === 'performance-addon-config') {
          setAddon({
            memberMonthly: data.memberMonthly ?? DEFAULT_ADDON.memberMonthly,
            nonMemberMonthly: data.nonMemberMonthly ?? DEFAULT_ADDON.nonMemberMonthly,
            singleSession: data.singleSession ?? DEFAULT_ADDON.singleSession,
          });
          return;
        }
        if (data.hidden || data.active === false) return;
        list.push({
          id: d.id,
          name: data.name || '',
          price: data.price || '',
          originalPrice: data.originalPrice,
          description: data.description || '',
          features: Array.isArray(data.features) ? data.features : [],
          recommended: !!data.recommended,
          cta: data.cta || 'Subscribe',
          order: typeof data.order === 'number' ? data.order : 999,
          active: true,
        });
      });
      if (list.length) {
        list.sort((a, b) => a.order - b.order);
        setTiers(list);
      }
    }, (err) => {
      console.warn('[Pricing] Firestore listener failed, using defaults:', err);
    });
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

    const cards = containerRef.current?.querySelectorAll('.pricing-card');
    if (!cards || cards.length === 0) return;

    gsap.fromTo(cards, 
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.2,
        duration: 1.2,
        ease: "power4.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        }
      }
    );
  }, [tiers]);

  const handleSelectPlan = (planId: string) => {
    onSelectPlan(planId);
    document.getElementById('payment')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="pricing" className="py-32 px-8 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <span className="text-[10px] tracking-[0.4em] text-orange-500 uppercase block mb-4">Invest In Yourself</span>
          <h2 ref={titleRef} className="font-athletic text-5xl md:text-8xl text-white mb-8">CHOOSE YOUR <span className="text-stone-500">PATH</span></h2>
          <p className="text-stone-500 text-sm md:text-base max-w-xl mx-auto uppercase tracking-widest leading-relaxed">
            Start with a single session, commit to a cohort, or go all-in for the year.
          </p>
        </div>

        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start max-w-6xl mx-auto">
          {tiers.map((tier) => (
            <div 
              key={tier.id}
              className={`pricing-card relative flex flex-col p-10 bg-stone-900/30 border ${tier.recommended ? 'border-orange-600 shadow-[0_0_40px_-15px_rgba(234,88,12,0.3)] bg-stone-900/50' : 'border-stone-800'} transition-all duration-500 group hover:bg-stone-900/60 h-full`}
            >
              {tier.recommended && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-600 text-[9px] text-white font-bold tracking-[0.3em] uppercase px-4 py-1 rounded-full shadow-lg">
                  Most Popular
                </div>
              )}
              
              <div className="mb-10 text-center">
                <h3 className="font-athletic text-3xl text-white mb-2">{tier.name}</h3>
                <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-6 h-8 leading-tight flex items-center justify-center">
                  {tier.description}
                </p>
                <div className="flex items-baseline justify-center">
                  <span className="text-stone-500 text-lg mr-1">$</span>
                  <span className={`font-athletic text-6xl ${tier.recommended ? 'text-orange-500' : 'text-white'} transition-colors duration-300`}>{tier.price}</span>
                  {tier.originalPrice && (
                    <span className="text-stone-500 text-2xl line-through ml-3">${tier.originalPrice}</span>
                  )}
                </div>
                {tier.id === 'drop-in' && <span className="text-[9px] text-stone-600 uppercase tracking-widest mt-2 block">Per Session</span>}
                {tier.id !== 'drop-in' && <span className="text-[9px] text-stone-600 uppercase tracking-widest mt-2 block">Per Month</span>}
              </div>

              <div className="flex-grow mb-12">
                <ul className="space-y-4">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start group/item">
                      <svg className={`w-3 h-3 mt-0.5 mr-3 flex-shrink-0 ${tier.recommended ? 'text-orange-600' : 'text-stone-600 group-hover/item:text-orange-600 transition-colors'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[11px] text-stone-400 uppercase tracking-wider group-hover/item:text-white transition-colors text-left">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <MagneticButton 
                onClick={() => handleSelectPlan(tier.id)}
                type={tier.recommended ? 'primary' : 'secondary'}
                className="w-full"
              >
                {tier.cta}
              </MagneticButton>
            </div>
          ))}
        </div>

        <div className="mt-24 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-stone-900/30 border border-stone-800 p-8">
            <h4 className="font-athletic text-2xl text-white mb-6 border-b border-stone-800 pb-4">PERFORMANCE ADD-ON</h4>
            <ul className="space-y-4">
              <li className="flex justify-between items-center">
                <span className="text-xs text-stone-400 uppercase tracking-widest">Members</span>
                <span className="font-athletic text-2xl text-white">${addon.memberMonthly}<span className="text-sm text-stone-500">/mo</span></span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-xs text-stone-400 uppercase tracking-widest">Non-Members</span>
                <span className="font-athletic text-2xl text-white">${addon.nonMemberMonthly}<span className="text-sm text-stone-500">/mo</span></span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-xs text-stone-400 uppercase tracking-widest">Single Session</span>
                <span className="font-athletic text-2xl text-white">${addon.singleSession}</span>
              </li>
            </ul>
          </div>

          <div className="space-y-8">
            <div className="bg-stone-900/30 border border-stone-800 p-8">
              <h4 className="font-athletic text-2xl text-white mb-6 border-b border-stone-800 pb-4">SIBLING OPTIONS</h4>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mr-3 mt-1.5 flex-shrink-0"></div>
                  <span className="text-xs text-stone-400 uppercase tracking-widest leading-relaxed">10% Off Additional Siblings</span>
                </li>
                <li className="flex items-start">
                  <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mr-3 mt-1.5 flex-shrink-0"></div>
                  <span className="text-xs text-stone-400 uppercase tracking-widest leading-relaxed">Shared Packages Allowed <br/><span className="text-[9px] text-stone-500">(Each visit counts per sibling)</span></span>
                </li>
              </ul>
            </div>

            <div className="bg-stone-900/30 border border-stone-800 p-8">
              <h4 className="font-athletic text-2xl text-white mb-6 border-b border-stone-800 pb-4">PROGRAM PERKS</h4>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mr-3 mt-1.5 flex-shrink-0"></div>
                  <span className="text-xs text-stone-400 uppercase tracking-widest leading-relaxed">8-Week Bundle: 10% Off <span className="text-[9px] text-stone-500">(paid in full)</span></span>
                </li>
                <li className="flex items-start">
                  <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mr-3 mt-1.5 flex-shrink-0"></div>
                  <span className="text-xs text-stone-400 uppercase tracking-widest leading-relaxed">Affiliate Program: Earn 10% Recurring Commission on Memberships</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
