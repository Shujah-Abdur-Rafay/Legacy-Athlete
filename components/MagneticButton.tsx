
import React, { useRef, useEffect } from 'react';
// Import gsap to resolve 'Cannot find name' errors
import { gsap } from 'gsap';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  type?: 'primary' | 'secondary';
}

const MagneticButton: React.FC<MagneticButtonProps> = ({ 
  children, 
  className = '', 
  onClick,
  type = 'primary'
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  useEffect(() => {
    const btn = buttonRef.current;
    if (!btn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { left, top, width, height } = btn.getBoundingClientRect();
      const x = clientX - (left + width / 2);
      const y = clientY - (top + height / 2);
      
      // Refined magnetic effect: smoother and more subtle
      gsap.to(btn, {
        x: x * 0.15,
        y: y * 0.15,
        duration: 0.5,
        ease: "power3.out"
      });
    };

    const handleMouseLeave = () => {
      gsap.to(btn, {
        x: 0,
        y: 0,
        duration: 1,
        ease: "elastic.out(1, 0.4)"
      });
    };

    btn.addEventListener('mousemove', handleMouseMove);
    btn.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      btn.removeEventListener('mousemove', handleMouseMove);
      btn.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const baseStyles = "relative px-8 py-3 font-athletic text-sm transition-all duration-500 overflow-hidden";
  const typeStyles = type === 'primary' 
    ? "bg-stone-100 text-black border border-stone-100 hover:bg-transparent hover:text-white"
    : "bg-transparent text-white border border-stone-700 hover:border-white";

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      className={`${baseStyles} ${typeStyles} ${className}`}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
};

export default MagneticButton;
