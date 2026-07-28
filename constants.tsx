
import { Program, Principle, Stat, Testimonial, PricingTier } from './types';

export const PROGRAMS: Program[] = [
  {
    id: '01',
    title: 'THE SESSION',
    category: '60 Minutes',
    description: 'Athletes join a small group training session led by our coaching staff. 60-minutes of focused work designed to introduce our standards.',
    benefits: ['Small Group Setting', 'Expert Coaching', 'Structured Plan'],
    image: '/images/013A5807-45.jpg'
  },
  {
    id: '02',
    title: 'THE WORK',
    category: 'Skill + Movement',
    description: 'We combine fundamental basketball skill work with athletic movement training. You get a complete picture of how we build total athletes.',
    benefits: ['Skill Development', 'Athletic Movement', 'Clear Feedback'],
    image: '/images/013A5892-56.jpg'
  },
  {
    id: '03',
    title: 'THE ENVIRONMENT',
    category: 'No Pressure',
    description: 'There is no testing day, no pressure, and no tryouts. We coach first and evaluate naturally through training.',
    benefits: ['No Tryouts', 'Natural Evaluation', ' Supportive Environment'],
    image: '/images/013A5924-58.jpg'
  }
];

export const ROADMAP_STEPS = [
  {
    phase: "01",
    title: "THE SESSION",
    description: "Complete your first 60-minute coached session. Experience the environment and the work firsthand.",
    tag: "Day 1"
  },
  {
    phase: "02",
    title: "RECOMMENDATION",
    description: "After training, we’ll recommend the best path forward based on age, level, and goals. No guessing.",
    tag: "Post-Session"
  },
  {
    phase: "03",
    title: "THE PATH",
    description: "Choose the option that makes the most sense. Most athletes train 2–3 times per week to see real results.",
    tag: "Day 2+"
  },
  {
    phase: "04",
    title: "CONSISTENCY",
    description: "Start your routine. No contracts, just commitment to the process.",
    tag: "Ongoing"
  }
];

export const PRINCIPLES: Principle[] = [
  {
    id: 1,
    title: "TOTAL ATHLETE",
    quote: "Foundation first.",
    description: "We don't just coach a shot; we build the athlete. We focus on everything from your physical health to your mental strength."
  },
  {
    id: 2,
    title: "PURE FOCUS",
    quote: "Small wins, big results.",
    description: "Excellence is found in the details. We focus on the small habits that others ignore to give you a massive edge."
  },
  {
    id: 3,
    title: "SMART PLAY",
    quote: "Outthink, outplay.",
    description: "Skills are nothing without the IQ to use them. We train you to deconstruct defense and lead your team."
  }
];

export const STATS: Stat[] = [
  { label: 'Athletes Trained', value: 100, suffix: '+' },
  { label: 'Sessions Coached', value: 1000, suffix: '+' },
  { label: 'Years Experience', value: 20, suffix: '+' }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    name: "Marcus Thorne",
    role: "Professional Guard",
    content: "Legacy is simple but effective. No hype, just work. The focus on mental clarity changed my game in the 4th quarter.",
    avatar: "https://i.pravatar.cc/150?u=marcus"
  },
  {
    id: 2,
    name: "Sarah Jenkins",
    role: "D1 College Commit",
    content: "This program changed my life. It wasn't just about my jump shot—it was about how I move and the discipline I now carry off the court.",
    avatar: "https://i.pravatar.cc/150?u=sarah"
  },
  {
    id: 3,
    name: "Coach David Rossi",
    role: "Player Development",
    content: "Finally, a system that values the details. They cut through the social media noise and focus on what actually wins games.",
    avatar: "https://i.pravatar.cc/150?u=coach"
  }
];

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'drop-in',
    name: 'DROP-IN',
    price: '22.50',
    originalPrice: '45',
    description: 'Limited Time: 50% Off First Session',
    features: [
      '60-Minute Coached Session',
      'Pay Per Visit',
      'No Commitment Required'
    ],
    recommended: false,
    cta: 'Book Session'
  },
  {
    id: '1x-week',
    name: '1X / WEEK',
    price: '179',
    description: '$45/session',
    features: [
      '1 Session Per Week',
      'Billed Monthly'
    ],
    recommended: false,
    cta: 'Subscribe'
  },
  {
    id: '2x-week',
    name: '2X / WEEK',
    price: '259',
    description: '$32/session',
    features: [
      '2 Sessions Per Week',
      'Billed Monthly'
    ],
    recommended: true,
    cta: 'Subscribe'
  },
  {
    id: '3x-week',
    name: '3X / WEEK',
    price: '309',
    description: '$26/session',
    features: [
      '3 Sessions Per Week',
      'Billed Monthly'
    ],
    recommended: false,
    cta: 'Subscribe'
  },
  {
    id: '4x-week',
    name: '4X / WEEK',
    price: '359',
    description: '$22/session',
    features: [
      '4 Sessions Per Week',
      'Billed Monthly'
    ],
    recommended: false,
    cta: 'Subscribe'
  },
  {
    id: 'performance-solo',
    name: 'PERFORMANCE SOLO',
    price: '99',
    description: 'Performance Add-on Only',
    features: [
      'Performance Training',
      'Billed Monthly'
    ],
    recommended: false,
    cta: 'Subscribe'
  },
  {
    id: 'camp-weekly',
    name: 'WEEKLY ACADEMY',
    price: '249',
    description: 'Summer Camp Full Access',
    features: [
      '15 Hours Structured Training',
      'Skill + Movement Combined',
      'Small-Sided Games',
      'Strength & Mobility'
    ],
    recommended: true,
    cta: 'Reserve Spot'
  },
  {
    id: 'camp-early-bird',
    name: 'EARLY BIRD',
    price: '229',
    description: 'Limited Time Offer',
    features: [
      'Full Academy Access',
      'Discounted Rate',
      'Priority Registration'
    ],
    recommended: false,
    cta: 'Reserve Spot'
  },
  {
    id: 'camp-day-pass',
    name: 'CAMP DAY PASS',
    price: '65',
    description: 'Single Day Access',
    features: [
      '3 Hours Training',
      'Single Day Entry',
      'Flexible Schedule'
    ],
    recommended: false,
    cta: 'Book Day'
  }
];
