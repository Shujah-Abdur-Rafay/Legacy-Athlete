
import React, { useState, useEffect } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const Countdown: React.FC = () => {
  const calculateTimeLeft = () => {
    // Set target date to approximately 14 days from now for demonstration
    // In production, this would be a specific launch date
    const targetDate = new Date('2025-09-01T00:00:00'); 
    const now = new Date();
    const difference = targetDate.getTime() - now.getTime();

    let timeLeft: TimeLeft = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0
    };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const TimerUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center px-4 md:px-8 border-x border-stone-800/50">
      <span className="font-athletic text-3xl md:text-5xl text-white">
        {value.toString().padStart(2, '0')}
      </span>
      <span className="text-[8px] md:text-[10px] tracking-[0.3em] text-orange-600 uppercase mt-2">
        {label}
      </span>
    </div>
  );

  return (
    <div className="mt-12 mb-8 flex items-center justify-center space-x-0 bg-stone-900/20 backdrop-blur-sm border border-stone-800/50 rounded-lg py-6 px-4 max-w-2xl mx-auto">
      <TimerUnit value={timeLeft.days} label="Days" />
      <TimerUnit value={timeLeft.hours} label="Hours" />
      <TimerUnit value={timeLeft.minutes} label="Mins" />
      <TimerUnit value={timeLeft.seconds} label="Secs" />
      <div className="hidden md:flex flex-col items-start ml-8 pl-8 border-l border-stone-800">
        <span className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">Next Intake</span>
        <span className="text-[10px] tracking-[0.1em] text-white uppercase font-semibold">Sept 01, 2025</span>
      </div>
    </div>
  );
};

export default Countdown;
