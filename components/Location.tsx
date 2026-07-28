import React from 'react';
import { MapPin, DoorOpen, Car } from 'lucide-react';

const Location: React.FC = () => {
  return (
    <section className="py-32 px-8 bg-black relative border-t border-stone-900">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <span className="text-xs tracking-[0.4em] text-orange-500 uppercase mb-4 block">Location</span>
          <h2 className="section-title font-athletic text-5xl md:text-7xl mb-8 leading-tight text-white">
            WHERE WE <br />
            <span className="text-stone-500">TRAIN.</span>
          </h2>
          
          <div className="space-y-8 mt-12">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-full border border-stone-800 flex items-center justify-center shrink-0 bg-stone-900/50">
                <MapPin className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="text-white font-athletic text-xl mb-2 tracking-wider">THE LEGACY BUILDING</h3>
                <p className="text-stone-400 text-sm md:text-base leading-relaxed uppercase tracking-widest">
                  1338 W. Cermak<br />
                  Chicago, IL 60626
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-full border border-stone-800 flex items-center justify-center shrink-0 bg-stone-900/50">
                <DoorOpen className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="text-white font-athletic text-xl mb-2 tracking-wider">ENTRANCE</h3>
                <p className="text-stone-400 text-sm md:text-base leading-relaxed uppercase tracking-widest">
                  Located in the lot, inside the black door facing the street.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-full border border-stone-800 flex items-center justify-center shrink-0 bg-stone-900/50">
                <Car className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="text-white font-athletic text-xl mb-2 tracking-wider">PARKING</h3>
                <p className="text-stone-400 text-sm md:text-base leading-relaxed uppercase tracking-widest">
                  Due to high traffic, the lot is for pick-up and drop-off only. Street parking is available on Loomis Ave and 21st Street.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative aspect-square lg:aspect-[4/3] overflow-hidden rounded-lg group border border-stone-900">
          <img 
            src="/images/013A5924-58.jpg" 
            className="w-full h-full object-cover grayscale opacity-50 group-hover:scale-105 transition-transform duration-1000" 
            alt="Legacy Training Facility"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <div className="bg-black/80 backdrop-blur-sm border border-stone-800 p-6 rounded-lg">
              <p className="text-white font-athletic text-2xl mb-1">LEGACY</p>
              <p className="text-stone-400 text-xs uppercase tracking-widest">Training Facility</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Location;
