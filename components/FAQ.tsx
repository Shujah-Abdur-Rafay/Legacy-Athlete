
import React, { useState } from 'react';
import { gsap } from 'gsap';

const FAQItem: React.FC<{ question: string; answer: string; index: number }> = ({ question, answer, index }) => {
  const [isOpen, setIsOpen] = useState(false);
  const answerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      gsap.to(answerRef.current, { height: 'auto', opacity: 1, duration: 0.4, ease: "power2.out" });
    } else {
      gsap.to(answerRef.current, { height: 0, opacity: 0, duration: 0.3, ease: "power2.in" });
    }
  }, [isOpen]);

  return (
    <div className="border-b border-stone-800">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-8 flex justify-between items-center text-left group"
      >
        <span className={`font-athletic text-xl md:text-2xl transition-colors duration-300 ${isOpen ? 'text-orange-500' : 'text-white group-hover:text-stone-300'}`}>
          {question}
        </span>
        <div className={`w-8 h-8 flex items-center justify-center border transition-all duration-300 rounded-full ${isOpen ? 'border-orange-500 rotate-45 bg-orange-500/10' : 'border-stone-700 group-hover:border-white'}`}>
           <span className={`text-xl leading-none mb-0.5 ${isOpen ? 'text-orange-500' : 'text-stone-500 group-hover:text-white'}`}>+</span>
        </div>
      </button>
      <div ref={answerRef} className="h-0 overflow-hidden opacity-0">
        <p className="pb-8 text-stone-400 text-sm md:text-base leading-relaxed max-w-3xl uppercase tracking-wider pl-0 md:pl-4 border-l-2 border-stone-800 ml-1">
          {answer}
        </p>
      </div>
    </div>
  );
};

const FAQ: React.FC = () => {
  const faqs = [
    {
      question: "Is my child good enough to be here?",
      answer: "Yes. We coach beginners through advanced players by scaling instruction—not lowering standards. Every athlete starts with the fundamentals regardless of their current skill level."
    },
    {
      question: "Will my child get real attention in a group?",
      answer: "Yes. These are coached sessions, not open gyms. Teaching and correction are constant. We maintain strict coach-to-player ratios to ensure no one hides in the back of the line."
    },
    {
      question: "Is this just drills?",
      answer: "No. Drills are a tool, not the solution. Learning happens through decisions, repetition, and game-like situations. We focus on transferability—skills that actually work in a game."
    },
    {
      question: "Is there a long-term commitment?",
      answer: "No. Memberships are month-to-month. Families stay because the training works. We believe results should drive retention, not contracts."
    }
  ];

  return (
    <section className="py-32 px-8 bg-black relative">
      <div className="max-w-4xl mx-auto">
        <div className="mb-20 text-center">
          <span className="text-[10px] tracking-[0.4em] text-orange-500 uppercase block mb-4">Transparency</span>
          <h2 className="font-athletic text-4xl md:text-6xl text-white">WHAT PARENTS <br /><span className="text-stone-500">USUALLY ASK</span></h2>
        </div>
        
        <div className="border-t border-stone-800">
          {faqs.map((faq, i) => (
            <FAQItem key={i} index={i} {...faq} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
