
import React, { useState, useRef } from 'react';
import { gsap } from 'gsap';
import MagneticButton from './MagneticButton';

const steps = [
  {
    question: "What is your current level?",
    options: ["Grade School Elite", "High School Elite", "College / Overseas", "Professional", "Coaching Staff"]
  },
  {
    question: "Select your training system(s)",
    options: ["Athletic Performance System", "Basketball Skill System", "Dual System (Performance + Skills)"]
  },
  {
    question: "What is your primary focus?",
    options: ["Technical Mechanics", "Mental Performance", "IQ & Film Study", "Elite Networking"]
  },
  {
    question: "Are you ready for the work?",
    options: ["I'm fully committed", "I'm exploring my options"]
  }
];

const ApplicationForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    school: '',
    trainingDays: '',
    email: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      gsap.to(formRef.current, {
        opacity: 0,
        x: -20,
        duration: 0.3,
        onComplete: () => {
          setCurrentStep(prev => prev + 1);
          gsap.fromTo(formRef.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.3 });
        }
      });
    } else {
      setCurrentStep(steps.length); // Contact info step
    }
  };

  const submitFinal = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="text-center py-20 bg-stone-900/50 border border-stone-800 rounded-lg p-12">
        <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-athletic text-3xl mb-4 text-white">Application Received</h3>
        <p className="text-stone-400 text-sm max-w-sm mx-auto">One of our player development scouts will contact you within 48 hours for an evaluation of your selected system.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-stone-900/40 border border-stone-800 rounded-lg p-8 md:p-12 relative overflow-hidden">
      <div className="mb-12">
        <div className="flex justify-between items-center mb-8">
          <span className="text-[10px] tracking-[0.4em] text-orange-500 uppercase">Step {Math.min(currentStep + 1, 5)} / 5</span>
          <div className="flex space-x-1">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1 w-8 rounded-full transition-colors duration-500 ${i <= currentStep ? 'bg-orange-600' : 'bg-stone-800'}`} />
            ))}
          </div>
        </div>

        <div ref={formRef}>
          {currentStep < steps.length ? (
            <>
              <h3 className="font-athletic text-2xl md:text-4xl text-white mb-8 leading-tight">
                {steps[currentStep].question}
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {steps[currentStep].options.map((option, i) => (
                  <button
                    key={i}
                    onClick={nextStep}
                    className="w-full text-left px-6 py-4 border border-stone-800 bg-stone-950/50 hover:border-orange-500 hover:bg-stone-900 transition-all group"
                  >
                    <span className="text-stone-400 group-hover:text-white transition-colors uppercase tracking-widest text-xs">{option}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={submitFinal} className="space-y-6">
              <h3 className="font-athletic text-2xl md:text-4xl text-white mb-4">Complete Profile</h3>
              <p className="text-stone-400 text-sm mb-8">Enter your details to finalize your player profile for the Mastermind Curriculum.</p>
              
              <div className="space-y-4">
                <input 
                  name="name"
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="FULL NAME"
                  className="w-full bg-stone-950 border border-stone-800 px-6 py-4 text-white focus:outline-none focus:border-orange-500 transition-colors uppercase tracking-widest text-xs"
                />

                <div className="grid grid-cols-2 gap-4">
                  <input 
                    name="age"
                    type="text" 
                    required 
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="AGE"
                    className="w-full bg-stone-950 border border-stone-800 px-6 py-4 text-white focus:outline-none focus:border-orange-500 transition-colors uppercase tracking-widest text-xs"
                  />
                  <input 
                    name="trainingDays"
                    type="text" 
                    required 
                    value={formData.trainingDays}
                    onChange={handleInputChange}
                    placeholder="DAYS TRAINING/WEEK"
                    className="w-full bg-stone-950 border border-stone-800 px-6 py-4 text-white focus:outline-none focus:border-orange-500 transition-colors uppercase tracking-widest text-xs"
                  />
                </div>

                <input 
                  name="school"
                  type="text" 
                  required 
                  value={formData.school}
                  onChange={handleInputChange}
                  placeholder="SCHOOL / TEAM"
                  className="w-full bg-stone-950 border border-stone-800 px-6 py-4 text-white focus:outline-none focus:border-orange-500 transition-colors uppercase tracking-widest text-xs"
                />

                <input 
                  name="email"
                  type="email" 
                  required 
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="EMAIL ADDRESS"
                  className="w-full bg-stone-950 border border-stone-800 px-6 py-4 text-white focus:outline-none focus:border-orange-500 transition-colors uppercase tracking-widest text-xs"
                />
              </div>

              <MagneticButton className="w-full !py-4">
                SUBMIT APPLICATION
              </MagneticButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationForm;
