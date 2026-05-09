
import React from 'react';

interface FooterProps {
  onPortalClick?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onPortalClick }) => {
  return (
    <footer className="bg-black py-24 px-8 md:px-16 border-t border-stone-900">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="mb-12 md:mb-0">
          <div className="flex items-center space-x-2 mb-4">
            <span className="font-athletic text-2xl tracking-tighter">LEGACY</span>
            <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-1"></div>
          </div>
          <p className="text-stone-600 text-[10px] uppercase tracking-[0.2em] max-w-xs">
            The private development system for high-performance athletes committed to mastery.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
          <div>
            <h4 className="text-[10px] tracking-[0.3em] uppercase text-stone-300 mb-6">Explore</h4>
            <ul className="space-y-4">
              {['Session', 'About', 'Legacy', 'Contact'].map(item => (
                <li key={item}>
                  <a href="#" className="text-stone-500 hover:text-white text-[10px] uppercase tracking-[0.2em] transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] tracking-[0.3em] uppercase text-stone-300 mb-6">Portal</h4>
            <ul className="space-y-4">
              <li>
                <button onClick={onPortalClick} className="text-stone-500 hover:text-white text-[10px] uppercase tracking-[0.2em] transition-colors">Login</button>
              </li>
              <li>
                <button className="text-stone-500 hover:text-white text-[10px] uppercase tracking-[0.2em] transition-colors">Support</button>
              </li>
              <li>
                <button className="text-stone-500 hover:text-white text-[10px] uppercase tracking-[0.2em] transition-colors">Curriculum</button>
              </li>
            </ul>
          </div>
          <div className="hidden md:block">
            <h4 className="text-[10px] tracking-[0.3em] uppercase text-stone-300 mb-6">Social</h4>
            <ul className="space-y-4">
              {['Instagram', 'YouTube', 'Journal'].map(item => (
                <li key={item}>
                  <a href="#" className="text-stone-500 hover:text-white text-[10px] uppercase tracking-[0.2em] transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-stone-900 flex justify-between items-center text-stone-700 text-[9px] uppercase tracking-[0.3em]">
        <div>© 2025 Legacy Athlete Inc.</div>
        <div className="space-x-8">
          <a href="#" className="hover:text-stone-400">Privacy</a>
          <a href="#" className="hover:text-stone-400">Terms</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
