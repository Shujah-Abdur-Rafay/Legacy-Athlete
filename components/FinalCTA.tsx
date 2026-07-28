import React from 'react';
import MagneticButton from './MagneticButton';

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

const FinalCTA: React.FC = () => {
  return (
    <section className="py-32 px-8 bg-black relative border-t border-stone-900 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(234,88,12,0.06)_0%,transparent_60%)] pointer-events-none" />
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="font-athletic text-6xl md:text-9xl text-white mb-12 leading-none">
          LEAVE YOUR <span className="text-orange-600">MARK.</span>
        </h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          <MagneticButton
            className="w-full md:w-auto !px-14 !py-5 text-base"
            onClick={() => scrollTo('assessment')}
          >
            BOOK FREE ATHLETE ASSESSMENT
          </MagneticButton>
          <MagneticButton
            type="secondary"
            className="w-full md:w-auto !px-14 !py-5 text-base"
            onClick={() => scrollTo('apply')}
          >
            BOOK MEMBER SESSION
          </MagneticButton>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
