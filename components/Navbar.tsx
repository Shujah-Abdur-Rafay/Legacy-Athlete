
import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onPortalClick: () => void;
  onLoginClick: () => void;
  isLoggedIn?: boolean;
  onConsoleClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onPortalClick, onLoginClick, isLoggedIn, onConsoleClick }) => {
  const navRef = useRef<HTMLElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    gsap.fromTo(navRef.current, 
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, ease: "power3.out", delay: 1 }
    );
  }, []);

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setIsOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navItems = ['Summer Camp', 'Weekly Schedule', 'Session', 'Process', 'Pricing'];

  return (
    <>
      <nav 
        ref={navRef}
        className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 md:px-16 py-8 backdrop-blur-sm bg-black/10"
      >
        <div className="flex items-center space-x-2">
          <span className="font-athletic text-2xl tracking-tighter cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>LEGACY</span>
          <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-1"></div>
        </div>
        
        <div className="hidden md:flex space-x-12">
          {navItems.map((item) => (
            <a 
              key={item} 
              href={`#${item.toLowerCase().replace(' ', '-')}`}
              onClick={(e) => handleScroll(e, item.toLowerCase().replace(' ', '-'))}
              className="text-[10px] uppercase tracking-[0.3em] text-stone-400 hover:text-white transition-colors duration-300"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          {isLoggedIn ? (
            <button
              onClick={onConsoleClick}
              className="hidden sm:block text-[10px] uppercase tracking-[0.3em] font-medium text-orange-500 hover:text-orange-400 transition-all duration-300 px-4 py-2"
            >
              Console
            </button>
          ) : (
            <button
              onClick={onLoginClick}
              className="hidden sm:block text-[10px] uppercase tracking-[0.3em] font-medium text-stone-400 hover:text-white transition-all duration-300 px-4 py-2"
            >
              Login
            </button>
          )}
          <button
            onClick={() => document.getElementById('apply')?.scrollIntoView({behavior: 'smooth'})}
            className="hidden sm:block text-[10px] uppercase tracking-[0.3em] font-medium border border-stone-800 px-6 py-2 rounded-full hover:border-orange-600 hover:text-orange-500 transition-all duration-300"
          >
            Book a Session
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-stone-400 hover:text-white transition-colors"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div 
        className={`fixed inset-0 z-40 bg-black/95 backdrop-blur-xl transition-all duration-500 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col items-center justify-center h-full space-y-12">
          {navItems.map((item) => (
            <a 
              key={item} 
              href={`#${item.toLowerCase().replace(' ', '-')}`}
              onClick={(e) => handleScroll(e, item.toLowerCase().replace(' ', '-'))}
              className="text-xl uppercase tracking-[0.4em] text-stone-400 hover:text-white transition-colors duration-300 font-athletic"
            >
              {item}
            </a>
          ))}
          {isLoggedIn ? (
            <button
              onClick={() => { setIsOpen(false); onConsoleClick?.(); }}
              className="text-[10px] uppercase tracking-[0.3em] font-medium text-orange-500 hover:text-orange-400 transition-colors"
            >
              Console
            </button>
          ) : (
            <button
              onClick={() => { setIsOpen(false); onLoginClick(); }}
              className="text-[10px] uppercase tracking-[0.3em] font-medium text-stone-400 hover:text-white transition-colors"
            >
              Login
            </button>
          )}
          <button
            onClick={() => {
              setIsOpen(false);
              document.getElementById('apply')?.scrollIntoView({behavior: 'smooth'});
            }}
            className="text-[10px] uppercase tracking-[0.3em] font-medium border border-orange-600 text-orange-500 px-10 py-4 rounded-full"
          >
            Book a Session
          </button>
        </div>
      </div>
    </>
  );
};

export default Navbar;
